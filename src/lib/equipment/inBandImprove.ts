/**
 * In-band improvement: raise power/spin/control/comfort using the same
 * tension, gauge, and lead-tape equations as setup synthesis — and reject
 * any lever that would push a currently healthy score out of its band.
 */

import type { LeadTapePiece, RacketProfile, StringProfile } from "@/types/equipment";
import type { MySetup } from "@/store/gearStore";
import { tensionOutcome } from "@/lib/equipment/strings";
import { computeLeadTapeEffect, createLeadTapePiece } from "@/lib/equipment/leadTape";
import {
  computeFlightMetrics,
  scoreDeltasFromTape,
  stringLaunchOffsets,
  type FlightMetrics,
  type ScorePieceDeltas,
} from "@/lib/equipment/moldPhysics";

export type ScoreKey = "power" | "spin" | "control" | "comfort";

export type Band = { low: number; high: number };

export type HealthyBands = Record<ScoreKey, Band>;

/** Same role → band mapping used by tune-tip verdicts. */
export function healthyBandsFor(role: string): HealthyBands {
  const r = role.toLowerCase();
  const wantsSpin = /spin|shape|rpms|baseliner/.test(r);
  const wantsControl = /precision|control|counter|volley/.test(r);
  const wantsPower = /power|first-strike|forgiving/.test(r);
  return {
    spin: { low: wantsSpin ? 70 : 55, high: wantsSpin ? 92 : 82 },
    control: { low: wantsControl ? 70 : 55, high: wantsControl ? 90 : 82 },
    power: { low: wantsPower ? 68 : 52, high: wantsPower ? 90 : 80 },
    comfort: { low: 48, high: 88 },
  };
}

/** Frame/string blend weights from synthesizeCombinedSetup. */
const BED_WEIGHT: Record<ScoreKey, number> = {
  power: 0.45,
  spin: 0.5,
  control: 0.45,
  comfort: 0.55,
};

/** Fly-risk ceiling that still plants; matches “don’t sail” coaching. */
export const FLY_RISK_CAP = 68;
export const DEPTH_FLOOR = 45;

export type ScoreBag = Record<ScoreKey, number | null>;

export type LeverFamily =
  | "tension"
  | "gauge"
  | "tape-12"
  | "tape-39"
  | "tape-handle"
  | "tape-throat";

export type InBandLever = {
  id: string;
  family: LeverFamily;
  target: ScoreKey;
  action: string;
  /** Player-facing mechanism (why this placement / bed change). */
  why: string;
  science: string;
  /** Predicted molded scores after this single lever */
  predicted: ScoreBag;
  predictedFlyRisk: number | null;
  predictedDepth: number | null;
  deltas: ScorePieceDeltas;
  dLaunch: number;
  dPath: number;
  dSw: number;
  /** Points of target still available to the top of the band after this lever */
  headroomAfter: number;
};

export type ScoreHeadroom = {
  key: ScoreKey;
  current: number | null;
  band: Band;
  verdict: "low" | "ok" | "high" | "unknown";
  /** Points you can still add before exiting the high edge (0 if already at/over). */
  headroomUp: number;
  /** Points you can still drop before exiting the low edge. */
  headroomDown: number;
  levers: InBandLever[];
  holdNote: string | null;
};

export type InBandPlan = {
  bands: HealthyBands;
  flyRiskCap: number;
  currentFlyRisk: number | null;
  currentDepth: number | null;
  currentLaunch: number | null;
  currentPath: number | null;
  scores: ScoreHeadroom[];
  anyLegal: boolean;
};

const KEYS: ScoreKey[] = ["power", "spin", "control", "comfort"];

function clampScore(n: number): number {
  return Math.max(5, Math.min(98, Math.round(n)));
}

function verdictFor(score: number | null, band: Band): ScoreHeadroom["verdict"] {
  if (score == null) return "unknown";
  if (score < band.low) return "low";
  if (score > band.high) return "high";
  return "ok";
}

