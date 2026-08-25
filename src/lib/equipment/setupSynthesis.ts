import type { GripProfile, RacketProfile, StringProfile } from "@/types/equipment";
import type { MySetup } from "@/store/gearStore";
import { computeLeadTapeEffect } from "@/lib/equipment/leadTape";
import { derivePlayerFit } from "@/lib/equipment/playerFit";
import { analyzeFrame } from "@/lib/equipment/strokeformIntel";
import { tensionOutcome } from "@/lib/equipment/strings";
import { gripStackEffect } from "@/lib/equipment/gripStack";
import {
  deriveForehandMold,
  type ForehandMoldAdvice,
} from "@/lib/equipment/forehandMold";
import {
  computeFlightMetrics,
  scoreDeltasFromTape,
  stringLaunchOffsets,
  type FlightMetrics,
  type ScorePieceDeltas,
} from "@/lib/equipment/moldPhysics";
import { buildInBandPlan, healthyBandsFor, type InBandPlan } from "@/lib/equipment/inBandImprove";
import { equipmentLabel } from "@/lib/equipment/labels";

export type { FlightMetrics, ScorePieceDeltas };
export { computeFlightMetrics, scoreDeltasFromTape, stringLaunchOffsets };

export interface ScoreTuneTip {
  score: "power" | "spin" | "control" | "comfort";
  current: number | null;
  verdict: "low" | "ok" | "high";
  /** String / tension / gauge levers */
  raise: string[];
  lower: string[];
  /** Lead-tape specific levers */
  tapeRaise: string[];
  tapeLower: string[];
  tradeoff: string;
  science: string;
}

export interface FramePracticeTip {
  title: string;
  holdingBack: string;
  practice: string[];
}

export interface CombinedSetupInsight {
  hasAny: boolean;
  hasRacket: boolean;
  hasString: boolean;
  hasGrip: boolean;
  hasTape: boolean;
  launchAngleDeg: number | null;
  swingPathDeg: number | null;
  baseLaunchDeg: number | null;
  baseSwingPathDeg: number | null;
  deltas: {
    stringLaunch: number;
    gripLaunch: number;
    tapeLaunch: number;
    stringPath: number;
    tapePath: number;
  };
  /** Stock frame scores (before string/grip/tape mold) */
  stockScores: {
    power: number | null;
    spin: number | null;
    control: number | null;
    comfort: number | null;
  };
  /** How each piece shifted scores vs stock blend */
  scoreDeltas: {
    string: ScorePieceDeltas;
    grip: ScorePieceDeltas;
    tape: ScorePieceDeltas;
    total: ScorePieceDeltas;
  };
  flight: FlightMetrics | null;
  playstyle: string;
  playstyleDetail: string;
  pros: string[];
  cons: string[];
  tuneTips: ScoreTuneTip[];
  /** One-lever raises that keep every currently-healthy score inside its band. */
  inBand: InBandPlan;
  scienceNotes: string[];
  /** What the frame itself is holding back + what to practice */
  weakPoints: FramePracticeTip[];
  gripBuildNote: string | null;
  /** Optimal FH grip + face angle for this mold */
  forehand: ForehandMoldAdvice | null;
  scores: {
    power: number | null;
    spin: number | null;
    control: number | null;
    comfort: number | null;
  };
  summary: string;
  completeness: number;
}

function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

function fmtSigned(n: number): string {
  const r = round1(n);
  if (Math.abs(r) < 0.05) return "0";
  return `${r > 0 ? "+" : ""}${r}`;
}

function avg(parts: { v: number; w: number }[]): number | null {
  let sum = 0;
  let w = 0;
  for (const p of parts) {
    if (!Number.isFinite(p.v) || p.w <= 0) continue;
    sum += p.v * p.w;
    w += p.w;
  }
  return w > 0 ? Math.round(sum / w) : null;
}

function gripLaunchOffset(grip: Pick<GripProfile, "cushion" | "tackiness" | "thicknessMm">): number {
  // Soft/thick grips slightly raise perceived launch (more dwell / less boardy handle)
  return round1((grip.cushion - 50) * 0.008 + (grip.thicknessMm - 0.6) * 0.15);
}

/**
 * Mold racket + string + grip + lead tape into one coaching readout:
 * composite launch/path, playstyle, and honest pros/cons.
 */
