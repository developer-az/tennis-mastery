import type { GripProfile, RacketProfile, StringProfile } from "@/types/equipment";
import type { MySetup } from "@/store/gearStore";
import { computeLeadTapeEffect } from "@/lib/equipment/leadTape";
import { derivePlayerFit } from "@/lib/equipment/playerFit";
import { tensionOutcome } from "@/lib/equipment/strings";

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
    hasTape,
    tipHeavy: tapeLaunch < -0.15,
    handleHeavy: tapeLaunch > 0.1,
    stringMaterial: string?.material ?? null,
  });
  const playstyleDetail = buildPlaystyleDetail({
    fit,
    launchAngleDeg,
    swingPathDeg,
    string,
    tensionLbs: setup.tensionLbs,
    grip,
  });

  const pros: string[] = [];
  const cons: string[] = [];

  if (racket) {
    if (racket.spin >= 72) pros.push(`Frame leans spin (${racket.spin}/100) — helps shape and net clearance.`);
    if (racket.control >= 72) pros.push(`Control-forward frame (${racket.control}/100) — rewards clean contact.`);
    if (racket.power >= 72) pros.push(`Easy depth from the frame (${racket.power}/100 power).`);
    if (racket.comfort >= 70) pros.push(`Comfortable stock feel (${racket.comfort}/100).`);
    if ((racket.weightG ?? 300) >= 320) cons.push("Heavier frame — more plow, but harder to whip on short balls.");
    if ((racket.weightG ?? 300) < 290) cons.push("Light frame — easy to swing, less inherent plow-through.");
    if (racket.control <= 55 && racket.power >= 70) {
      cons.push("Power-biased frame can spray if contact is late — string/tension matter more.");
    }
  } else if (hasRacket && setup.racketLabel) {
    pros.push(`Saved frame: ${setup.racketLabel}.`);
  }

  if (string && setup.tensionLbs != null) {
    const o = tensionOutcome(string, setup.tensionLbs, setup.gaugeMm ?? undefined);
    pros.push(`${string.brand} ${string.name} @ ${setup.tensionLbs} lbs — ${o.dwellHint}`);
    if (stringHint) pros.push(stringHint);
    if (o.comfort <= 45) cons.push("Firm bed — arm-friendly players may want softer tension or multi/gut.");
    if (o.durability <= 45) cons.push("Softer/thinner bed may notch or lose tension sooner.");
    if (o.spin >= 72) pros.push("String bed favors snap-back / spin window.");
  } else if (!hasString) {
    cons.push("No string saved — launch and pocket feel are incomplete without a bed.");
  }

  if (grip) {
    if (grip.tackiness >= 70) pros.push(`Tacky grip (${grip.name}) — secure handle on sweaty days.`);
    if (grip.cushion >= 70) pros.push(`Cushioned grip — softer shock path into the hand.`);
    if (grip.absorbency >= 70) pros.push("High absorbency — stays playable longer in heat.");
    if (grip.durability <= 45) cons.push("Grip may wear or lose tack quickly — plan to replace often.");
    if (grip.tackiness <= 40) cons.push("Low tack — may slip unless you like a dry/tour hold.");
  } else if (!hasGrip) {
    cons.push("No grip saved — handle feel and sweat management are unknown.");
  }

  if (hasTape) {
    const g = pieces.reduce((n, p) => n + p.massG, 0);
    pros.push(`Lead tape (+${round1(g)}g) customizes SW/balance.`);
    for (const h of tapeHints.slice(0, 2)) pros.push(h);
    if (Math.abs(tapeLaunch) >= 0.3) {
      pros.push(
        `Tape shifts launch ~${tapeLaunch > 0 ? "+" : ""}${tapeLaunch}° vs stock frame.`,
      );
    }
    if (g >= 8) cons.push("Heavy customization — swingweight jump can tire the arm on long sessions.");
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
  hasTape: boolean;
  tipHeavy: boolean;
  handleHeavy: boolean;
  stringMaterial: StringProfile["material"] | null;
}): { label: string } {
  const { power: p, spin: s, control: c } = input;
  let core =
    input.fitRole ??
    (input.racketStyle && input.racketStyle.length < 40 ? input.racketStyle : null) ??
    "Modern all-court";

  if (s != null && p != null && s >= 72 && p >= 62) core = "Heavy-spin baseliner";
  else if (c != null && p != null && c >= 72 && p <= 65) core = "Precision all-courter";
  else if (p != null && p >= 74 && (c ?? 50) <= 62) core = "Power first-striker";
  else if (s != null && c != null && s >= 68 && c >= 68) core = "Shape-and-control baseliner";

  const tags: string[] = [core];
  if (input.stringMaterial === "polyester" || input.stringMaterial === "co-poly") {
    tags.push("poly pocket");
  } else if (input.stringMaterial === "natural-gut" || input.stringMaterial === "multifilament") {
    tags.push("soft bed");
  }
  if (input.tipHeavy) tags.push("tip-weighted");
  if (input.handleHeavy) tags.push("handle-weighted");
  if (input.hasTape && !input.tipHeavy && !input.handleHeavy) tags.push("custom balance");

  return { label: tags.join(" · ") };
}

function buildPlaystyleDetail(input: {
  fit: ReturnType<typeof derivePlayerFit> | null;
  launchAngleDeg: number | null;
  swingPathDeg: number | null;
  string: StringProfile | null | undefined;
  tensionLbs: number | null | undefined;
  grip: GripProfile | null | undefined;
}): string {
  const bits: string[] = [];
  if (input.fit) bits.push(input.fit.blurb);
  if (input.launchAngleDeg != null && input.swingPathDeg != null) {
    bits.push(
      `Combined window ~${input.launchAngleDeg.toFixed(1)}° launch / ~${input.swingPathDeg.toFixed(0)}° swing path.`,
    );
  }
  if (input.string && input.tensionLbs != null) {
    bits.push(`${input.string.bestFor}`);
  }
  if (input.grip) bits.push(input.grip.bestFor);
  return bits.filter(Boolean).join(" ");
}
