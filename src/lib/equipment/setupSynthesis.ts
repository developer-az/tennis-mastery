import type { GripProfile, RacketProfile, StringProfile } from "@/types/equipment";
import type { MySetup } from "@/store/gearStore";
import { computeLeadTapeEffect } from "@/lib/equipment/leadTape";
import { derivePlayerFit } from "@/lib/equipment/playerFit";
import { tensionOutcome } from "@/lib/equipment/strings";

export interface ScoreTuneTip {
  score: "power" | "spin" | "control" | "comfort";
  current: number | null;
  verdict: "low" | "ok" | "high";
  /** What to do to move this score toward a more "perfect" mold for the user's role */
  raise: string[];
  lower: string[];
  /** Physics / lab-style tradeoff */
  tradeoff: string;
  science: string;
}

export interface CombinedSetupInsight {
  hasAny: boolean;
  hasRacket: boolean;
  hasString: boolean;
  hasGrip: boolean;
  hasTape: boolean;
  /** Composite launch after racket + string tension/gauge + grip + tape. */
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
  playstyle: string;
  playstyleDetail: string;
  pros: string[];
  cons: string[];
  /** Actionable levers to perfect each molded score + science tradeoffs */
  tuneTips: ScoreTuneTip[];
  scienceNotes: string[];
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

function avg(
  parts: { v: number; w: number }[],
): number | null {
  let sum = 0;
  let w = 0;
  for (const p of parts) {
    if (!Number.isFinite(p.v) || p.w <= 0) continue;
    sum += p.v * p.w;
    w += p.w;
  }
  return w > 0 ? Math.round(sum / w) : null;
}

/** String bed → launch/path offsets from tension, gauge, and material. */
export function stringLaunchOffsets(
  string: StringProfile,
  tensionLbs: number,
  gaugeMm?: number,
): { launch: number; path: number; hint: string } {
  const o = tensionOutcome(string, tensionLbs, gaugeMm);
  const [lo, hi] = string.tensionRangeLbs;
  const mid = string.recommendedTensionLbs;
  const span = Math.max(4, (hi - lo) / 2);
  const delta = (tensionLbs - mid) / span; // soft −1 … tight +1

  // Soft beds loft; tight beds flatten. Polys start flatter than multi/gut.
  const materialBias: Record<StringProfile["material"], number> = {
    polyester: -0.35,
    "co-poly": -0.2,
    hybrid: 0,
    multifilament: 0.45,
    "synthetic-gut": 0.35,
    "natural-gut": 0.55,
  };
  const launch = round1(-delta * 1.15 + materialBias[string.material] + (o.spin - 55) * 0.008);
  const path = round1(-delta * 0.6 + (string.shape !== "round" ? 0.8 : 0) + (o.spin - 55) * 0.02);
  return { launch, path, hint: o.launchHint };
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
): CombinedSetupInsight {
  const pieces = setup.leadTape?.pieces ?? [];
  const hasRacket = Boolean(setup.racketSlug || racket);
  const hasString = Boolean(setup.stringId || string);
  const hasGrip = Boolean(setup.gripId || grip);
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
    // Fallback when catalog row missing: soft power bias → loft
    stringLaunch = round1(((setup.stringPower ?? 50) - 50) * 0.02);
    stringPath = round1(((setup.stringSpin ?? 50) - 50) * 0.025);
  }

  let gripLaunch = 0;
  if (grip) {
    gripLaunch = gripLaunchOffset(grip);
  } else if (setup.gripCushion != null) {
    gripLaunch = round1(((setup.gripCushion ?? 50) - 50) * 0.008);
  }

  let tapeLaunch = 0;
  let tapePath = 0;
  let tapeHints: string[] = [];
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