export function synthesizeCombinedSetup(
  setup: MySetup,
  racket: RacketProfile | null | undefined,
  string: StringProfile | null | undefined,
  grip: GripProfile | null | undefined,
  gripsCatalog: GripProfile[] = [],
  opts?: {
    playerGrip?: import("@/lib/equipment/forehandMold").ForehandGripKind | null;
    armFriendly?: boolean;
  },
): CombinedSetupInsight {
  const pieces = setup.leadTape?.pieces ?? [];
  const hasRacket = Boolean(setup.racketSlug || racket);
  const hasString = Boolean(setup.stringId || string);
  const layers = setup.gripLayers?.length
    ? setup.gripLayers
    : setup.gripId
      ? [
          {
            id: setup.gripId,
            label: setup.gripLabel ?? setup.gripId,
            kind: (grip?.kind ?? "overgrip") as "overgrip" | "replacement",
          },
        ]
      : [];
  const catalog = gripsCatalog.length
    ? gripsCatalog
    : grip
      ? [grip]
      : [];
  const stack = gripStackEffect(layers, catalog, setup.gripSize);
  const hasGrip = layers.length > 0 || Boolean(setup.gripId || grip);
  const hasTape = pieces.length > 0;
  const hasAny = hasRacket || hasString || hasGrip || hasTape;

  const baseLaunch =
    racket?.idealLaunchAngleDeg ?? setup.racketLaunchDeg ?? null;
  const basePath =
    racket?.idealSwingPathDeg ?? setup.racketSwingPathDeg ?? null;

  let stringLaunch = 0;
  let stringPath = 0;
  let stringHint: string | null = null;
  if (string && setup.tensionLbs != null) {
    const off = stringLaunchOffsets(string, setup.tensionLbs, setup.gaugeMm ?? undefined);
    stringLaunch = off.launch;
    stringPath = off.path;
    stringHint = off.hint;
  } else if (hasString && setup.stringPower != null) {
    stringLaunch = round1(((setup.stringPower ?? 50) - 50) * 0.02);
    stringPath = round1(((setup.stringSpin ?? 50) - 50) * 0.025);
  }

  let gripLaunch = 0;
  if (hasGrip && layers.length > 0) {
    gripLaunch = stack.launchOffset;
  } else if (grip) {
    gripLaunch = gripLaunchOffset(grip);
  } else if (setup.gripCushion != null) {
    gripLaunch = round1(((setup.gripCushion ?? 50) - 50) * 0.008);
  }

  let tapeLaunch = 0;
  let tapePath = 0;
  let tapeHints: string[] = [];
  let tapeScore: ScorePieceDeltas = { power: 0, spin: 0, control: 0, comfort: 0 };
  let tapeSwDelta = 0;
  let tapeTipG = 0;
  let tapeHandleG = 0;
  let tapeSideG = 0;
  let tapeThroatG = 0;
  let effectiveSw: number | null =
    racket?.swingweight ?? setup.racketSwingweight ?? null;

  if (hasRacket && (racket || (setup.racketLaunchDeg != null && setup.racketSwingPathDeg != null))) {
    const tapeInput = racket ?? {
      weightG: setup.racketWeightG,
      swingweight: setup.racketSwingweight,
      balanceMm: null,
      idealLaunchAngleDeg: setup.racketLaunchDeg ?? 8,
      idealSwingPathDeg: setup.racketSwingPathDeg ?? 22,
    };
    const effect = computeLeadTapeEffect(tapeInput, pieces);
    tapeLaunch = effect.deltaLaunchDeg;
    tapePath = effect.deltaSwingPathDeg;
    tapeHints = effect.hints.filter((h) => !h.startsWith("Add tape"));
    tapeSwDelta = effect.deltaSwingweight;
    effectiveSw = effect.swingweight;
    const zs = effect.zoneSummary;
    tapeTipG = (zs.tip ?? 0) + (zs.twelve ?? 0);
    tapeHandleG = zs.handle ?? 0;
    tapeSideG = (zs.three ?? 0) + (zs.nine ?? 0);
    tapeThroatG = zs.throat ?? 0;
    tapeScore = scoreDeltasFromTape({
      tipG: tapeTipG,
      handleG: tapeHandleG,
      sideG: tapeSideG,
      throatG: tapeThroatG,
      deltaSw: tapeSwDelta,
      deltaPath: tapePath,
    });
  }

  let launchAngleDeg: number | null = null;
  let swingPathDeg: number | null = null;
  if (baseLaunch != null) {
    launchAngleDeg = clamp(
      round1(baseLaunch + stringLaunch + gripLaunch + tapeLaunch),
      1.5,
      16,
    );
  }
  if (basePath != null) {
    swingPathDeg = clamp(round1(basePath + stringPath + tapePath), 4, 48);
  }

  const stockScores = {
    power: racket?.power ?? setup.racketPower ?? null,
    spin: racket?.spin ?? setup.racketSpin ?? null,
    control: racket?.control ?? setup.racketControl ?? null,
    comfort: racket?.comfort ?? setup.racketComfort ?? null,
  };

  const bed =
    string && setup.tensionLbs != null
      ? tensionOutcome(string, setup.tensionLbs, setup.gaugeMm ?? undefined)
      : string
        ? tensionOutcome(
            string,
            string.recommendedTensionLbs,
            setup.gaugeMm ?? undefined,
          )
        : null;

  // Frame-weighted blend, then additive grip/tape science deltas
  const blendPower = avg([
    { v: stockScores.power ?? NaN, w: hasString || bed ? 0.55 : 1 },
    { v: bed?.power ?? setup.stringPower ?? NaN, w: 0.45 },
  ]);
  const blendSpin = avg([
    { v: stockScores.spin ?? NaN, w: hasString || bed ? 0.5 : 1 },
    { v: bed?.spin ?? setup.stringSpin ?? NaN, w: 0.5 },
  ]);
  const blendControl = avg([
    { v: stockScores.control ?? NaN, w: hasString || bed ? 0.55 : 1 },
    { v: bed?.control ?? setup.stringControl ?? NaN, w: 0.45 },
  ]);
  const blendComfort = avg([
    { v: stockScores.comfort ?? NaN, w: hasString || bed ? 0.45 : 1 },
    { v: bed?.comfort ?? setup.stringComfort ?? NaN, w: 0.55 },
  ]);

  const stringScore: ScorePieceDeltas = {
    power: blendPower != null && stockScores.power != null ? blendPower - stockScores.power : 0,
    spin: blendSpin != null && stockScores.spin != null ? blendSpin - stockScores.spin : 0,
    control:
      blendControl != null && stockScores.control != null
        ? blendControl - stockScores.control
        : 0,
    comfort:
      blendComfort != null && stockScores.comfort != null
        ? blendComfort - stockScores.comfort
        : 0,
  };

  const gripScore: ScorePieceDeltas = hasGrip
    ? {
        power: round1((stack.cushion - 50) * 0.04),
        spin: stack.spinBias,
        control: stack.controlBias,
        comfort: stack.comfortBias,
      }
    : { power: 0, spin: 0, control: 0, comfort: 0 };

  const power =
    blendPower != null
      ? clamp(Math.round(blendPower + gripScore.power + tapeScore.power), 5, 98)
      : null;
  const spin =
    blendSpin != null
      ? clamp(Math.round(blendSpin + gripScore.spin + tapeScore.spin), 5, 98)
      : null;
  const control =
    blendControl != null
      ? clamp(Math.round(blendControl + gripScore.control + tapeScore.control), 5, 98)
      : null;
  const comfort =
    blendComfort != null
      ? clamp(Math.round(blendComfort + gripScore.comfort + tapeScore.comfort), 5, 98)
      : null;

  const scoreDeltas = {
    string: {
      power: round1(stringScore.power),
      spin: round1(stringScore.spin),
      control: round1(stringScore.control),
      comfort: round1(stringScore.comfort),
    },
    grip: gripScore,
    tape: {
      power: round1(tapeScore.power),
      spin: round1(tapeScore.spin),
      control: round1(tapeScore.control),
      comfort: round1(tapeScore.comfort),
    },
    total: {
      power:
        power != null && stockScores.power != null ? power - stockScores.power : 0,
      spin: spin != null && stockScores.spin != null ? spin - stockScores.spin : 0,
      control:
        control != null && stockScores.control != null
          ? control - stockScores.control
          : 0,
      comfort:
        comfort != null && stockScores.comfort != null
          ? comfort - stockScores.comfort
          : 0,
    },
  };

  const flight =
    launchAngleDeg != null && swingPathDeg != null
      ? computeFlightMetrics({
          launchDeg: launchAngleDeg,
          pathDeg: swingPathDeg,
          power,
          spin,
          control,
          swingweight: effectiveSw,
          tipG: tapeTipG,
          handleG: tapeHandleG,
          sideG: tapeSideG,
        })
      : null;

  const fit = racket ? derivePlayerFit(racket) : null;
  const frameIntel = racket ? analyzeFrame(racket) : null;
  const playstyle = buildPlaystyle({
    racketStyle: racket?.style ?? null,
    fitRole: fit?.courtRole ?? null,
    archetype: frameIntel?.primaryArchetype ?? null,
    skillCeiling: frameIntel?.skill.ceiling ?? null,
    power,
    spin,
    control,
    comfort,
    launchAngleDeg,
    swingPathDeg,
    hasTape,
    tipHeavy: tapeLaunch < -0.15,
    handleHeavy: tapeLaunch > 0.1,
    stringMaterial: string?.material ?? null,
    stringShape: string?.shape ?? null,
  });
  const playstyleDetail = buildPlaystyleDetail({
    fit,
    archetype: frameIntel?.primaryArchetype ?? null,
    specialBody: frameIntel?.specialBody ?? null,
    playstyleLabel: playstyle.label,
    launchAngleDeg,
    swingPathDeg,
    baseLaunch,
    basePath,
    string,
    tensionLbs: setup.tensionLbs,
    gaugeMm: setup.gaugeMm,
    grip,
    deltas: {
      stringLaunch,
      gripLaunch,
      tapeLaunch,
      stringPath,
      tapePath,
    },
  });

  const inBand = buildInBandPlan({
    scores: { power, spin, control, comfort },
    role: fit?.courtRole ?? playstyle.label,
    string,
    tensionLbs: setup.tensionLbs,
    gaugeMm: setup.gaugeMm,
    setup,
    racket,
    flight,
    currentSw: effectiveSw,
    currentTipG: tapeTipG,
    currentHandleG: tapeHandleG,
    currentSideG: tapeSideG,
    armFriendly: opts?.armFriendly,
  });

  const tuneTips = buildTuneTips({
    power,
    spin,
    control,
    comfort,
    role: fit?.courtRole ?? playstyle.label,
    launchAngleDeg,
    swingPathDeg,
    string,
    tensionLbs: setup.tensionLbs,
    gaugeMm: setup.gaugeMm,
    hasTape,
    tipHeavy: tapeLaunch < -0.15,
    overgripCount: stack.overgripCount,
  });

  const weakPoints = buildWeakPoints(racket, {
    power,
    spin,
    control,
    comfort,
    launchAngleDeg,
    swingPathDeg,
  });

  const forehand = deriveForehandMold({
    racket,
    launchAngleDeg,
    swingPathDeg,
    power,
    spin,
    control,
    playerGrip: opts?.playerGrip ?? null,
  });

  const scienceNotes = buildScienceNotes({
    racket,
    string,
    tensionLbs: setup.tensionLbs,
    gaugeMm: setup.gaugeMm,
    launchAngleDeg,
    swingPathDeg,
    deltas: { stringLaunch, gripLaunch, tapeLaunch, stringPath, tapePath },
    gripBuildNote: hasGrip ? stack.buildNote : null,
    flight,
    forehand,
    scores: { power, spin, control, comfort },
    stockScores,
  });

  const pros: string[] = [];
  const cons: string[] = [];

  if (racket) {
    const sw = racket.swingweight;
    const ra = racket.stiffnessRa;
    const wt = racket.weightG;
    const hs = racket.headSizeSqIn;
    const bal = racket.balanceMm;
    if (sw != null) {
      if (sw >= 330) {
        pros.push(`High swingweight (${sw}) — plow & stability through contact; add tip weight carefully.`);
      } else if (sw <= 310) {
        pros.push(`Maneuverable SW (${sw}) — easy whip; tip tape if you want more plow.`);
      } else {
        pros.push(`Mid swingweight (${sw}) — balanced plow vs whip; ±2–4g tip/handle is a clean lever.`);
      }
    }
    if (ra != null) {
      if (ra >= 68) {
        cons.push(`Stiff frame (RA ${ra}) — crisp response; soften via −2 lbs, multi/gut, or thicker gauge.`);
      } else if (ra <= 62) {
        pros.push(`Flexible frame (RA ${ra}) — pocket & comfort; raise tension or firmer poly for more pop.`);
      } else {
        pros.push(`Mid stiffness (RA ${ra}) — tension ±2–3 lbs is an accountable fine-tune.`);
      }
    }
    if (wt != null) {
      if (wt >= 320) {
        cons.push(`Heavy static (${wt}g) — more plow, slower on short balls; strip handle mass if you’re late.`);
      } else if (wt < 290) {
        cons.push(`Light static (${wt}g) — easy to swing, less inherent mass; tip tape adds plow without resizing.`);
      } else {
        pros.push(`Static weight ${wt}g — room to customize ±4–8g without remolding feel.`);
      }
    }
    if (hs != null) {
      if (hs < 98) {
        pros.push(`Dense head (${hs} in²) — smaller sweet spot favors control; prefer waist–chest strikes.`);
      } else if (hs > 100) {
        pros.push(`Larger head (${hs} in²) — forgiveness; can launch higher if you miss high on the bed.`);
      }
    }
    if (bal != null) {
      if (bal >= 330) {
        cons.push(`Head-heavy balance (${bal} mm) — plow but tip-heavy whip; handle tape can rebalance.`);
      } else if (bal <= 315) {
        pros.push(`Head-light (${bal} mm) — quick preparation; tip tape if you want more drive.`);
      }
    }
    if (racket.stringPattern) {
      const pat = racket.stringPattern.replace(/\s/g, "").toLowerCase();
      if (pat.startsWith("18x20")) {
        pros.push(`18×20 pattern — denser bed, flatter launch bias; −1–2 lbs or open gauge for spin.`);
      } else if (pat.startsWith("16x19")) {
        pros.push(`16×19 pattern — more bite & launch; +1–2 lbs or thicker gauge if you spray long.`);
      } else {
        pros.push(`Pattern ${racket.stringPattern} — treat tension as the main spin/control dial.`);
      }
    }
    if (racket.spin >= 72) pros.push(`Frame spin score ${racket.spin}/100 — helps shape & net clearance.`);
    if (racket.control >= 72) pros.push(`Control score ${racket.control}/100 — rewards clean contact.`);
    if (racket.power >= 72) pros.push(`Power score ${racket.power}/100 — easy depth when you catch the bed.`);
    if (racket.comfort >= 70) pros.push(`Comfort score ${racket.comfort}/100 — stock shock path is friendly.`);
    if (racket.control <= 55 && racket.power >= 70) {
      cons.push(
        "Power-biased frame sprays if contact is late — raise control via +2 lbs tension or denser bed feel.",
      );
    }
    if (baseLaunch != null && basePath != null) {
      pros.push(
        `Stock teaching: ~${baseLaunch}° leave / ~${basePath}° path — check My Setup after string/tape.`,
      );
    }
  } else if (hasRacket && setup.racketLabel) {
    pros.push(`Saved frame: ${setup.racketLabel}.`);
  }

  if (string && setup.tensionLbs != null) {
    const o = tensionOutcome(string, setup.tensionLbs, setup.gaugeMm ?? undefined);
    const gauge = setup.gaugeMm ?? string.gaugesMm[0];
    pros.push(
      `${equipmentLabel(string.brand, string.name)}${gauge != null ? ` ${gauge}mm` : ""} @ ${setup.tensionLbs} lbs — ${o.dwellHint}`,
    );
    pros.push(
      `Bed @ this tension: power ${o.power} · spin ${o.spin} · control ${o.control} · comfort ${o.comfort} · durability ${o.durability}.`,
    );
    if (stringHint) pros.push(stringHint);
    if (stringLaunch !== 0 || stringPath !== 0) {
      pros.push(
        `String/tension vs bare frame: launch ${stringLaunch >= 0 ? "+" : ""}${stringLaunch}° · path ${stringPath >= 0 ? "+" : ""}${stringPath}°.`,
      );
    }
    const rec = string.recommendedTensionLbs;
    if (Math.abs(setup.tensionLbs - rec) >= 3) {
      cons.push(
        `Tension ${setup.tensionLbs} lbs is ${setup.tensionLbs > rec ? "above" : "below"} the string’s ${rec} lbs midpoint — expect a clear feel shift; ±2 lbs is a safer first tweak.`,
      );
    } else {
      pros.push(`Near recommended midpoint (${rec} lbs) — ±1–2 lb moves are accountable next steps.`);
    }
    if (o.comfort <= 45) cons.push("Firm bed — soften with −2 lbs, thicker gauge, or multi/gut hybrid.");
    if (o.durability <= 45) cons.push("Softer/thinner bed may notch or lose tension sooner — plan restring cadence.");
    if (o.spin >= 72) pros.push("Snap-back / spin window is open on this bed.");
    if (o.control >= 72 && o.power <= 55) {
      cons.push("Control-heavy bed — add depth with −1–2 lbs or a livelier gauge before changing frames.");
    }
  } else if (!hasString) {
    cons.push("No string saved — launch and pocket feel are incomplete without a bed (biggest fine-tune lever).");
  }

  if (hasGrip) {
    pros.push(
      `Grip stack: ${stack.overgripCount} overgrip${stack.overgripCount === 1 ? "" : "s"}` +
        (stack.hasReplacement ? " + replacement" : "") +
        ` · ${stack.thicknessMm} mm · tack ${stack.tackiness} · cushion ${stack.cushion}.`,
    );
    pros.push(stack.buildNote);
    if (gripLaunch !== 0) {
      pros.push(
        `Handle build bias ~${gripLaunch >= 0 ? "+" : ""}${gripLaunch}° launch (size + stack thickness/cushion).`,
      );
    }
    if (stack.overgripCount >= 2) {
      cons.push(
        `${stack.overgripCount} overgrips add cushion but round the bevels — spin/whip can drop; strip one if the handle feels fat.`,
      );
    }
    if (setup.gripSize == null) {
      cons.push("No grip size set — L0–L5 changes effective build as much as an extra overgrip.");
    }
  } else if (!hasGrip) {
    cons.push("No grip saved — handle size and overgrip stack are unknown levers.");
  }

  if (hasTape) {
    const g = pieces.reduce((n, p) => n + p.massG, 0);
    pros.push(`Lead tape +${round1(g)}g across ${pieces.length} piece${pieces.length === 1 ? "" : "s"}.`);
    for (const h of tapeHints.slice(0, 2)) pros.push(h);
    if (Math.abs(tapeLaunch) >= 0.15 || Math.abs(tapePath) >= 0.2) {
      pros.push(
        `Tape vs stock: launch ${tapeLaunch >= 0 ? "+" : ""}${tapeLaunch}° · path ${tapePath >= 0 ? "+" : ""}${tapePath}°.`,
      );
    }
    const td = tapeScore;
    if (Math.abs(td.power) + Math.abs(td.spin) + Math.abs(td.control) >= 1.5) {
      pros.push(
        `Tape score shift: Pwr ${fmtSigned(td.power)} · Spin ${fmtSigned(td.spin)} · Ctl ${fmtSigned(td.control)} · Comfort ${fmtSigned(td.comfort)}.`,
      );
    }
    if (g >= 8) {
      cons.push("Heavy tape (≥8g) — big SW jump; try −2g or move mass to the handle.");
    }
    if (g > 0 && g < 2) {
      pros.push("Light tape dose — clean A/B for tip vs handle.");
    }
  } else if (hasRacket) {
    cons.push("No lead tape — tip/handle mass is still free for plow vs whip.");
  }

  if (launchAngleDeg != null && swingPathDeg != null) {
    pros.push(`Molded flight: ${launchAngleDeg}° leave / ${swingPathDeg}° path.`);
    if (flight) {
      pros.push(
        `Clean hit: +${flight.netClearIn}" clear · plow ${flight.plow} · topspin ${flight.topspin} · depth ${flight.depth}.`,
      );
    }
    if (launchAngleDeg >= 10) {
      cons.push(
        `High net clearance (~${launchAngleDeg.toFixed(1)}° leave, ~+${flight?.netClearIn ?? "?"}"). Clean hits can sail long — try +1–2 lbs or less tip mass.`,
      );
    } else if (launchAngleDeg <= 6) {
      cons.push(
        `Low net clearance (~${launchAngleDeg.toFixed(1)}° leave, ~+${flight?.netClearIn ?? "?"}"). Balls leave the strings on a low path and can catch the net on late or low contact — try −1–2 lbs or a little tip mass.`,
      );
    } else if (flight) {
      pros.push(
        `Net margin: ~+${flight.netClearIn}" on a clean center hit (${launchAngleDeg.toFixed(1)}° leave) — balanced window.`,
      );
    }
  }

  if (!hasRacket) {
    cons.push("No racket — need a frame for launch.");
  }

  if (forehand) {
    pros.push(`FH: ${forehand.summary}.`);
  }

  if (pros.length === 0 && hasAny) {
    pros.push("Pieces saved — add more for a fuller mold.");
  }

  const completeness =
    (hasRacket ? 35 : 0) + (hasString ? 30 : 0) + (hasGrip ? 20 : 0) + (hasTape ? 15 : 0);

  const summaryParts: string[] = [];
  if (setup.racketLabel) summaryParts.push(setup.racketLabel);
  if (setup.stringLabel) {
    const t = setup.tensionLbs != null ? ` @ ${setup.tensionLbs} lbs` : "";
    summaryParts.push(`${setup.stringLabel}${t}`);
  }
  if (setup.gripLabel) summaryParts.push(setup.gripLabel);
  if (hasTape) {
    const g = pieces.reduce((n, p) => n + p.massG, 0);
    summaryParts.push(`+${round1(g)}g tape`);
  }

  return {
    hasAny,
    hasRacket,
    hasString,
    hasGrip,
    hasTape,
    launchAngleDeg,
    swingPathDeg,
    baseLaunchDeg: baseLaunch,
    baseSwingPathDeg: basePath,
    deltas: {
      stringLaunch,
      gripLaunch,
      tapeLaunch,
      stringPath,
      tapePath,
    },
    stockScores,
    scoreDeltas,
    flight,
    playstyle: playstyle.label,
    playstyleDetail: playstyleDetail,
    pros,
    cons,
    tuneTips,
    inBand,
    scienceNotes,
    weakPoints,
    gripBuildNote: hasGrip ? stack.buildNote : null,
    forehand,
    scores: { power, spin, control, comfort },
    summary: summaryParts.join(" · ") || "No gear saved yet.",
    completeness,
  };
}

