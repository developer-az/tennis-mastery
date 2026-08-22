/**
 * Strokeform Frame & String Intelligence
 * --------------------------------------
 * Proprietary coaching analysis layered on multi-source equipment data.
 * Sources are aggregated; interpretations (quirks, skill ceiling, archetypes)
 * are Strokeform-specific — not a paste of retailer blurbs.
 */

import type { RacketProfile, StringProfile } from "@/types/equipment";
import { twImageMeta } from "@/lib/equipment/media/externalImages";
import { derivePlayerFit, type CourtRole, type SkillBand } from "@/lib/equipment/playerFit";

export type DataSourceId =
  | "racqix-specs"
  | "racqix-expert"
  | "tour-usage"
  | "strokeform-physics"
  | "strokeform-quirks"
  | "strokeform-string-lab"
  | "tennis-warehouse-media";

export interface DataSourceCredit {
  id: DataSourceId;
  label: string;
  role: string;
  confidence: number; // 0–100
}

export interface FrameQuirk {
  id: string;
  title: string;
  /** What the spec actually does on court */
  meaning: string;
  /** How a player should adapt — learning cue */
  coaching: string;
  polarity: "strength" | "tradeoff" | "demand";
}

export type PlayerArchetype =
  | "Western spin sculptor"
  | "Semi-western shape driver"
  | "Flat first-strike aggressor"
  | "Redirect counterpuncher"
  | "Precision line-hitter"
  | "Transition finisher"
  | "Serve-first net hunter"
  | "Arm-friendly depth seeker"
  | "Dense-pattern technician"
  | "Open-pattern whip artist"
  | "Modern all-court shaper";

export interface SkillSpan {
  /** How easy it is to get balls deep / in play */
  floor: number;
  /** How far into competitive tennis the frame still rewards you */
  ceiling: number;
  /** How harshly it punishes late / off-center contact */
  demand: number;
  band: SkillBand;
  label: string;
}

export interface FrameIntelligence {
  slug: string;
  sources: DataSourceCredit[];
  trustScore: number;
  skill: SkillSpan;
  primaryArchetype: PlayerArchetype;
  secondaryArchetype: PlayerArchetype | null;
  courtRole: CourtRole;
  quirks: FrameQuirk[];
  specialHeadline: string;
  specialBody: string;
  skipIf: string[];
  stringPairing: string;
  tourSignal: string | null;
  ratings: {
    plow: number;
    whip: number;
    forgiveness: number;
    spinCeiling: number;
    directionalHonesty: number;
    armLoad: number;
  };
}

export interface StringIntelligence {
  id: string;
  sources: DataSourceCredit[];
  trustScore: number;
  familyRole: string;
  quirks: FrameQuirk[];
  specialHeadline: string;
  specialBody: string;
  bestFrameMatch: string;
  skipIf: string[];
  ratings: {
    pocket: number;
    bite: number;
    board: number;
    durability: number;
    tensionHold: number;
  };
}

function clamp(n: number, a = 0, b = 100): number {
  return Math.max(a, Math.min(b, Math.round(n)));
}

function patternParts(pattern: string | null): { mains: number; crosses: number; open: boolean; dense: boolean } {
  let mains = 16;
  let crosses = 19;
  if (pattern) {
    const parts = pattern.toLowerCase().replace(/\s/g, "").replace("×", "x").split("x");
    mains = parseInt(parts[0], 10) || 16;
    crosses = parseInt(parts[1], 10) || 19;
  }
  const open = mains <= 16 && crosses <= 19;
  const dense = mains >= 18 || crosses >= 20;
  return { mains, crosses, open, dense };
}

function balanceClass(bal: number | null, weight: number): "HL" | "EVEN" | "HH" {
  // Approximate: HL < ~320 mm for midweight; HH tip-heavy
  const b = bal ?? 320;
  if (b < 318 || (weight >= 310 && b < 322)) return "HL";
  if (b > 328) return "HH";
  return "EVEN";
}