  const power = avg([
    { v: racket?.power ?? setup.racketPower ?? NaN, w: 0.5 },
    { v: string ? tensionOutcome(string, setup.tensionLbs ?? string.recommendedTensionLbs, setup.gaugeMm ?? undefined).power : (setup.stringPower ?? NaN), w: 0.4 },
    { v: setup.gripCushion ?? grip?.cushion ?? NaN, w: 0.1 },
  ]);
  const spin = avg([
    { v: racket?.spin ?? setup.racketSpin ?? NaN, w: 0.45 },
    {
      v: string
        ? tensionOutcome(string, setup.tensionLbs ?? string.recommendedTensionLbs, setup.gaugeMm ?? undefined).spin
        : (setup.stringSpin ?? NaN),
      w: 0.5,
    },
    { v: 50, w: 0.05 },
  ]);
  const control = avg([
    { v: racket?.control ?? setup.racketControl ?? NaN, w: 0.5 },
    {
      v: string
        ? tensionOutcome(string, setup.tensionLbs ?? string.recommendedTensionLbs, setup.gaugeMm ?? undefined).control
        : (setup.stringControl ?? NaN),
      w: 0.4,
    },
    { v: grip?.tackiness ?? setup.gripTackiness ?? NaN, w: 0.1 },
  ]);
  const comfort = avg([
    { v: racket?.comfort ?? setup.racketComfort ?? NaN, w: 0.35 },
    {
      v: string
        ? tensionOutcome(string, setup.tensionLbs ?? string.recommendedTensionLbs, setup.gaugeMm ?? undefined).comfort
        : (setup.stringComfort ?? NaN),
      w: 0.4,
    },
    { v: grip?.cushion ?? setup.gripCushion ?? NaN, w: 0.25 },
  ]);

  const fit = racket ? derivePlayerFit(racket) : null;
  const playstyle = buildPlaystyle({
    racketStyle: racket?.style ?? null,
    fitRole: fit?.courtRole ?? null,
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
  });