function buildPlaystyle(input: {
  racketStyle: string | null;
  fitRole: string | null;
  archetype: string | null;
  skillCeiling: number | null;
  power: number | null;
  spin: number | null;
  control: number | null;
  comfort: number | null;
  launchAngleDeg: number | null;
  swingPathDeg: number | null;
  hasTape: boolean;
  tipHeavy: boolean;
  handleHeavy: boolean;
  stringMaterial: StringProfile["material"] | null;
  stringShape: StringProfile["shape"] | null;
}): { label: string } {
  const { power: p, spin: s, control: c, launchAngleDeg: launch, swingPathDeg: path } = input;

  // Strokeform archetype first — never a vague “everyone is a baseliner”
  let core = input.archetype ?? input.fitRole ?? "Modern all-court shaper";

  if (s != null && p != null && s >= 74 && s >= (c ?? 50) + 6 && (path == null || path >= 24)) {
    if (!input.archetype || /all-court/i.test(input.archetype)) core = "Western spin sculptor";
  } else if (c != null && p != null && c >= 74 && c >= p + 8) {
    if (!input.archetype) core = path != null && path <= 16 ? "Precision line-hitter" : "Dense-pattern technician";
  } else if (p != null && p >= 74 && (c ?? 50) <= 60) {
    if (!input.archetype) core = "Flat first-strike aggressor";
  }

  const tags: string[] = [core];
  if (input.skillCeiling != null) tags.push(`ceiling ${input.skillCeiling}`);
  if (input.stringMaterial === "polyester" || input.stringMaterial === "co-poly") {
    tags.push(input.stringShape && input.stringShape !== "round" ? "shaped poly" : "poly pocket");
  } else if (input.stringMaterial === "natural-gut" || input.stringMaterial === "multifilament") {
    tags.push("soft bed");
  } else if (input.stringMaterial === "hybrid") {
    tags.push("hybrid bed");
  }
  if (input.tipHeavy) tags.push("tip-weighted plow");
  else if (input.handleHeavy) tags.push("handle-weighted whip");
  else if (input.hasTape) tags.push("custom balance");
  if (launch != null && path != null) {
    tags.push(`${launch.toFixed(1)}°/${Math.round(path)}° window`);
  }

  return { label: tags.join(" · ") };
}