/** Aggregate provenance for a frame — every credit is auditable. */
export function frameSources(r: RacketProfile, liveCatalog: boolean): DataSourceCredit[] {
  const sources: DataSourceCredit[] = [
    {
      id: "racqix-specs",
      label: liveCatalog ? "Racqix live specs" : "Racqix snapshot",
      role: "Mass, SW, RA, balance, head, pattern",
      confidence: liveCatalog ? 92 : 84,
    },
    {
      id: "strokeform-physics",
      label: "Strokeform physics",
      role: "Launch / path / comfort / plow–whip model",
      confidence: 88,
    },
    {
      id: "strokeform-quirks",
      label: "Strokeform quirk engine",
      role: "Archetype, skill span, coaching quirks",
      confidence: 90,
    },
  ];

  if (/\/100 for (power|spin|control)/i.test(r.summary)) {
    sources.push({
      id: "racqix-expert",
      label: "Racqix expert scores",
      role: "Parsed power / spin / control from expert summary",
      confidence: 78,
    });
  }

  if (r.atpPlayers.length + r.wtaPlayers.length > 0) {
    sources.push({
      id: "tour-usage",
      label: "Tour usage signal",
      role: "ATP/WTA players listed with this frame line",
      confidence: Math.min(85, 55 + (r.atpPlayers.length + r.wtaPlayers.length) * 8),
    });
  }

  const tw = twImageMeta("rackets", r.slug);
  if (tw) {
    sources.push({
      id: "tennis-warehouse-media",
      label: "Tennis Warehouse media",
      role: "Retail product photography match",
      confidence: 70,
    });
  }

  return sources;
}

function trustFromSources(sources: DataSourceCredit[]): number {
  if (!sources.length) return 40;
  const avg = sources.reduce((s, x) => s + x.confidence, 0) / sources.length;
  const breadth = Math.min(12, sources.length * 3);
  return clamp(avg * 0.85 + breadth + 8);
}

const VERIFIED_SOURCE_IDS = new Set<DataSourceId>([
  "racqix-specs",
  "racqix-expert",
  "tour-usage",
  "tennis-warehouse-media",
]);

export type TrustTier = "high" | "solid" | "moderate" | "early";

export interface TrustSummary {
  score: number;
  tier: TrustTier;
  label: string;
  headline: string;
  detail: string;
  verifiedCount: number;
  modeledCount: number;
}

/** Plain-language breakdown of the aggregate trust score. */
export function describeTrust(sources: DataSourceCredit[]): TrustSummary {
  const score = trustFromSources(sources);
  const verifiedCount = sources.filter((s) => VERIFIED_SOURCE_IDS.has(s.id)).length;
  const modeledCount = sources.length - verifiedCount;

  if (score >= 85) {
    return {
      score,
      tier: "high",
      label: "High confidence",
      headline: "Specs verified, coaching layered on top",
      detail:
        verifiedCount >= 2
          ? "Multiple independent sources back the numbers below. Strokeform adds quirk and skill-span reads on that base."
          : "Core specs are verified; Strokeform models launch, quirks, and skill span from them.",
      verifiedCount,
      modeledCount,
    };
  }
  if (score >= 70) {
    return {
      score,
      tier: "solid",
      label: "Solid confidence",
      headline: "Good spec base — verify feel on court",
      detail:
        "Most ratings come from catalog specs plus Strokeform physics. Log a session if the mold feels off.",
      verifiedCount,
      modeledCount,
    };
  }
  if (score >= 55) {
    return {
      score,
      tier: "moderate",
      label: "Moderate confidence",
      headline: "Limited sources — treat as a starting read",
      detail:
        "Fewer verified inputs for this item. Use the quirks as hypotheses until you log real play.",
      verifiedCount,
      modeledCount,
    };
  }
  return {
    score,
    tier: "early",
    label: "Early read",
    headline: "Mostly modeled — confirm with your bag",
    detail:
      "Strokeform is extrapolating from partial data. Pair with a session log before trusting the skill span.",
    verifiedCount,
    modeledCount,
  };
}

export function isVerifiedSource(id: DataSourceId): boolean {
  return VERIFIED_SOURCE_IDS.has(id);
}