function tapeDeltaFromPieces(
  racket: Pick<
    RacketProfile,
    "weightG" | "swingweight" | "balanceMm" | "idealLaunchAngleDeg" | "idealSwingPathDeg"
  >,
  current: LeadTapePiece[],
  extra: LeadTapePiece[],
): { scores: ScorePieceDeltas; dLaunch: number; dPath: number; dSw: number } {
  const a = computeLeadTapeEffect(racket, current);
  const b = computeLeadTapeEffect(racket, [...current, ...extra]);
  const zsA = a.zoneSummary;
  const zsB = b.zoneSummary;
  const tip = (z: typeof zsA) => (z.tip ?? 0) + (z.twelve ?? 0);
  const side = (z: typeof zsA) => (z.three ?? 0) + (z.nine ?? 0);
  const sa = scoreDeltasFromTape({
    tipG: tip(zsA),
    handleG: zsA.handle ?? 0,
    sideG: side(zsA),
    throatG: zsA.throat ?? 0,
    deltaSw: a.deltaSwingweight,
    deltaPath: a.deltaSwingPathDeg,
  });
  const sb = scoreDeltasFromTape({
    tipG: tip(zsB),
    handleG: zsB.handle ?? 0,
    sideG: side(zsB),
    throatG: zsB.throat ?? 0,
    deltaSw: b.deltaSwingweight,
    deltaPath: b.deltaSwingPathDeg,
  });
  return {
    scores: {
      power: sb.power - sa.power,
      spin: sb.spin - sa.spin,
      control: sb.control - sa.control,
      comfort: sb.comfort - sa.comfort,
    },
    dLaunch: b.deltaLaunchDeg - a.deltaLaunchDeg,
    dPath: b.deltaSwingPathDeg - a.deltaSwingPathDeg,
    dSw: b.deltaSwingweight - a.deltaSwingweight,
  };
}

function applyDelta(current: ScoreBag, d: ScorePieceDeltas): ScoreBag {
  const next: ScoreBag = { power: null, spin: null, control: null, comfort: null };
  for (const k of KEYS) {
    const c = current[k];
    next[k] = c == null ? null : clampScore(c + d[k]);
  }
  return next;
}

function staysInBand(current: ScoreBag, next: ScoreBag, bands: HealthyBands): boolean {
  for (const k of KEYS) {
    const c = current[k];
    const n = next[k];
    if (c == null || n == null) continue;
    const { low, high } = bands[k];
    const inNow = c >= low && c <= high;
    if (inNow && (n < low || n > high)) return false;
    if (c > high && n > c) return false;
    if (c < low && n > high) return false;
  }
  return true;
}

function flightAfter(input: {
  current: FlightMetrics | null;
  scores: ScoreBag;
  dLaunch: number;
  dPath: number;
  dSw: number;
  tipG: number;
  handleG: number;
  sideG: number;
  currentSw: number | null;
}): { flyRisk: number | null; depth: number | null } {
  if (!input.current) return { flyRisk: null, depth: null };
  const flight = computeFlightMetrics({
    launchDeg: input.current.launchDeg + input.dLaunch,
    pathDeg: input.current.pathDeg + input.dPath,
    power: input.scores.power,
    spin: input.scores.spin,
    control: input.scores.control,
    swingweight: (input.currentSw ?? 315) + input.dSw,
    tipG: input.tipG,
    handleG: input.handleG,
    sideG: input.sideG,
  });
  return { flyRisk: flight.flyRisk, depth: flight.depth };
}

function flightGuard(
  current: FlightMetrics | null,
  nextFly: number | null,
  nextDepth: number | null,
): boolean {
  if (!current) return true;
  if (nextFly != null && current.flyRisk <= FLY_RISK_CAP && nextFly > FLY_RISK_CAP) return false;
  if (nextDepth != null && current.depth >= DEPTH_FLOOR && nextDepth < DEPTH_FLOOR) return false;
  return true;
}