function buildPlaystyleDetail(input: {
  fit: ReturnType<typeof derivePlayerFit> | null;
  archetype: string | null;
  specialBody: string | null;
  playstyleLabel: string;
  launchAngleDeg: number | null;
  swingPathDeg: number | null;
  baseLaunch: number | null;
  basePath: number | null;
  string: StringProfile | null | undefined;
  tensionLbs: number | null | undefined;
  gaugeMm: number | null | undefined;
  grip: GripProfile | null | undefined;
  deltas: {
    stringLaunch: number;
    gripLaunch: number;
    tapeLaunch: number;
    stringPath: number;
    tapePath: number;
  };
}): string {
  const bits: string[] = [];
  if (input.specialBody) bits.push(input.specialBody);
  else if (input.fit) bits.push(input.fit.blurb);
  else bits.push(input.playstyleLabel);
  if (input.archetype) bits.push(`Archetype: ${input.archetype}`);

  if (input.launchAngleDeg != null && input.swingPathDeg != null) {
    bits.push(
      `${input.launchAngleDeg.toFixed(1)}° leave / ${input.swingPathDeg.toFixed(0)}° path` +
        (input.baseLaunch != null && Math.abs(input.launchAngleDeg - input.baseLaunch) >= 0.2
          ? ` (${input.launchAngleDeg - input.baseLaunch >= 0 ? "+" : ""}${(input.launchAngleDeg - input.baseLaunch).toFixed(1)}° vs stock)`
          : ""),
    );
  }
  if (input.string && input.tensionLbs != null) {
    const g = input.gaugeMm != null ? ` · ${input.gaugeMm}mm` : "";
    bits.push(`${input.string.name} @ ${input.tensionLbs}lbs${g}`);
  }
  return bits.filter(Boolean).join(" · ");
}