function skillSpanOf(r: RacketProfile): SkillSpan {
  const fit = derivePlayerFit(r);
  const w = r.weightG ?? 300;
  const hs = r.headSizeSqIn ?? 100;
  const { dense, open } = patternParts(r.stringPattern);
  const ra = r.stiffnessRa ?? 65;
  const sw = r.swingweight ?? 315;

  let floor = 55 + (hs - 98) * 2.2 + (305 - w) * 0.35 + (open ? 4 : 0) - (dense ? 8 : 0) + (r.power - 55) * 0.35;
  let ceiling =
    48 +
    (w - 290) * 0.55 +
    (dense ? 14 : 0) +
    (r.control - 50) * 0.45 +
    (hs <= 98 ? 8 : 0) +
    Math.max(0, sw - 310) * 0.2 -
    (r.power > 78 && r.control < 58 ? 12 : 0);
  let demand =
    40 +
    (dense ? 18 : 0) +
    (hs < 98 ? 12 : 0) +
    (w >= 315 ? 10 : 0) +
    (ra >= 68 ? 8 : 0) +
    (r.control - r.power) * 0.35 -
    (hs > 102 ? 10 : 0);

  floor = clamp(floor);
  ceiling = clamp(Math.max(floor + 8, ceiling));
  demand = clamp(demand);

  const label =
    fit.skill === "Tour / expert"
      ? "Tour demand — high ceiling, low forgiveness"
      : fit.skill === "Beginner-friendly"
        ? "Easy entry — ceiling arrives sooner"
        : fit.skill === "Advanced"
          ? "Rewards clean contact — grows with your game"
          : "Modern mid — room to grow without extreme demand";

  return { floor, ceiling, demand, band: fit.skill, label };
}

function archetypesOf(r: RacketProfile): { primary: PlayerArchetype; secondary: PlayerArchetype | null } {
  const { open, dense } = patternParts(r.stringPattern);
  const path = r.idealSwingPathDeg;
  const bal = balanceClass(r.balanceMm, r.weightG ?? 300);
  const { power, spin, control, comfort } = r;
  const fit = derivePlayerFit(r);

  let primary: PlayerArchetype = "Modern all-court shaper";
  let secondary: PlayerArchetype | null = null;

  if (fit.courtRole === "Serve & volley" || (control >= 72 && spin <= 62 && power <= 66 && path <= 16)) {
    primary = "Serve-first net hunter";
    secondary = bal === "HL" ? "Transition finisher" : "Precision line-hitter";
  } else if (spin >= 82 && path >= 26 && open) {
    primary = "Western spin sculptor";
    secondary = bal === "HL" ? "Open-pattern whip artist" : "Semi-western shape driver";
  } else if (spin >= 72 && path >= 22 && open) {
    primary = "Semi-western shape driver";
    secondary = power >= 68 ? "Flat first-strike aggressor" : "Open-pattern whip artist";
  } else if (dense && control >= 74) {
    primary = "Dense-pattern technician";
    secondary = control >= 80 ? "Precision line-hitter" : "Redirect counterpuncher";
  } else if (control >= 76 && power <= 64) {
    primary = power <= 58 && spin <= 64 ? "Redirect counterpuncher" : "Precision line-hitter";
    secondary = fit.courtRole === "Net-transition all-courter" ? "Transition finisher" : null;
  } else if (power >= 74 && control <= 62) {
    primary = comfort >= 68 ? "Arm-friendly depth seeker" : "Flat first-strike aggressor";
    secondary = open ? "Open-pattern whip artist" : null;
  } else if (fit.courtRole === "Net-transition all-courter") {
    primary = "Transition finisher";
    secondary = "Semi-western shape driver";
  } else if (fit.courtRole === "Counterpuncher") {
    primary = "Redirect counterpuncher";
    secondary = dense ? "Dense-pattern technician" : "Precision line-hitter";
  } else if (spin >= 68 && Math.abs(spin - control) <= 8) {
    primary = "Modern all-court shaper";
    secondary = open ? "Semi-western shape driver" : "Dense-pattern technician";
  } else if (power >= control + 6) {
    primary = "Flat first-strike aggressor";
  } else {
    primary = "Modern all-court shaper";
  }

  if (secondary === primary) secondary = null;
  return { primary, secondary };
}