type Candidate = {
  id: string;
  family: LeverFamily;
  action: string;
  why: string;
  science: string;
  delta: ScorePieceDeltas;
  dLaunch: number;
  dPath: number;
  dSw: number;
  tipG: number;
  handleG: number;
  sideG: number;
};

/** Smallest visible dose first; then least collateral; then less SW for the same job. */
function rankInFamily(a: InBandLever, b: InBandLever, key: ScoreKey, current: number): number {
  const vis = (l: InBandLever) => ((l.predicted[key] ?? 0) - current) >= 1;
  const va = vis(a);
  const vb = vis(b);
  if (va !== vb) return va ? -1 : 1;
  const collat = (d: ScorePieceDeltas) =>
    KEYS.reduce((s, k) => s + (k === key ? 0 : Math.max(0, -d[k])), 0);
  const ca = collat(a.deltas);
  const cb = collat(b.deltas);
  if (ca !== cb) return ca - cb;
  if (a.dSw !== b.dSw) return a.dSw - b.dSw;
  return (b.predicted[key] ?? 0) - (a.predicted[key] ?? 0);
}

function tourEfficiency(l: InBandLever, key: ScoreKey, current: number): number {
  const gain = (l.predicted[key] ?? 0) - current;
  let lost = 0;
  let extra = 0;
  for (const k of KEYS) {
    if (k === key) continue;
    const d = l.deltas[k];
    if (d < -0.2) lost += -d;
    else if (d > 0.2) extra += d;
  }
  return gain * 1.35 - lost * 0.55 + extra * 0.12 - Math.max(0, l.dSw) * 0.1;
}

/**
 * One mechanism per family so 12/tip cannot crowd out 3/9, handle, throat, or the bed.
 * High-level customizing is choosing a *channel* (SW vs twistweight vs recoil vs COR), not stacking bumper lead.
 */
function selectDiverseLevers(legal: InBandLever[], key: ScoreKey, current: number): InBandLever[] {
  const byFamily = new Map<LeverFamily, InBandLever[]>();
  for (const l of legal) {
    const list = byFamily.get(l.family) ?? [];
    list.push(l);
    byFamily.set(l.family, list);
  }
  const best: InBandLever[] = [];
  for (const [, list] of byFamily) {
    list.sort((a, b) => rankInFamily(a, b, key, current));
    const top = list[0];
    if (top) best.push(top);
  }
  const preferred: LeverFamily[] =
    key === "control" || key === "comfort"
      ? ["tape-39", "tape-handle", "tension", "gauge", "tape-throat", "tape-12"]
      : key === "spin"
        ? ["gauge", "tension", "tape-39", "tape-12", "tape-handle", "tape-throat"]
        : ["tape-12", "tape-39", "tension", "gauge", "tape-throat", "tape-handle"];
  best.sort((a, b) => {
    const pa = preferred.indexOf(a.family);
    const pb = preferred.indexOf(b.family);
    const ia = pa === -1 ? 99 : pa;
    const ib = pb === -1 ? 99 : pb;
    if (ia !== ib) return ia - ib;
    return tourEfficiency(b, key, current) - tourEfficiency(a, key, current);
  });
  return best.slice(0, 4);
}

