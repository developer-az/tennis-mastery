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

export type InBandLever = {
  id: string;
  target: ScoreKey;
  action: string;
  science: string;
  /** Predicted molded scores after this single lever */
  predicted: ScoreBag;
  predictedFlyRisk: number | null;
  predictedDepth: number | null;
  deltas: ScorePieceDeltas;
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
  action: string;
  science: string;
  delta: ScorePieceDeltas;
  dLaunch: number;
  dPath: number;
  dSw: number;
  tipG: number;
  handleG: number;
};

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

    const levers: InBandLever[] = [];
    if (current != null && v !== "high" && headroomUp > 0) {
      for (const c of candidates) {
        if (c.delta[key] <= 0.15) continue;
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
          currentSw: input.currentSw ?? null,
        });
        if (!flightGuard(input.flight, fl.flyRisk, fl.depth)) continue;
        levers.push({
          id: `${key}-${c.id}`,
          target: key,
          action: c.action,
          science: c.science,
          predicted,
          predictedFlyRisk: fl.flyRisk,
          predictedDepth: fl.depth,
          deltas: c.delta,
          headroomAfter: Math.max(0, band.high - (predTarget ?? band.high)),
        });
      }
      levers.sort((a, b) => {
        const da = (a.predicted[key] ?? 0) - (current ?? 0);
        const db = (b.predicted[key] ?? 0) - (current ?? 0);
        if (db !== da) return db - da;
        const abs = (d: ScorePieceDeltas) =>
          Math.abs(d.power) + Math.abs(d.spin) + Math.abs(d.control) + Math.abs(d.comfort);
        return abs(a.deltas) - abs(b.deltas);
      });
    }

    return {
      key,
      current,
      band,
      verdict: v,
      headroomUp,
      headroomDown,
      levers: levers.slice(0, 3),
      holdNote,
    };
  });

  return {
    bands,
    flyRiskCap: FLY_RISK_CAP,
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
        action: label,
        science: `Bed blend uses the catalog tension model (power −14×Δ, control +16×Δ, comfort −18×Δ per half-range; Δ = (lbs − rec) / ${span.toFixed(1)}). Combined scores weight the bed at ${BED_WEIGHT.power}/${BED_WEIGHT.spin}/${BED_WEIGHT.control}/${BED_WEIGHT.comfort} vs the frame.`,
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
      });
    };
    tryTension(t - 2, `Drop tension 2 lbs → ${t - 2} lbs (one bed only)`);
    tryTension(t + 2, `Raise tension 2 lbs → ${t + 2} lbs (one bed only)`);

    if (g != null) {
      const gauges = str.gaugesMm;
      const thinner = [...gauges].filter((x) => x < g - 0.02).sort((a, b) => b - a)[0];
      const thicker = [...gauges].filter((x) => x > g + 0.02).sort((a, b) => a - b)[0];
      const tryGauge = (nextG: number, label: string) => {
        const bed = tensionOutcome(str, t, nextG);
        const off = stringLaunchOffsets(str, t, nextG);
        out.push({
          id: `gauge-${nextG}`,
          action: label,
          science:
            "Gauge deltas are the catalog 0.05 mm steps: thinner ≈ +3.5 power / +4.5 spin / +3 comfort / −2.5 control on the bed, then the same frame/bed blend weights.",
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
        });
      };
      if (thinner != null) {
        tryGauge(thinner, `Step down to ${thinner.toFixed(2)} mm gauge (thinner)`);
      }
      if (thicker != null) {
        tryGauge(thicker, `Step up to ${thicker.toFixed(2)} mm gauge (thicker)`);
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
    const add = (zone: LeadTapePiece["zone"], mass: number, action: string, science: string) => {
      const extra = [createLeadTapePiece(mass, zone)];
      if (zone === "three") extra.push(createLeadTapePiece(mass, "nine"));
      const d = tapeDeltaFromPieces(tapeInput, pieces, extra);
      out.push({
        id: `tape-${zone}-${mass}`,
        action,
        science,
        delta: d.scores,
        dLaunch: d.dLaunch,
        dPath: d.dPath,
        dSw: d.dSw,
        tipG: zone === "tip" || zone === "twelve" ? mass : 0,
        handleG: zone === "handle" ? mass : 0,
      });
    };
    add(
      "tip",
      2,
      "Add 2 g tip lead (one frame)",
      "Tip mass: scoreDeltasFromTape uses +1.45 power / +0.4 spin / −0.35 control / −0.95 comfort per gram, plus SW from m·r² at 68 cm.",
    );
    add(
      "twelve",
      2,
      "Add 2 g at 12 o’clock",
      "Same tip-family score model as extreme tip, slightly less SW (65 cm lever).",
    );
    add(
      "handle",
      2,
      "Add 2 g handle / butt",
      "Handle mass: −0.4 power / −0.15 spin / +0.55 control / +0.35 comfort per gram; path steepens (+0.4°/g).",
    );
    add(
      "three",
      1,
      "Add 1 g at 3 and 1 g at 9",
      "Side mass: +1.25 control per gram, +0.35 power, mild spin; intended as twist stability without a tip SW spike.",
    );
    add(
      "throat",
      2,
      "Add 2 g throat / yoke",
      "Throat mass sits near the balance point: modest power/control/comfort, little SW jump.",
    );
  }

  return out;
}