function quirksOf(r: RacketProfile): FrameQuirk[] {
  const quirks: FrameQuirk[] = [];
  const w = r.weightG ?? 300;
  const sw = r.swingweight ?? 315;
  const ra = r.stiffnessRa ?? 65;
  const hs = r.headSizeSqIn ?? 100;
  const { open, dense, mains, crosses } = patternParts(r.stringPattern);
  const bal = balanceClass(r.balanceMm, w);

  if (dense) {
    quirks.push({
      id: "dense-bed",
      title: `${mains}×${crosses} honesty`,
      meaning:
        "A denser bed bites less freer RPM and gives a firmer, more directional response — less “shape for free.”",
      coaching: "Own your low-to-high path and contact quality; don’t expect open-pattern wipe to hide late hits.",
      polarity: "demand",
    });
  } else if (open) {
    quirks.push({
      id: "open-bed",
      title: "Open-pattern whip",
      meaning: "Mains move more — easier pocket and spin window, slightly less directional “laser” feel.",
      coaching: "Use the spin window for margin over the tape; watch launch if you open the face at contact.",
      polarity: "strength",
    });
  }

  if (bal === "HL") {
    quirks.push({
      id: "head-light",
      title: "Head-light whip",
      meaning: "Easier to accelerate and recover; less free plow through a heavy incoming ball.",
      coaching: "Great for reactive exchanges — if balls sit short, add tip mass or tension before blaming technique.",
      polarity: "strength",
    });
  } else if (bal === "HH" || sw >= 330) {
    quirks.push({
      id: "plow",
      title: "Plow-through tip",
      meaning: "Mass out front stabilizes contact and drives through the ball — late preparation gets punished.",
      coaching: "Unit-turn early; this frame rewards preparation more than emergency wrist flicks.",
      polarity: sw >= 335 ? "demand" : "strength",
    });
  }

  if (ra >= 68) {
    quirks.push({
      id: "stiff",
      title: "Connected / boardier RA",
      meaning: "Energy returns quickly — crisp feedback, less dwell, higher arm load on mishits.",
      coaching: "Keep the bed from going board-stiff; prefer arm-friendlier gauges if the elbow whispers.",
      polarity: "tradeoff",
    });
  } else if (ra <= 60) {
    quirks.push({
      id: "soft",
      title: "Pocketed flex",
      meaning: "Longer dwell and a softer thud — launch can climb if you open the face.",
      coaching: "Trust the pocket on blocks; don’t flip the face open when searching for depth.",
      polarity: "strength",
    });
  }

  if (hs < 98) {
    quirks.push({
      id: "midsize",
      title: "Precision sweet spot",
      meaning: "Smaller head — sharper feedback, less forgiveness on the tip and frame.",
      coaching: "Center the ball; this is a teaching frame for clean contact, not a safety net.",
      polarity: "demand",
    });
  } else if (hs > 102) {
    quirks.push({
      id: "oversize",
      title: "Forgiving launch window",
      meaning: "Larger bed raises the sweet spot and typical launch — depth comes easier.",
      coaching: "If balls sail, close the face slightly or raise tension before dumping spin.",
      polarity: "strength",
    });
  }

  if (r.power >= 74 && r.control <= 60) {
    quirks.push({
      id: "free-power",
      title: "Free depth on clean hits",
      meaning: "The frame adds pace — great for building a game, easy to overhit when timing is early.",
      coaching: "Measure success by landing zone, not by how hard it feels off the strings.",
      polarity: "tradeoff",
    });
  }

  if (r.spin >= 80 && r.idealSwingPathDeg >= 26) {
    quirks.push({
      id: "steep-path",
      title: "Steep teaching path",
      meaning: "Mold wants low-to-high shape; flat drives leave the ball short or into the tape.",
      coaching: "Brush up through the outside of the ball — this frame is a spin coach, not a flat cannon.",
      polarity: "strength",
    });
  }

  // Cap to the most diagnostic quirks
  const order: Record<FrameQuirk["polarity"], number> = { demand: 0, tradeoff: 1, strength: 2 };
  return quirks.sort((a, b) => order[a.polarity] - order[b.polarity]).slice(0, 5);
}