export function buildInBandPlan(input: {
  scores: ScoreBag;
  role: string;
  string?: StringProfile | null;
  tensionLbs?: number | null;
  gaugeMm?: number | null;
  setup: MySetup;
  racket?: RacketProfile | null;
  flight: FlightMetrics | null;
  currentSw?: number | null;
  currentTipG?: number;
  currentHandleG?: number;
  currentSideG?: number;
  armFriendly?: boolean;
}): InBandPlan {
  const bands = healthyBandsFor(input.role);
  const candidates = collectCandidates(input);

  const scores: ScoreHeadroom[] = KEYS.map((key) => {
    const current = input.scores[key];
    const band = bands[key];
    const v = verdictFor(current, band);
    const headroomUp = current == null ? 0 : Math.max(0, band.high - current);
    const headroomDown = current == null ? 0 : Math.max(0, current - band.low);

    let holdNote: string | null = null;
    if (current == null) {
      holdNote = "Need a frame (and ideally a string) before this score is modeled.";
    } else if (v === "high") {
      holdNote = `Already above the healthy band (${band.low}–${band.high}). Do not raise — hold or take a lowering lever in History.`;
    } else if (headroomUp === 0) {
      holdNote = `At the top of the healthy band (${band.low}–${band.high}). Raising further would leave the band.`;
    }

    const legal: InBandLever[] = [];
    if (current != null && v !== "high" && headroomUp > 0) {
      for (const c of candidates) {
        if (c.delta[key] < 0.1) continue;
        const predicted = applyDelta(input.scores, c.delta);
        if (!staysInBand(input.scores, predicted, bands)) continue;
        const predTarget = predicted[key];
        if (predTarget == null || predTarget > band.high) continue;
        if (input.armFriendly && predicted.comfort != null && input.scores.comfort != null) {
          if (predicted.comfort < input.scores.comfort) continue;
        }
        const fl = flightAfter({
          current: input.flight,
          scores: predicted,
          dLaunch: c.dLaunch,
          dPath: c.dPath,
          dSw: c.dSw,
          tipG: (input.currentTipG ?? 0) + c.tipG,
          handleG: (input.currentHandleG ?? 0) + c.handleG,
          sideG: (input.currentSideG ?? 0) + c.sideG,
          currentSw: input.currentSw ?? null,
        });
        if (!flightGuard(input.flight, fl.flyRisk, fl.depth)) continue;
        legal.push({
          id: `${key}-${c.id}`,
          family: c.family,
          target: key,
          action: c.action,
          why: c.why,
          science: c.science,
          predicted,
          predictedFlyRisk: fl.flyRisk,
          predictedDepth: fl.depth,
          deltas: c.delta,
          dLaunch: c.dLaunch,
          dPath: c.dPath,
          dSw: c.dSw,
          headroomAfter: Math.max(0, band.high - (predTarget ?? band.high)),
        });
      }
    }

    return {
      key,
      current,
      band,
      verdict: v,
      headroomUp,
      headroomDown,
      levers: current != null ? selectDiverseLevers(legal, key, current) : [],
      holdNote,
    };
  });

  return {
    bands,
    flyRiskCap: FLY_RISK_CAP,
    currentFlyRisk: input.flight?.flyRisk ?? null,
    currentDepth: input.flight?.depth ?? null,
    currentLaunch: input.flight?.launchDeg ?? null,
    currentPath: input.flight?.pathDeg ?? null,
    scores,
    anyLegal: scores.some((s) => s.levers.length > 0),
  };
}