function verdictFor(score: number | null, low: number, high: number): "low" | "ok" | "high" {
  if (score == null) return "ok";
  if (score < low) return "low";
  if (score > high) return "high";
  return "ok";
}

function buildTuneTips(input: {
  power: number | null;
  spin: number | null;
  control: number | null;
  comfort: number | null;
  role: string;
  launchAngleDeg: number | null;
  swingPathDeg: number | null;
  string: StringProfile | null | undefined;
  tensionLbs: number | null | undefined;
  gaugeMm: number | null | undefined;
  hasTape: boolean;
  tipHeavy: boolean;
  overgripCount: number;
}): ScoreTuneTip[] {
  const bands = healthyBandsFor(input.role);

  return [
    {
      score: "spin",
      current: input.spin,
      verdict: verdictFor(input.spin, bands.spin.low, bands.spin.high),
      raise: [
        "−1–2 lbs tension (more snap-back dwell)",
        "Thinner gauge (−0.05 mm) if durability allows",
        "Shaped / textured poly mains",
        input.overgripCount >= 2 ? "Strip to one overgrip — freer wrist" : "Keep a thin tacky overgrip",
      ],
      lower: [
        "+1–2 lbs tension",
        "Thicker gauge or denser pattern feel",
        "Rounder poly / multi hybrid",
      ],
      tapeRaise: [
        "+2–4 g at 12 o’clock (plow into the brush)",
        "Pair 1 g at 3 & 9 if the hoop twists on off-center spin",
      ],
      tapeLower: [
        "Strip tip / 12 mass if the face feels grabby and long",
        "+1–2 g handle to quiet tip-heavy whip",
      ],
      tradeoff:
        "More spin usually costs some control on flat redirects and can loft launch if the face stays open.",
      science:
        "Spin = string snap-back × dig into the ball × stable hoop. Tension/gauge change friction; tip mass changes how hard the hoop drives through without changing the string.",
    },
    {
      score: "control",
      current: input.control,
      verdict: verdictFor(input.control, bands.control.low, bands.control.high),
      raise: [
        "+1–3 lbs toward the top of the string’s range",
        "Thicker gauge or denser pattern feel",
        "Lower-powered poly (ALU / 4G family)",
        "Right-size handle (don’t overstack overgrips)",
      ],
      lower: [
        "−2 lbs if the bed feels boardy and depth dies",
        "Thinner gauge or more open pattern feel",
        "Softer multi/gut in crosses",
      ],
      tapeRaise: [
        "+1–2 g handle / butt (head-light, quicker prep)",
        "Strip tip mass first if you’re spraying long",
      ],
      tapeLower: [
        "+2–3 g tip / 12 only if you need plow and can accept more SW",
        "Avoid heavy tip stacks on already power-biased frames",
      ],
      tradeoff:
        "Chasing control flattens the pocket — depth and comfort drop unless your timing is already early and clean.",
      science:
        "Control rises when dwell shortens (firmer bed) and the tip doesn’t lag. Handle mass reduces tip lag; tip mass does the opposite.",
    },
    {
      score: "power",
      current: input.power,
      verdict: verdictFor(input.power, bands.power.low, bands.power.high),
      raise: [
        "−1–2 lbs or a livelier gauge",
        "Softer multi / gut hybrid",
        "Slightly more open stringbed personality",
      ],
      lower: [
        "+2 lbs tension",
        "Control poly / thicker gauge",
      ],
      tapeRaise: [
        "+2–3 g tip or 12 o’clock for plow-through",
        "Light 3/9 (1 g each) if you want mass without max tip SW",
      ],
      tapeLower: [
        "Handle-side tape to quiet tip-heavy trampoline",
        "Strip tip mass before raising tension if the frame already flies",
      ],
      tradeoff:
        "Free power lengthens the ball — if you’re already long, add control levers or handle mass before more tip tape.",
      science:
        "Power ≈ bed COR × effective mass at impact. Soft tension raises COR; tip grams raise effective mass. Spin path is what keeps that speed from sailing.",
    },
    {
      score: "comfort",
      current: input.comfort,
      verdict: verdictFor(input.comfort, bands.comfort.low, bands.comfort.high),
      raise: [
        "−2 lbs or thicker gauge on a stiff poly",
        "Multi/gut hybrid or softer co-poly",
        "Cushioned overgrip (or a second thin layer)",
      ],
      lower: [
        "Only if the bed feels muted — +1 lb or a firmer poly",
        "Thinner, tackier single overgrip for more feedback",
      ],
      tapeRaise: [
        "Prefer throat/handle mass over tip on stiff RA frames",
        "Avoid stacking tip grams when the arm is already hot",
      ],
      tapeLower: [
        "Strip tip mass first — tip SW hits the arm harder than handle mass",
      ],
      tradeoff:
        "Comfort softens feedback — some players lose the connected hit cue they use for timing.",
      science:
        "Peak force tracks RA + bed stiffness + tip SW. Soften the bed before adding tip tape; handle tape changes balance with less shock spike.",
    },
  ];
}