  const scienceNotes = buildScienceNotes({
    racket,
    string,
    tensionLbs: setup.tensionLbs,
    gaugeMm: setup.gaugeMm,
    launchAngleDeg,
    swingPathDeg,
    deltas: { stringLaunch, gripLaunch, tapeLaunch, stringPath, tapePath },
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
      `${string.brand} ${string.name}${gauge != null ? ` ${gauge}mm` : ""} @ ${setup.tensionLbs} lbs — ${o.dwellHint}`,
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

  if (grip) {
    pros.push(
      `${grip.brand} ${grip.name}: tack ${grip.tackiness} · cushion ${grip.cushion} · absorb ${grip.absorbency} · durability ${grip.durability}.`,
    );
    if (gripLaunch !== 0) {
      pros.push(
        `Grip feel bias ~${gripLaunch >= 0 ? "+" : ""}${gripLaunch}° launch (cushion/tack path into the hand).`,
      );
    }
    if (grip.tackiness >= 70) pros.push("High tack — secure on sweat; replace when glaze appears.");
    if (grip.cushion >= 70) pros.push("High cushion — softer shock; may mute feedback slightly.");
    if (grip.absorbency >= 70) pros.push("High absorbency — lasts longer in heat before slip.");
    if (grip.durability <= 45) cons.push("Low grip durability — budget frequent replacements or a tougher overgrip.");
    if (grip.tackiness <= 40) cons.push("Low tack — dry/tour hold; add a tackier overgrip if the handle spins.");
    if (grip.thicknessMm != null && grip.thicknessMm >= 0.7) {
      cons.push(`Thick overgrip (${grip.thicknessMm} mm) — builds handle size; strip if the bevels feel round.`);
    }
  } else if (!hasGrip) {
    cons.push("No grip saved — handle size and sweat management are unknown levers.");
  }

  if (hasTape) {
    const g = pieces.reduce((n, p) => n + p.massG, 0);
    pros.push(`Lead tape +${round1(g)}g across ${pieces.length} piece${pieces.length === 1 ? "" : "s"}.`);
    for (const h of tapeHints.slice(0, 3)) pros.push(h);
    if (Math.abs(tapeLaunch) >= 0.15 || Math.abs(tapePath) >= 0.2) {
      pros.push(
        `Tape vs stock: launch ${tapeLaunch >= 0 ? "+" : ""}${tapeLaunch}° · path ${tapePath >= 0 ? "+" : ""}${tapePath}°.`,
      );
    }
    if (g >= 8) {
      cons.push("Heavy customization (≥8g) — SW jump can fatigue the arm; try −2g or move mass toward the handle.");
    }
    if (g > 0 && g < 2) {
      pros.push("Light tape dose — good for A/B testing tip vs handle without remolding the frame.");
    }
  } else if (hasRacket) {
    cons.push("No lead tape — tip/handle mass is still a free lever for plow vs whip.");
  }

  if (launchAngleDeg != null && swingPathDeg != null) {
    pros.push(
      `Composite teaching now: ~${launchAngleDeg}° leave / ~${swingPathDeg}° path (frame + string + grip + tape).`,
    );
    if (launchAngleDeg >= 10) {
      cons.push(
        "Composite leave is lofty — if balls sail, +1–2 lbs tension or less tip weight is the first accountable cut.",
      );
    } else if (launchAngleDeg <= 6) {
      cons.push(
        "Composite leave is flat — if you clip the tape, −1–2 lbs or a touch more tip mass opens the window.",
      );
    }
  }

  if (!hasRacket) {
    cons.push("No racket saved — composite launch needs a frame as the base.");
  }

  if (pros.length === 0 && hasAny) {
    pros.push("Setup pieces saved — add more components for a fuller composite read.");
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
    playstyle: playstyle.label,
    playstyleDetail: playstyleDetail,
    pros,
    cons,
    tuneTips,
    scienceNotes,
    scores: { power, spin, control, comfort },
    summary: summaryParts.join(" · ") || "No gear saved yet.",
    completeness,
  };
}

function buildPlaystyle(input: {
  racketStyle: string | null;
  fitRole: string | null;
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

  // Prefer fit role (now more specific); only override when composite scores clearly shift the mold
  let core = input.fitRole ?? "Balanced all-courter";

  if (s != null && p != null && s >= 74 && s >= (c ?? 50) + 6 && (path == null || path >= 24)) {
    core = "Heavy-spin baseliner";
  } else if (s != null && c != null && s >= 68 && c >= 68 && Math.abs(s - c) <= 8) {
    core = "Shape-and-control baseliner";
  } else if (c != null && p != null && c >= 74 && c >= p + 8) {
    core = path != null && path <= 16 ? "Precision / flat-drive" : "Precision baseliner";
  } else if (p != null && p >= 74 && (c ?? 50) <= 60) {
    core = "First-strike power";
  } else if (launch != null && launch >= 10 && (s ?? 50) >= 68) {
    core = "High-margin spinner";
  } else if (launch != null && launch <= 6 && (c ?? 50) >= 68) {
    core = "Low-launch penetrator";
  } else if (input.racketStyle && !/balanced|versatile|modern frame/i.test(input.racketStyle)) {
    // Keep a specific catalog style if fit didn't already specialize
    if (core === "Balanced all-courter" || core === "Net-transition all-courter") {
      core = input.racketStyle.length < 42 ? input.racketStyle : core;
    }
  }

  const tags: string[] = [core];
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
  if (input.fit) bits.push(input.fit.blurb);
  else bits.push(`Mold reads as ${input.playstyleLabel}.`);

  if (input.launchAngleDeg != null && input.swingPathDeg != null) {
    const dLaunch =
      input.baseLaunch != null ? input.launchAngleDeg - input.baseLaunch : null;
    bits.push(
      `Combined strike window ~${input.launchAngleDeg.toFixed(1)}° off the bed / ~${input.swingPathDeg.toFixed(0)}° path` +
        (dLaunch != null && Math.abs(dLaunch) >= 0.2
          ? ` (${dLaunch >= 0 ? "+" : ""}${dLaunch.toFixed(1)}° vs stock frame from string/grip/tape).`
          : "."),
    );
  }
  const moldParts: string[] = [];
  if (Math.abs(input.deltas.stringLaunch) >= 0.15 || Math.abs(input.deltas.stringPath) >= 0.2) {
    moldParts.push(
      `string ${input.deltas.stringLaunch >= 0 ? "+" : ""}${input.deltas.stringLaunch}° launch / ${input.deltas.stringPath >= 0 ? "+" : ""}${input.deltas.stringPath}° path`,
    );
  }
  if (Math.abs(input.deltas.tapeLaunch) >= 0.15 || Math.abs(input.deltas.tapePath) >= 0.2) {
    moldParts.push(
      `tape ${input.deltas.tapeLaunch >= 0 ? "+" : ""}${input.deltas.tapeLaunch}° / ${input.deltas.tapePath >= 0 ? "+" : ""}${input.deltas.tapePath}°`,
    );
  }
  if (moldParts.length) bits.push(`Mold deltas: ${moldParts.join("; ")}.`);

  if (input.string && input.tensionLbs != null) {
    const g = input.gaugeMm != null ? ` · ${input.gaugeMm} mm` : "";
    bits.push(`${input.string.brand} ${input.string.name} @ ${input.tensionLbs} lbs${g} — ${input.string.bestFor}`);
  }
  if (input.grip) bits.push(`Grip: ${input.grip.bestFor}`);
  return bits.filter(Boolean).join(" ");
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
}): ScoreTuneTip[] {
  const role = input.role.toLowerCase();
  const wantsSpin = /spin|shape|rpms|baseliner/.test(role);
  const wantsControl = /precision|control|counter|volley/.test(role);
  const wantsPower = /power|first-strike|forgiving/.test(role);

  const spinLow = wantsSpin ? 70 : 55;
  const spinHigh = wantsSpin ? 92 : 82;
  const ctlLow = wantsControl ? 70 : 55;
  const ctlHigh = wantsControl ? 90 : 82;
  const pwrLow = wantsPower ? 68 : 52;
  const pwrHigh = wantsPower ? 90 : 80;

  return [
    {
      score: "spin",
      current: input.spin,
      verdict: verdictFor(input.spin, spinLow, spinHigh),
      raise: [
        "−1–2 lbs tension (more snap-back dwell)",
        "Thinner gauge (−0.05 mm) if durability allows",
        "Shaped / textured poly mains",
        "+2–4 g at 12 o’clock for plow into the brush",
      ],
      lower: [
        "+1–2 lbs tension",
        "Thicker gauge or denser pattern feel",
        "Rounder poly / multi hybrid",
        "Strip tip mass if the face feels tip-heavy and grabby",
      ],
      tradeoff:
        "More spin usually costs some control on flat redirects and can loft launch if the face stays open.",
      science:
        "Spin rises when mains can stretch & snap back (lower tension, thinner gauge, shaped profile) while the hoop still digs into the ball — SW at 12 supports that without changing string friction.",
    },
    {
      score: "control",
      current: input.control,
      verdict: verdictFor(input.control, ctlLow, ctlHigh),
      raise: [
        "+1–3 lbs toward the top of the string’s range",
        "Thicker gauge or 18×20-style denser response",
        "Lower-powered poly (ALU / 4G family)",
        "Less tip mass / a touch of handle tape",
      ],
      lower: [
        "−2 lbs if the bed feels boardy and depth dies",
        "Thinner gauge or more open pattern feel",
        "Softer multi/gut in crosses",
      ],
      tradeoff:
        "Chasing control flattens the pocket — depth and comfort drop unless your timing is already early and clean.",
      science:
        "Higher tension + thicker mains shorten dwell time (less trampoline), so launch angle falls and directional errors shrink — until the bed is so firm you mistime and dump short.",
    },
    {
      score: "power",
      current: input.power,
      verdict: verdictFor(input.power, pwrLow, pwrHigh),
      raise: [
        "−1–2 lbs or a livelier gauge",
        "Softer multi / gut hybrid",
        "+2–3 g tip / 12 for plow-through",
        "Slightly more open stringbed personality",
      ],
      lower: [
        "+2 lbs tension",
        "Control poly / thicker gauge",
        "Handle-side tape to quiet tip-heavy trampoline",
      ],
      tradeoff:
        "Free power lengthens the ball — if you’re already long, add control levers before adding tip mass.",
      science:
        "Power ≈ COR of the bed × effective mass at impact. Soft tension and tip mass both raise outbound speed; spin path is what keeps that speed from sailing long.",
    },
    {
      score: "comfort",
      current: input.comfort,
      verdict: verdictFor(input.comfort, 48, 88),
      raise: [
        "−2 lbs or thicker gauge on a stiff poly",
        "Multi/gut hybrid or softer co-poly",
        "Cushioned overgrip / replacement grip",
        "Avoid stacking tip mass on an already stiff RA frame",
      ],
      lower: [
        "Only if the bed feels muted — +1 lb or a firmer poly",
        "Thinner, tackier overgrip for more feedback",
      ],
      tradeoff:
        "Comfort softens feedback — some players lose the ‘connected’ hit cue they use for timing.",
      science:
        "Peak force into the arm tracks dynamic stiffness (RA + string bed). Tension and material change bed stiffness faster than lead tape; tape mainly changes SW and plow.",
    },
  ];
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
}): string[] {
  const notes: string[] = [];
  if (input.racket) {
    const ra = input.racket.stiffnessRa;
    const sw = input.racket.swingweight;
    if (ra != null) {
      notes.push(
        `Frame RA ${ra}: higher RA → faster energy return, sharper shock. Soften the bed before adding tip mass if your arm complains.`,
      );
    }
    if (sw != null) {
      notes.push(
        `Swingweight ${sw}: ~1 g at the tip ≈ +2–3 SW points. Tip mass raises plow and can flatten perceived launch; handle mass does the opposite for whip.`,
      );
    }
    if (input.racket.stringPattern) {
      notes.push(
        `Pattern ${input.racket.stringPattern}: denser beds reduce string movement (less free spin, more control); open beds do the reverse — tension is your fine dial inside that.`,
      );
    }
  }
  if (input.string && input.tensionLbs != null) {
    const mid = input.string.recommendedTensionLbs;
    const d = input.tensionLbs - mid;
    notes.push(
      `Tension ${input.tensionLbs} lbs vs midpoint ${mid}: ${d === 0 ? "on reference" : d > 0 ? `+${d} lbs firmer` : `${d} lbs softer`} — each ~2 lbs is a noticeable dwell/launch step on poly.`,
    );
    if (input.gaugeMm != null) {
      notes.push(
        `Gauge ${input.gaugeMm} mm: thinner → more bite & pocket, less durability; thicker → firmer control and longer life.`,
      );
    }
  }
  if (input.launchAngleDeg != null && input.swingPathDeg != null) {
    notes.push(
      `Flight: leave angle clears the tape; path angle (spin) is the restoring force that drops the ball. Tuning one without the other is why “more spin” can still sail or dump.`,
    );
  }
  const totalLaunch =
    input.deltas.stringLaunch + input.deltas.gripLaunch + input.deltas.tapeLaunch;
  if (Math.abs(totalLaunch) >= 0.3) {
    notes.push(
      `Your mold shifts stock leave by ${totalLaunch >= 0 ? "+" : ""}${totalLaunch.toFixed(1)}° (string ${input.deltas.stringLaunch >= 0 ? "+" : ""}${input.deltas.stringLaunch}, grip ${input.deltas.gripLaunch >= 0 ? "+" : ""}${input.deltas.gripLaunch}, tape ${input.deltas.tapeLaunch >= 0 ? "+" : ""}${input.deltas.tapeLaunch}).`,
    );
  }
  return notes;
}