function collectCandidates(input: {
  string?: StringProfile | null;
  tensionLbs?: number | null;
  gaugeMm?: number | null;
  setup: MySetup;
  racket?: RacketProfile | null;
}): Candidate[] {
  const out: Candidate[] = [];
  const str = input.string ?? null;
  const t = input.tensionLbs ?? str?.recommendedTensionLbs ?? null;
  const g = input.gaugeMm ?? str?.gaugesMm[0] ?? null;

  if (str && t != null) {
    const [lo, hi] = str.tensionRangeLbs;
    const span = Math.max(4, (hi - lo) / 2);
    const oldBed = tensionOutcome(str, t, g ?? undefined);
    const oldOff = stringLaunchOffsets(str, t, g ?? undefined);

    const tryTension = (nextT: number, label: string) => {
      if (nextT < lo || nextT > hi) return;
      const bed = tensionOutcome(str, nextT, g ?? undefined);
      const off = stringLaunchOffsets(str, nextT, g ?? undefined);
      out.push({
        id: `tension-${nextT}`,
        family: "tension",
        action: label,
        why:
          nextT < t
            ? "Stringbed COR and dwell rise as tension drops (Cross & Lindsey / TWU). Launch goes up; the connected hit cue softens."
            : "Higher tension shortens dwell and flattens take-off — more connected, less trampoline.",
        science: `Catalog bed: power −14×Δ, control +16×Δ, spin −6×Δ, comfort −18×Δ per half-range (Δ = (lbs − rec) / ${span.toFixed(1)}). Molded scores blend the bed at ${BED_WEIGHT.power}/${BED_WEIGHT.spin}/${BED_WEIGHT.control}/${BED_WEIGHT.comfort} vs the frame.`,
        delta: {
          power: BED_WEIGHT.power * (bed.power - oldBed.power),
          spin: BED_WEIGHT.spin * (bed.spin - oldBed.spin),
          control: BED_WEIGHT.control * (bed.control - oldBed.control),
          comfort: BED_WEIGHT.comfort * (bed.comfort - oldBed.comfort),
        },
        dLaunch: off.launch - oldOff.launch,
        dPath: off.path - oldOff.path,
        dSw: 0,
        tipG: 0,
        handleG: 0,
        sideG: 0,
      });
    };
    tryTension(t - 2, `Drop tension 2 lbs → ${t - 2} lbs (one bed only)`);
    tryTension(t + 2, `Raise tension 2 lbs → ${t + 2} lbs (one bed only)`);

    if (g != null) {
      const gauges = str.gaugesMm;
      const thinner = [...gauges].filter((x) => x < g - 0.02).sort((a, b) => b - a)[0];
      const thicker = [...gauges].filter((x) => x > g + 0.02).sort((a, b) => a - b)[0];
      const tryGauge = (nextG: number, label: string, thinnerStep: boolean) => {
        const bed = tensionOutcome(str, t, nextG);
        const off = stringLaunchOffsets(str, t, nextG);
        out.push({
          id: `gauge-${nextG}`,
          family: "gauge",
          action: label,
          why: thinnerStep
            ? "Thinner mains bite and snap back harder (more RPM window) but notch sooner and give up some directional control."
            : "Thicker gauge is a control/durability dose: less bite, firmer pocket, more connected redirects.",
          science:
            "Gauge steps are catalog 0.05 mm: thinner ≈ +3.5 power / +4.5 spin / +3 comfort / −2.5 control on the bed, then the same frame/bed blend.",
          delta: {
            power: BED_WEIGHT.power * (bed.power - oldBed.power),
            spin: BED_WEIGHT.spin * (bed.spin - oldBed.spin),
            control: BED_WEIGHT.control * (bed.control - oldBed.control),
            comfort: BED_WEIGHT.comfort * (bed.comfort - oldBed.comfort),
          },
          dLaunch: off.launch - oldOff.launch,
          dPath: off.path - oldOff.path,
          dSw: 0,
          tipG: 0,
          handleG: 0,
          sideG: 0,
        });
      };
      if (thinner != null) {
        tryGauge(thinner, `Step down to ${thinner.toFixed(2)} mm gauge (thinner)`, true);
      }
      if (thicker != null) {
        tryGauge(thicker, `Step up to ${thicker.toFixed(2)} mm gauge (thicker)`, false);
      }
    }
  }

  const racket = input.racket;
  if (racket || input.setup.racketLaunchDeg != null) {
    const tapeInput = racket ?? {
      weightG: input.setup.racketWeightG,
      swingweight: input.setup.racketSwingweight,
      balanceMm: input.setup.racketBalanceMm,
      idealLaunchAngleDeg: input.setup.racketLaunchDeg ?? 8,
      idealSwingPathDeg: input.setup.racketSwingPathDeg ?? 22,
    };
    const pieces = input.setup.leadTape?.pieces ?? [];
    const add = (opts: {
      id: string;
      family: LeverFamily;
      extra: ReturnType<typeof createLeadTapePiece>[];
      action: string;
      why: string;
      science: string;
      tipG: number;
      handleG: number;
      sideG: number;
    }) => {
      const d = tapeDeltaFromPieces(tapeInput, pieces, opts.extra);
      out.push({
        id: opts.id,
        family: opts.family,
        action: opts.action,
        why: opts.why,
        science: opts.science,
        delta: d.scores,
        dLaunch: d.dLaunch,
        dPath: d.dPath,
        dSw: d.dSw,
        tipG: opts.tipG,
        handleG: opts.handleG,
        sideG: opts.sideG,
      });
    };

    for (const mass of [1, 2] as const) {
      add({
        id: `tape-twelve-${mass}`,
        family: "tape-12",
        extra: [createLeadTapePiece(mass, "twelve")],
        action: `Add ${mass} g at 12 o’clock (hoop)`,
        why: "SW ≈ m·r². 12 o’clock is the longest practical hoop lever (~65 cm) — plow and a slightly flatter leave without sitting on the bumper.",
        science:
          "Tip-family scores: +1.45 power / +0.4 spin / −0.35 control / −0.95 comfort per gram, plus SW from m·r² at 65 cm. First-strike dose; costs tip lag and arm load.",
        tipG: mass,
        handleG: 0,
        sideG: 0,
      });
      add({
        id: `tape-tip-${mass}`,
        family: "tape-12",
        extra: [createLeadTapePiece(mass, "tip")],
        action: `Add ${mass} g at the extreme tip (bumper)`,
        why: "Same SW family as 12, ~68 cm lever — a bit more plow per gram. The bluntest power move; use only if hoop-12 isn’t enough.",
        science:
          "Same score map as 12 o’clock with a longer r in m·r². High-level setups usually prefer hoop-12 or 3/9 before bumper lead.",
        tipG: mass,
        handleG: 0,
        sideG: 0,
      });
      add({
        id: `tape-39-${mass}`,
        family: "tape-39",
        extra: [createLeadTapePiece(mass, "three"), createLeadTapePiece(mass, "nine")],
        action: `Add ${mass} g at 3 and ${mass} g at 9 (paired)`,
        why: "Twistweight / polar MOI (Brody; Cross & Lindsey): mass far from the long axis keeps the face from twisting on off-center hits. SW rise is smaller than the same grams at 12.",
        science:
          "Side mass: +1.25 control / +0.35 power / +0.2 spin per gram, little launch change. Always paired — a single-side strip yaws the hoop. This is the tour stability channel, not a bumper-power channel.",
        tipG: 0,
        handleG: 0,
        sideG: mass * 2,
      });
      add({
        id: `tape-handle-${mass}`,
        family: "tape-handle",
        extra: [createLeadTapePiece(mass, "handle")],
        action: `Add ${mass} g at the handle / butt`,
        why: "Mass near the rotation axis. Recoil weight up, SW barely moves, balance goes head-light — faster prep and an easier low-to-high path (modern RPM window).",
        science:
          "Handle: −0.4 power / −0.15 spin / +0.55 control / +0.35 comfort per gram; path steepens (~+0.4°/g). Plow dips; whip and comfort rise.",
        tipG: 0,
        handleG: mass,
        sideG: 0,
      });
      add({
        id: `tape-throat-${mass}`,
        family: "tape-throat",
        extra: [createLeadTapePiece(mass, "throat")],
        action: `Add ${mass} g at the throat / yoke`,
        why: "Near the balance point — solidifies the hoop with little SW and little launch change. The ‘more connected’ dose without the 12 o’clock tax.",
        science:
          "Throat: modest power/control/comfort (+0.45 / +0.35 / +0.25 per gram), small SW because r ≈ 42 cm in m·r².",
        tipG: 0,
        handleG: 0,
        sideG: 0,
      });
    }
  }

  return out;
}