function buildWeakPoints(
  racket: RacketProfile | null | undefined,
  scores: {
    power: number | null;
    spin: number | null;
    control: number | null;
    comfort: number | null;
    launchAngleDeg: number | null;
    swingPathDeg: number | null;
  },
): FramePracticeTip[] {
  if (!racket) return [];
  const tips: FramePracticeTip[] = [];
  const hs = racket.headSizeSqIn ?? 100;
  const sw = racket.swingweight ?? 315;
  const wt = racket.weightG ?? 300;
  const ra = racket.stiffnessRa;
  const path = scores.swingPathDeg ?? racket.idealSwingPathDeg;
  const launch = scores.launchAngleDeg ?? racket.idealLaunchAngleDeg;

  if (racket.control >= 74 && racket.power <= 58) {
    tips.push({
      title: "Low free power",
      holdingBack:
        "This mold won’t manufacture depth — late contact or a short swing dies in the net or lands short.",
      practice: [
        "Shadow early unit turn so the racket is already dropping before the bounce",
        "Hit 20 crosscourts focusing on accelerating through the face center, not arming at contact",
        "On short balls, step in and take waist–chest contact out front — don’t wait",
      ],
    });
  }
  if (racket.power >= 74 && racket.control <= 58) {
    tips.push({
      title: "Spray / sail tendency",
      holdingBack:
        "Easy depth becomes long errors when the face opens or contact is late — the frame amplifies timing mistakes.",
      practice: [
        "Feed drills: catch the ball earlier, finish with a more vertical path if launch is sailing",
        "Aim a meter inside the line for 10 minutes before going for targets",
        "On defense, shorten the backswing — let the frame’s mass work, don’t swing bigger",
      ],
    });
  }
  if (racket.spin >= 76 && path >= 24) {
    tips.push({
      title: "Needs the brush",
      holdingBack:
        "Flat, blocked contact underuses the mold — you’ll lose margin and feel like the frame ‘doesn’t spin’.",
      practice: [
        "Low-to-high shadow swings through the chest window until the path feels automatic",
        "Kick-serve and high FH feeds: brush up the back of the ball, don’t slap",
        "If balls still dump, check face angle — open face + steep path scoops",
      ],
    });
  }
  if (hs < 98) {
    tips.push({
      title: "Small sweet spot",
      holdingBack:
        "Off-center hits lose power and spray. Feet and tracking matter more than on an oversize.",
      practice: [
        "Split-step + first step drills so you arrive balanced at waist–chest height",
        "Catch feeds on the strings’ center — freeze at contact and check the mark",
        "Avoid reaching up to neck-high balls; step in or take a compact slice",
      ],
    });
  }
  if (sw >= 328 || wt >= 320) {
    tips.push({
      title: "Heavy plow, slow prep",
      holdingBack:
        "Late on wide balls and short angles — the tip lags if the turn starts late.",
      practice: [
        "Earlier shoulder turn on every ball (racquet tip back before the bounce)",
        "Defensive feeds: use a shorter takeback; don’t try to whip a tour SW late",
        "If still late, consider 2–3 g handle tape or a lighter daily frame for footwork days",
      ],
    });
  }
  if (sw <= 305 && wt < 295) {
    tips.push({
      title: "Light / unstable through contact",
      holdingBack:
        "The hoop can twist or push back on heavy balls — plow is on you (technique or tip mass).",
      practice: [
        "Firm the wrist through contact on pace; don’t ‘give’ with the hand",
        "Practice absorbing pace with a compact block then reshaping",
        "Gear fix if needed: +2–4 g at 12 or 3/9 after the technique week",
      ],
    });
  }
  if (ra != null && ra >= 68 && (scores.comfort ?? 50) <= 55) {
    tips.push({
      title: "Stiff shock path",
      holdingBack:
        "Arm and timing suffer when you muscle or mistime — the frame reports every miss.",
      practice: [
        "Loosen the grip pressure to ~3/10 until after contact",
        "Prefer catching the ball in front so you don’t wrist the stiff tip",
        "Soften the bed (−2 lbs / multi hybrid) before adding tip tape",
      ],
    });
  }
  if (launch != null && launch <= 5.5) {
    tips.push({
      title: "Low net margin",
      holdingBack:
        `Leave is only ~${launch.toFixed(1)}° — little room over the net. Late or waist-low contact often dumps into the net.`,
      practice: [
        `Own the ${path >= 22 ? "chest" : "waist–chest"} window — don’t scoop lows`,
        "On stretch, aim higher or shape more instead of forcing a low drive",
        "Still dumping clean hits? −1–2 lbs or a little tip mass raises the path over the net",
      ],
    });
  }
  if (launch != null && launch >= 10) {
    tips.push({
      title: "High net margin",
      holdingBack:
        `Leave is ~${launch.toFixed(1)}° — lots of room over the net, so open faces or over-brushing float long.`,
      practice: [
        "Finish more forward / slightly more closed face on flat targets",
        "Alternate shape vs drive every other feed to learn the window",
        "Long on center hits? +1–2 lbs or strip tip grams",
      ],
    });
  }

  return tips.slice(0, 4);
}