function ratingsOf(r: RacketProfile) {
  const w = r.weightG ?? 300;
  const sw = r.swingweight ?? 315;
  const ra = r.stiffnessRa ?? 65;
  const hs = r.headSizeSqIn ?? 100;
  const { open, dense } = patternParts(r.stringPattern);
  const bal = balanceClass(r.balanceMm, w);

  const plow = clamp(40 + (sw - 305) * 0.9 + (w - 295) * 0.45 + (bal === "HH" ? 8 : bal === "HL" ? -6 : 0));
  const whip = clamp(45 + (318 - (r.balanceMm ?? 320)) * 1.1 + (305 - w) * 0.4 + (open ? 5 : 0));
  const forgiveness = clamp(50 + (hs - 98) * 3.2 - (dense ? 10 : 0) + (r.comfort - 55) * 0.35 - (ra - 64) * 0.8);
  const spinCeiling = clamp(r.spin * 0.75 + (open ? 12 : dense ? -6 : 4) + (r.idealSwingPathDeg - 18) * 1.2);
  const directionalHonesty = clamp(r.control * 0.7 + (dense ? 14 : 0) + (98 - hs) * 1.5);
  const armLoad = clamp(35 + (ra - 58) * 2.2 + Math.max(0, sw - 318) * 0.4 - (r.comfort - 60) * 0.5);

  return { plow, whip, forgiveness, spinCeiling, directionalHonesty, armLoad };
}

function specialCopy(
  r: RacketProfile,
  primary: PlayerArchetype,
  quirks: FrameQuirk[],
  skill: SkillSpan,
): { headline: string; body: string } {
  const demandQuirk = quirks.find((q) => q.polarity === "demand");
  const strengthQuirk = quirks.find((q) => q.polarity === "strength");
  const headline = `${r.brand} ${r.model} — ${primary}`;
  const body = [
    `Strokeform reads this as a ${skill.band.toLowerCase()} frame with a skill span of ${skill.floor}→${skill.ceiling}/100.`,
    strengthQuirk ? `Its signature quirk: ${strengthQuirk.title.toLowerCase()} — ${strengthQuirk.meaning}` : null,
    demandQuirk ? `The tax: ${demandQuirk.title.toLowerCase()}. ${demandQuirk.coaching}` : null,
    `Teaching window ~${r.idealLaunchAngleDeg.toFixed(1)}° leave / ~${r.idealSwingPathDeg.toFixed(0)}° path — not a generic “baseline” label.`,
  ]
    .filter(Boolean)
    .join(" ");

  return { headline, body };
}

function skipIfOf(r: RacketProfile, skill: SkillSpan, primary: PlayerArchetype): string[] {
  const skips: string[] = [];
  if (skill.demand >= 72) {
    skips.push("Players still building consistent center contact — the demand index is high.");
  }
  if (r.power >= 76 && r.control <= 58) {
    skips.push("Already overhitting long — free power will amplify sail unless you tighten the mold.");
  }
  if (patternParts(r.stringPattern).dense && r.spin < 68) {
    skips.push("Western spin-first players who need freer RPM from the bed alone.");
  }
  if (r.stiffnessRa != null && r.stiffnessRa >= 70) {
    skips.push("Arm-sensitive players unless the bed is softened (gauge / multi / lower tension).");
  }
  if (primary === "Serve-first net hunter") {
    skips.push("Pure heavy-spin baseliners who live on windshield-wiper shape from deep.");
  }
  if (skill.ceiling < 62) {
    skips.push("Tournament players who need a higher skill ceiling before the frame feels maxed out.");
  }
  return skips.slice(0, 4);
}

function stringPairingOf(r: RacketProfile, primary: PlayerArchetype): string {
  const { dense, open } = patternParts(r.stringPattern);
  if (r.stiffnessRa != null && r.stiffnessRa >= 68) {
    return "Pair with a softer co-poly or multi hybrid — the frame is already boardy; don’t stack stiffness.";
  }
  if (open && r.spin >= 75) {
    return "Shaped co-poly in the mid tension window keeps bite without launching every ball long.";
  }
  if (dense) {
    return "A slightly more elastic poly (or gut hybrid) restores pocket so the dense bed doesn’t feel muted.";
  }
  if (primary === "Arm-friendly depth seeker") {
    return "Multifilament or soft co-poly — protect the arm while the frame supplies depth.";
  }
  return "Start mid in the recommended tension band; change one lever (gauge or tension) after a full session log.";
}

function tourSignalOf(r: RacketProfile): string | null {
  const names = [...r.atpPlayers, ...r.wtaPlayers].slice(0, 5);
  if (!names.length) return null;
  return `Tour signal: seen with ${names.join(", ")}${r.atpPlayers.length + r.wtaPlayers.length > 5 ? "…" : ""} — usage is a clue, not a prescription.`;
}

