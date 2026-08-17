import type { LeadTapePiece, LeadTapeZone, RacketProfile } from "@/types/equipment";

/** Diagram viewBox: 0–200 x, 0–280 y. Zones as normalized 0–1 centers. */
export const LEAD_TAPE_ZONES: Record<
  LeadTapeZone,
  { label: string; x: number; y: number; hint: string }
> = {
  tip: {
    label: "Tip (12 o'clock outer)",
    x: 0.5,
    y: 0.062,
    hint: "Raises swingweight and plow-through; slightly lower launch feel.",
  },
  twelve: {
    label: "12 o'clock hoop",
    x: 0.5,
    y: 0.096,
    hint: "Power and plow with a bit less SW gain than extreme tip weight.",
  },
  three: {
    label: "3 o'clock",
    x: 0.758,
    y: 0.279,
    hint: "Twisting stability on off-center hits; mild SW and balance shift.",
  },
  nine: {
    label: "9 o'clock",
    x: 0.242,
    y: 0.279,
    hint: "Mirrors 3 o'clock — pair both sides for torsional stability.",
  },
  throat: {
    label: "Neck",
    x: 0.5,
    y: 0.643,
    hint: "Adds mass near the balance point — more solid without huge SW jump.",
  },
  handle: {
    label: "Handle / butt",
    x: 0.5,
    y: 0.843,
    hint: "Head-lightens the frame; easier to whip, slightly higher swing path.",
  },
};

export const LEAD_TAPE_MASS_PRESETS = [0.5, 1, 2] as const;

/** Approximate distance from butt (cm) for swingweight / balance modeling. */
const ZONE_DISTANCE_CM: Record<LeadTapeZone, number> = {
  tip: 68,
  twelve: 65,
  three: 55,
  nine: 55,
  throat: 42,
  handle: 8,
};

export interface LeadTapeEffect {
  addedMassG: number;
  deltaBalanceMm: number;
  deltaSwingweight: number;
  /** Adjusted ideal launch after tape (degrees). */
  launchAngleDeg: number;
  /** Adjusted ideal swing path after tape (degrees). */
  swingPathDeg: number;
  deltaLaunchDeg: number;
  deltaSwingPathDeg: number;
  /** Effective weight with tape. */
  weightG: number | null;
  swingweight: number | null;
  balanceMm: number | null;
  hints: string[];
  zoneSummary: Partial<Record<LeadTapeZone, number>>;
}

function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}

export function snapToNearestZone(x: number, y: number): LeadTapeZone {
  let best: LeadTapeZone = "twelve";
  let bestDist = Infinity;
  for (const [zone, pos] of Object.entries(LEAD_TAPE_ZONES) as [
    LeadTapeZone,
    { x: number; y: number },
  ][]) {
    const d = (pos.x - x) ** 2 + (pos.y - y) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = zone;
    }
  }
  return best;
}

export function createLeadTapePiece(
  massG: number,
  zone: LeadTapeZone,
  id?: string,
): LeadTapePiece {
  const z = LEAD_TAPE_ZONES[zone];
  return {
    id: id ?? `lt-${zone}-${massG}-${Math.random().toString(36).slice(2, 8)}`,
    massG,
    zone,
    x: z.x,
    y: z.y,
  };
}

/**
 * Coaching-grade lead-tape model.
 * SW ≈ Σ m * r² (kg · cm² scale mapped to TW-like units).
 * Balance shift ≈ mass-weighted lever toward tip vs handle.
 */
export function computeLeadTapeEffect(
  racket: Pick<
    RacketProfile,
    "weightG" | "swingweight" | "balanceMm" | "idealLaunchAngleDeg" | "idealSwingPathDeg"
  >,
  pieces: LeadTapePiece[],
): LeadTapeEffect {
  const baseW = racket.weightG ?? 300;
  const baseSw = racket.swingweight ?? 315;
  const baseBal = racket.balanceMm ?? 320;
  const baseLaunch = racket.idealLaunchAngleDeg;
  const basePath = racket.idealSwingPathDeg;

  let addedMassG = 0;
  let tipMass = 0;
  let sideMass = 0;
  let throatMass = 0;
  let handleMass = 0;
  let momentKgCm2 = 0;
  let balanceMoment = 0;
  const zoneSummary: Partial<Record<LeadTapeZone, number>> = {};

  for (const p of pieces) {
    addedMassG += p.massG;
    zoneSummary[p.zone] = (zoneSummary[p.zone] ?? 0) + p.massG;
    const r = ZONE_DISTANCE_CM[p.zone];
    const mKg = p.massG / 1000;
    momentKgCm2 += mKg * r * r;

    // Balance: tipward mass increases mm from butt; handle decreases
    const lever = (r - 32) / 36; // ~−0.7 handle … +1 tip
    balanceMoment += p.massG * lever;

    if (p.zone === "tip" || p.zone === "twelve") tipMass += p.massG;
    else if (p.zone === "three" || p.zone === "nine") sideMass += p.massG;
    else if (p.zone === "throat") throatMass += p.massG;
    else handleMass += p.massG;
  }

  // Map kg·cm² increment to TW swingweight points (~1g at tip ≈ +2–3 SW)
  const deltaSwingweight = Math.round(momentKgCm2 * 2.15 * 10) / 10;
  const deltaBalanceMm =
    addedMassG > 0
      ? Math.round(((balanceMoment / (baseW + addedMassG)) * 28) * 10) / 10
      : 0;

  // Launch: tip/12 mass → slightly flatter; handle → slightly higher
  const deltaLaunchDeg =
    Math.round((-tipMass * 0.12 + handleMass * 0.08 - sideMass * 0.02 - throatMass * 0.03) * 10) /
    10;
  // Swing path: tip weight → players swing flatter; handle → easier steep path
  const deltaSwingPathDeg =
    Math.round((-tipMass * 0.35 + handleMass * 0.4 - sideMass * 0.05) * 10) / 10;

  const launchAngleDeg = clamp(
    Math.round((baseLaunch + deltaLaunchDeg) * 10) / 10,
    2,
    14,
  );
  const swingPathDeg = clamp(
    Math.round((basePath + deltaSwingPathDeg) * 10) / 10,
    6,
    42,
  );

  const hints: string[] = [];
  if (pieces.length === 0) {
    hints.push("Add tape strips to the diagram to see launch and swing-path shifts.");
  } else {
    if (tipMass >= 1) {
      hints.push(LEAD_TAPE_ZONES.tip.hint);
    }
    if (sideMass >= 1) {
      hints.push(LEAD_TAPE_ZONES.three.hint);
    }
    if (throatMass >= 1) {
      hints.push(LEAD_TAPE_ZONES.throat.hint);
    }
    if (handleMass >= 1) {
      hints.push(LEAD_TAPE_ZONES.handle.hint);
    }
    if (hints.length === 0) {
      hints.push("Small mass additions — subtle plow and stability changes.");
    }
  }

  return {
    addedMassG: Math.round(addedMassG * 10) / 10,
    deltaBalanceMm,
    deltaSwingweight,
    launchAngleDeg,
    swingPathDeg,
    deltaLaunchDeg: Math.round((launchAngleDeg - baseLaunch) * 10) / 10,
    deltaSwingPathDeg: Math.round((swingPathDeg - basePath) * 10) / 10,
    weightG: Math.round((baseW + addedMassG) * 10) / 10,
    swingweight: Math.round((baseSw + deltaSwingweight) * 10) / 10,
    balanceMm: Math.round((baseBal + deltaBalanceMm) * 10) / 10,
    hints,
    zoneSummary,
  };
}