function buildScienceNotes(input: {
  racket: RacketProfile | null | undefined;
  string: StringProfile | null | undefined;
  tensionLbs: number | null | undefined;
  gaugeMm: number | null | undefined;
  launchAngleDeg: number | null;
  swingPathDeg: number | null;
  deltas: {
    stringLaunch: number;
    gripLaunch: number;
    tapeLaunch: number;
    stringPath: number;
    tapePath: number;
  };
  gripBuildNote: string | null;
  flight: FlightMetrics | null;
  forehand: ForehandMoldAdvice | null;
  scores: {
    power: number | null;
    spin: number | null;
    control: number | null;
    comfort: number | null;
  };
  stockScores: {
    power: number | null;
    spin: number | null;
    control: number | null;
    comfort: number | null;
  };
}): string[] {
  const notes: string[] = [];
  const r = input.racket;

  if (r) {
    const ra = r.stiffnessRa;
    if (ra != null) {
      const band = ra >= 68 ? "stiff" : ra <= 62 ? "flexible" : "mid-stiff";
      notes.push(
        `Stiffness RA ${ra} (${band}). ${
          band === "stiff"
            ? "Crisp pop, more shock — soften the bed before tip tape if your arm complains."
            : band === "flexible"
              ? "More pocket and comfort; raise tension or use firmer poly if you want sharper response."
              : "Balanced energy return — tension ±2 lbs is your main feel dial."
        }`,
      );
    }

    const sw = r.swingweight;
    if (sw != null) {
      const band = sw >= 325 ? "plow-heavy" : sw <= 310 ? "whippy" : "midweight swing";
      notes.push(
        `Swingweight ${sw} (${band}). ${
          band === "plow-heavy"
            ? "Stable through contact; tip tape adds plow fast — add small doses."
            : band === "whippy"
              ? "Easy to accelerate; +2–4 g tip builds plow without resizing the frame."
              : "Room to customize: tip grams → plow; handle grams → quicker whip."
        }`,
      );
    }

    if (r.stringPattern) {
      const pat = r.stringPattern.replace(/\s/g, "").toLowerCase();
      const dense = pat.startsWith("18x20") || pat.startsWith("18×20");
      const open = pat.startsWith("16x19") || pat.startsWith("16×19");
      notes.push(
        `Pattern ${r.stringPattern} (${dense ? "dense / control-leaning" : open ? "open / spin-leaning" : "mixed"}). ${
          dense
            ? "Less free string snap-back — use −1–2 lbs or thinner gauge if you want more bite."
            : open
              ? "More bite and launch — use +1–2 lbs or thicker gauge if balls spray long."
              : "Treat tension as the fine dial for spin vs control."
        }`,
      );
    }
  }

  if (input.string && input.tensionLbs != null) {
    const mid = input.string.recommendedTensionLbs;
    const d = input.tensionLbs - mid;
    const band =
      Math.abs(d) < 1.5 ? "on midpoint" : d > 0 ? "firmer than midpoint" : "softer than midpoint";
    notes.push(
      `Tension ${input.tensionLbs} lbs — ${band} (ref ${mid}${d !== 0 ? `, ${d > 0 ? "+" : ""}${d} lbs` : ""}). ${
        d >= 2
          ? "Shorter dwell, flatter launch, more control — good if you were sailing."
          : d <= -2
            ? "Longer pocket, higher launch, more comfort — good if you were dumping short."
            : "Neutral starting point; ±2 lbs is a clean A/B feel step."
      }`,
    );
    if (input.gaugeMm != null) {
      const g = input.gaugeMm;
      const band = g <= 1.2 ? "thin" : g >= 1.3 ? "thick" : "mid";
      notes.push(
        `Gauge ${g} mm (${band}). ${
          band === "thin"
            ? "More bite and pocket; expect faster notching."
            : band === "thick"
              ? "Firmer control and longer life; slightly less free spin."
              : "Balanced durability vs bite for poly."
        }`,
      );
    }
  }

  if (input.gripBuildNote) {
    // Prefer a shorter “your build is X” line if the stack note is already specific
    notes.push(`Handle: ${input.gripBuildNote}`);
  }

  if (input.launchAngleDeg != null && input.swingPathDeg != null) {
    const leave = input.launchAngleDeg;
    const path = input.swingPathDeg;
    const clear = input.flight?.netClearIn;
    const leaveBand =
      leave <= 6 ? "low net margin" : leave >= 10 ? "high net margin" : "balanced net margin";
    const pathBand =
      path >= 28 ? "steep spin path" : path >= 20 ? "modern low→high path" : "flatter drive path";

    notes.push(
      `Flight model: ${leave.toFixed(1)}° leave (${leaveBand}${clear != null ? `, ~+${clear}" over the net on a clean center hit` : ""}). ${
        leaveBand === "low net margin"
          ? "Balls leave the strings on a low path — late or low contact often goes into the net."
          : leaveBand === "high net margin"
            ? "Lots of room over the net — open faces or over-brushing often float long."
            : "Enough room over the net on clean hits; keep face honest through contact."
      } Clearance is a coaching estimate from leave/path — not a lab trajectory.`,
    );
    notes.push(
      `Spin path: ~${path.toFixed(0)}° (${pathBand}). ${
        pathBand.startsWith("steep")
          ? "Brush loads topspin that pulls the ball down after the net — don’t slap flat."
          : pathBand.startsWith("modern")
            ? "Mix of drive and shape; topspin is the drop after the net, leave is the clearance."
            : "Penetrating flight with less free drop — aim and face angle matter more for depth."
      }`,
    );

    if (input.flight) {
      const f = input.flight;
      notes.push(
        `This setup’s clean-hit profile: plow ${f.plow}/100 · topspin ${f.topspin}/100 · depth ${f.depth}/100 · fly risk ${f.flyRisk}/100.`,
      );
    }
  }

  if (input.forehand) {
    const fh = input.forehand;
    notes.push(
      `Forehand for this mold: ${fh.gripLabel.toLowerCase()} (bevel ${fh.bevel}) with a ${fh.face.label.toLowerCase()} (~${fh.face.closedDeg}° past vertical — coaching estimate) at ${fh.prefersHeight}-high contact.`,
    );
  }

  // Concise need / don't-need judgments
  const need: string[] = [];
  const skip: string[] = [];
  if (input.launchAngleDeg != null && input.launchAngleDeg <= 6) {
    need.push("More net clearance (−1–2 lbs or light tip mass) if clean hits dump short");
  } else if (input.launchAngleDeg != null && input.launchAngleDeg >= 10) {
    need.push("Tighter depth control (+1–2 lbs or less tip mass) if center hits sail");
  } else {
    skip.push("Big leave changes — window is already balanced");
  }
  if (input.racket?.stiffnessRa != null && input.racket.stiffnessRa >= 68) {
    need.push("Softer bed before stacking tip tape (stiff RA)");
  }
  if (
    input.scores.comfort != null &&
    input.scores.comfort <= 45
  ) {
    need.push("Comfort lever (−2 lbs / thicker gauge / handle mass over tip)");
  } else if (input.scores.comfort != null && input.scores.comfort >= 75) {
    skip.push("Extra cushion layers — comfort is already high");
  }
  if (input.swingPathDeg != null && input.swingPathDeg >= 26 && (input.scores.spin ?? 0) < 65) {
    need.push("Spin bed help (shaped poly / thinner gauge) to match the steep path");
  }
  if (need.length || skip.length) {
    const parts: string[] = [];
    if (need.length) parts.push(`Focus on: ${need.join("; ")}.`);
    if (skip.length) parts.push(`Skip for now: ${skip.join("; ")}.`);
    notes.push(parts.join(" "));
  }

  if (input.scores.power != null && input.stockScores.power != null) {
    const dP = input.scores.power - input.stockScores.power;
    const dS =
      input.scores.spin != null && input.stockScores.spin != null
        ? input.scores.spin - input.stockScores.spin
        : 0;
    const dC =
      input.scores.control != null && input.stockScores.control != null
        ? input.scores.control - input.stockScores.control
        : 0;
    if (Math.abs(dP) + Math.abs(dS) + Math.abs(dC) >= 1.5) {
      notes.push(
        `Molded vs stock frame: power ${input.stockScores.power}→${input.scores.power} (${fmtSigned(dP)}) · spin ${input.stockScores.spin}→${input.scores.spin} (${fmtSigned(dS)}) · control ${input.stockScores.control}→${input.scores.control} (${fmtSigned(dC)}) from string, grip, and tape.`,
      );
    }
  }

  const totalLaunch =
    input.deltas.stringLaunch + input.deltas.gripLaunch + input.deltas.tapeLaunch;
  if (Math.abs(totalLaunch) >= 0.3 && input.launchAngleDeg != null) {
    notes.push(
      `Leave vs stock frame: ${fmtSigned(totalLaunch)}° total (string ${fmtSigned(input.deltas.stringLaunch)}, grip ${fmtSigned(input.deltas.gripLaunch)}, tape ${fmtSigned(input.deltas.tapeLaunch)}).`,
    );
  }

  return notes;
}

/**
 * Clone MySetup with a candidate string (and optional tension/gauge) so
 * synthesizeCombinedSetup can recompute the full mold — including lead tape.
 */
export function previewSetupWithString(
  setup: MySetup,
  string: StringProfile,
  opts?: { tensionLbs?: number | null; gaugeMm?: number | null },
): MySetup {
  const tension =
    opts?.tensionLbs !== undefined && opts.tensionLbs != null
      ? opts.tensionLbs
      : (setup.tensionLbs ?? string.recommendedTensionLbs);
  const gauge =
    opts?.gaugeMm !== undefined
      ? opts.gaugeMm
      : (setup.gaugeMm ?? string.gaugesMm[0] ?? null);
  const bed = tensionOutcome(string, tension, gauge ?? undefined);
  return {
    ...setup,
    stringId: string.id,
    stringLabel: equipmentLabel(string.brand, string.name),
    tensionLbs: tension,
    gaugeMm: gauge,
    stringPower: bed.power,
    stringSpin: bed.spin,
    stringControl: bed.control,
    stringComfort: bed.comfort,
  };
}