export function analyzeFrame(
  r: RacketProfile,
  opts?: { liveCatalog?: boolean },
): FrameIntelligence {
  const sources = frameSources(r, opts?.liveCatalog ?? false);
  const skill = skillSpanOf(r);
  const { primary, secondary } = archetypesOf(r);
  const quirks = quirksOf(r);
  const { headline, body } = specialCopy(r, primary, quirks, skill);
  const fit = derivePlayerFit(r);

  return {
    slug: r.slug,
    sources,
    trustScore: trustFromSources(sources),
    skill,
    primaryArchetype: primary,
    secondaryArchetype: secondary,
    courtRole: fit.courtRole,
    quirks,
    specialHeadline: headline,
    specialBody: body,
    skipIf: skipIfOf(r, skill, primary),
    stringPairing: stringPairingOf(r, primary),
    tourSignal: tourSignalOf(r),
    ratings: ratingsOf(r),
  };
}

export function analyzeString(s: StringProfile): StringIntelligence {
  const sources: DataSourceCredit[] = [
    {
      id: "strokeform-string-lab",
      label: "Strokeform string lab",
      role: "Material / shape / tension–gauge response model",
      confidence: 86,
    },
  ];
  if (twImageMeta("strings", s.id)) {
    sources.push({
      id: "tennis-warehouse-media",
      label: "Tennis Warehouse media",
      role: "Retail product photography match",
      confidence: 68,
    });
  }

  const isPoly = s.material === "polyester" || s.material === "co-poly";
  const shaped = s.shape !== "round";
  const quirks: FrameQuirk[] = [];

  if (isPoly && shaped) {
    quirks.push({
      id: "shaped-poly",
      title: "Shaped bite",
      meaning: "Edges grip the ball for RPM — can feel snappy and launchy on flat swings.",
      coaching: "Keep a low-to-high path; don’t arm a flat drive expecting the shape to save depth.",
      polarity: "strength",
    });
  }
  if (isPoly && s.comfort < 55) {
    quirks.push({
      id: "firm-poly",
      title: "Firm poly tax",
      meaning: "Connected and durable, but higher arm load as the bed dies.",
      coaching: "Track hours — replace before the bed goes board-dead.",
      polarity: "tradeoff",
    });
  }
  if (s.material === "multifilament" || s.material === "natural-gut") {
    quirks.push({
      id: "pocket",
      title: "Deep pocket",
      meaning: "Long dwell and comfort — less free spin than a shaped poly.",
      coaching: "Great for arm and feel; add technique or a shaped hybrid if you need more bite.",
      polarity: "strength",
    });
  }
  if (s.tensionMaintenance < 55 && isPoly) {
    quirks.push({
      id: "tension-loss",
      title: "Tension drop curve",
      meaning: "Playability window is shorter — control fades as the bed relaxes.",
      coaching: "Log string hours; don’t judge the frame on a dead bed.",
      polarity: "demand",
    });
  }

  const familyRole = isPoly
    ? shaped
      ? "Shaped co-poly — spin window with a firmer pocket"
      : "Round poly — control-first bed with durable response"
    : s.material === "hybrid"
      ? "Hybrid — mix pocket and bite across mains/crosses"
      : "Soft bed — comfort and dwell over free RPM";

  return {
    id: s.id,
    sources,
    trustScore: trustFromSources(sources),
    familyRole,
    quirks: quirks.slice(0, 4),
    specialHeadline: `${s.brand} ${s.name} — ${familyRole}`,
    specialBody: `${s.bestFor} ${s.notes}`.trim(),
    bestFrameMatch: isPoly
      ? "Pairs cleanly with open-pattern spin frames; soften gauge on stiff RA frames."
      : "Pairs with stiff or dense frames that need pocket restored.",
    skipIf: [
      ...(isPoly && s.comfort < 50 ? ["Arm-sensitive players at high tension."] : []),
      ...(s.durability < 45 ? ["Heavy poly breakers who need max durability."] : []),
    ].slice(0, 3),
    ratings: {
      pocket: clamp(s.comfort * 0.7 + (100 - (s.stiffness ?? 55)) * 0.35),
      bite: clamp(s.spin * 0.85 + (shaped ? 10 : 0)),
      board: clamp(s.stiffness ?? 50 + (isPoly ? 10 : -10)),
      durability: s.durability,
      tensionHold: s.tensionMaintenance,
    },
  };
}
