import type { LeadTapePiece, LeadTapeZone, RacketProfile } from "@/types/equipment";
import {
  computeLeadTapeEffect,
  createLeadTapePiece,
} from "@/lib/equipment/leadTape";

export type SpecTarget = {
  label: string;
  weightG: number | null;
  swingweight: number | null;
  balanceMm: number | null;
  slug?: string;
  /** Optional pro names associated with the target mold */
  seenWith?: string[];
};

export type TapePlanStep = {
  zone: LeadTapeZone;
  massG: number;
  why: string;
};

export type TapeTowardPlan = {
  target: SpecTarget;
  stock: SpecTarget;
  gaps: {
    weightG: number | null;
    swingweight: number | null;
    balanceMm: number | null;
  };
  steps: TapePlanStep[];
  pieces: LeadTapePiece[];
  predicted: ReturnType<typeof computeLeadTapeEffect>;
  remaining: {
    weightG: number | null;
    swingweight: number | null;
    balanceMm: number | null;
  };
  feasible: boolean;
  summary: string;
  caveats: string[];
};

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

function stockOf(r: Pick<RacketProfile, "brand" | "model" | "weightG" | "swingweight" | "balanceMm" | "slug">): SpecTarget {
  return {
    label: `${r.brand} ${r.model}`,
    weightG: r.weightG,
    swingweight: r.swingweight,
    balanceMm: r.balanceMm,
    slug: r.slug,
  };
}

/** Approx SW gain per gram at a zone (from forward model calibration). */
const SW_PER_G: Record<LeadTapeZone, number> = {
  tip: 2.5,
  twelve: 2.3,
  three: 1.65,
  nine: 1.65,
  throat: 0.95,
  handle: 0.14,
};

/**
 * Inverse coaching planner: close SW / weight / balance gaps toward a target
 * mold using discrete 0.5 / 1 / 2 g strips. Cannot remove mass.
 */
export function planTapeTowardTarget(
  stockRacket: Pick<
    RacketProfile,
    | "brand"
    | "model"
    | "slug"
    | "weightG"
    | "swingweight"
    | "balanceMm"
    | "idealLaunchAngleDeg"
    | "idealSwingPathDeg"
  >,
  target: SpecTarget,
  opts?: { maxMassG?: number },
): TapeTowardPlan {
  const maxMass = opts?.maxMassG ?? 12;
  const stock = stockOf(stockRacket);
  const baseW = stock.weightG ?? 300;
  const baseSw = stock.swingweight ?? 315;
  const baseBal = stock.balanceMm ?? 320;
  const tgtW = target.weightG;
  const tgtSw = target.swingweight;
  const tgtBal = target.balanceMm;

  const gapW = tgtW != null ? round1(tgtW - baseW) : null;
  const gapSw = tgtSw != null ? round1(tgtSw - baseSw) : null;
  const gapBal = tgtBal != null ? round1(tgtBal - baseBal) : null;

  const caveats: string[] = [];
  const steps: TapePlanStep[] = [];
  const zoneMass: Partial<Record<LeadTapeZone, number>> = {};

  const add = (zone: LeadTapeZone, massG: number, why: string) => {
    if (massG <= 0) return;
    zoneMass[zone] = round1((zoneMass[zone] ?? 0) + massG);
    steps.push({ zone, massG, why });
  };

  const totalSoFar = () =>
    Object.values(zoneMass).reduce((n, v) => n + (v ?? 0), 0);

  // Cannot lighten a heavier stock frame with tape
  if (gapW != null && gapW < -2) {
    caveats.push(
      `Target is ~${Math.abs(gapW)}g lighter — lead tape only adds mass. Prefer a lighter stock frame or strip existing customization.`,
    );
  }
  if (gapSw != null && gapSw < -3) {
    caveats.push(
      `Target swingweight is ~${Math.abs(gapSw)} points lower — tape cannot drop SW. Look for a lighter / more HL retail mold.`,
    );
  }

  let needSw = Math.max(0, gapSw ?? 0);
  let needW = Math.max(0, gapW ?? 0);
  // Positive gapBal = target more tip-heavy (higher mm from butt)
  let needBal = gapBal ?? 0;

  // 1) Tip / 12 for SW (and tip-heavy balance)
  if (needSw > 0.8 || needBal > 2) {
    const tipBudget = Math.min(
      maxMass - totalSoFar(),
      Math.max(needW > 0 ? needW : 0, needSw / SW_PER_G.tip, needBal > 2 ? needBal / 3 : 0),
    );
    let tip = Math.min(6, Math.ceil(tipBudget * 2) / 2); // 0.5 steps, cap 6g tip stack
    if (tip >= 0.5) {
      // Prefer 12 o'clock for first grams (slightly less extreme), tip for rest
      const twelve = Math.min(tip, tip >= 3 ? 2 : tip);
      const extreme = round1(tip - twelve);
      if (twelve >= 0.5) {
        add("twelve", twelve, `Close ~${round1(twelve * SW_PER_G.twelve)} SW toward the target plow.`);
        needSw = Math.max(0, needSw - twelve * SW_PER_G.twelve);
        needW = Math.max(0, needW - twelve);
        needBal -= twelve * 0.9;
      }
      if (extreme >= 0.5) {
        add("tip", extreme, `Extra tip mass for remaining SW (~${round1(extreme * SW_PER_G.tip)} pts).`);
        needSw = Math.max(0, needSw - extreme * SW_PER_G.tip);
        needW = Math.max(0, needW - extreme);
        needBal -= extreme * 1.1;
      }
    }
  }

  // 2) 3 & 9 for torsional stability when weight still short and SW mostly closed
  if (needW > 1 && needSw < 4 && totalSoFar() < maxMass) {
    const side = Math.min(2, Math.ceil(Math.min(needW, maxMass - totalSoFar()) * 2) / 2);
    if (side >= 1) {
      const each = Math.max(0.5, Math.floor(side) / 2 || 0.5);
      add("three", each, "Off-center stability while adding mass without max tip SW.");
      add("nine", each, "Mirror 3 o'clock for a balanced hoop.");
      needW = Math.max(0, needW - each * 2);
      needSw = Math.max(0, needSw - each * 2 * SW_PER_G.three);
    }
  }

  // 3) Throat — mass without huge SW
  if (needW > 0.5 && totalSoFar() < maxMass) {
    const throat = Math.min(3, Math.ceil(Math.min(needW, maxMass - totalSoFar()) * 2) / 2);
    if (throat >= 0.5) {
      add("throat", throat, "Add static weight near the balance point with a smaller SW jump.");
      needW = Math.max(0, needW - throat);
      needSw = Math.max(0, needSw - throat * SW_PER_G.throat);
    }
  }

  // 4) Handle — if we overshot tip-heavy vs target (needBal negative = need more HL)
  if (needBal < -2 && totalSoFar() < maxMass) {
    const handle = Math.min(4, Math.ceil(Math.min(Math.abs(needBal) / 2.5, maxMass - totalSoFar()) * 2) / 2);
    if (handle >= 0.5) {
      add("handle", handle, "Re-headlight after tip mass — keeps the whip closer to the target balance.");
      needBal += handle * 2.2;
      needW = Math.max(0, needW - handle); // still adds weight
    }
  }

  // 5) Leftover SW with small tip top-up
  if (needSw > 1.5 && totalSoFar() < maxMass) {
    const extra = Math.min(2, Math.ceil(Math.min(needSw / SW_PER_G.twelve, maxMass - totalSoFar()) * 2) / 2);
    if (extra >= 0.5) {
      add("twelve", extra, `Top up remaining ~${round1(extra * SW_PER_G.twelve)} SW.`);
      needSw = Math.max(0, needSw - extra * SW_PER_G.twelve);
    }
  }

  const pieces: LeadTapePiece[] = [];
  for (const [zone, mass] of Object.entries(zoneMass) as [LeadTapeZone, number][]) {
    let left = mass;
    // Split into 2g / 1g / 0.5g strips for the lab UI
    while (left >= 2) {
      pieces.push(createLeadTapePiece(2, zone));
      left = round1(left - 2);
    }
    while (left >= 1) {
      pieces.push(createLeadTapePiece(1, zone));
      left = round1(left - 1);
    }
    if (left >= 0.5) pieces.push(createLeadTapePiece(0.5, zone));
  }

  const predicted = computeLeadTapeEffect(stockRacket, pieces);
  const remW =
    tgtW != null && predicted.weightG != null ? round1(tgtW - predicted.weightG) : null;
  const remSw =
    tgtSw != null && predicted.swingweight != null
      ? round1(tgtSw - predicted.swingweight)
      : null;
  const remBal =
    tgtBal != null && predicted.balanceMm != null
      ? round1(tgtBal - predicted.balanceMm)
      : null;

  const closeEnough =
    (remSw == null || Math.abs(remSw) <= 4) &&
    (remW == null || remW <= 4) &&
    (remBal == null || Math.abs(remBal) <= 6);

  const feasible =
    pieces.length > 0 &&
    !(gapSw != null && gapSw < -3) &&
    (gapSw == null || gapSw > 0.5 || (gapW != null && gapW > 0.5) || (gapBal != null && Math.abs(gapBal) > 2));

  let summary: string;
  if (pieces.length === 0) {
    summary =
      gapSw != null && gapSw <= 0 && (gapW == null || gapW <= 0)
        ? "Stock already meets or exceeds the target mass/SW — tape won’t help; pick a different retail mold or accept the stock feel."
        : "Not enough clear gap to prescribe tape — check that both frames have weight/SW listed.";
  } else if (closeEnough) {
    summary = `Suggested ~${predicted.addedMassG}g layout brings ${stock.label} roughly in line with ${target.label} on SW/weight (coaching-grade).`;
  } else {
    summary = `Partial mold (~${predicted.addedMassG}g): closes much of the gap toward ${target.label}, but some difference will remain — see remaining deltas.`;
  }

  if (target.seenWith && target.seenWith.length > 0) {
    caveats.push(
      `Pros often seen with this mold: ${target.seenWith.slice(0, 4).join(", ")} — tour frames are usually heavily customized beyond retail stock.`,
    );
  }

  return {
    target,
    stock,
    gaps: { weightG: gapW, swingweight: gapSw, balanceMm: gapBal },
    steps,
    pieces,
    predicted,
    remaining: { weightG: remW, swingweight: remSw, balanceMm: remBal },
    feasible: feasible && pieces.length > 0,
    summary,
    caveats,
  };
}

export type BudgetAlt = {
  racket: RacketProfile;
  score: number;
  reason: string;
  plan: TapeTowardPlan;
};

/**
 * Cheaper / easier retail frames that can be taped toward a target mold.
 * Heuristic: lower weight than target, similar style/head/pattern, tape plan feasible.
 */
export function findBudgetFrameAlternatives(
  catalog: RacketProfile[],
  target: RacketProfile,
  opts?: { limit?: number },
): BudgetAlt[] {
  const limit = opts?.limit ?? 5;
  const tgtW = target.weightG ?? 305;
  const tgtSw = target.swingweight ?? 320;
  const alts: BudgetAlt[] = [];

  for (const r of catalog) {
    if (r.slug === target.slug) continue;
    const w = r.weightG;
    const sw = r.swingweight;
    if (w == null || sw == null) continue;
    // Prefer lighter / lower-SW stock that tape can build up
    if (w > tgtW + 5) continue;
    if (sw > tgtSw + 2) continue;
    if (w < tgtW - 35) continue; // too light to credibly mold

    const targetSpec: SpecTarget = {
      label: `${target.brand} ${target.model}`,
      weightG: target.weightG,
      swingweight: target.swingweight,
      balanceMm: target.balanceMm,
      slug: target.slug,
      seenWith: [...(target.atpPlayers ?? []), ...(target.wtaPlayers ?? [])],
    };
    const plan = planTapeTowardTarget(r, targetSpec);
    if (!plan.feasible && plan.pieces.length === 0) continue;

    let score = 0;
    if (r.style === target.style) score += 30;
    if (r.brand === target.brand) score += 12;
    if (r.headSizeSqIn != null && target.headSizeSqIn != null) {
      score += Math.max(0, 15 - Math.abs(r.headSizeSqIn - target.headSizeSqIn) * 4);
    }
    if (r.stringPattern && target.stringPattern && r.stringPattern === target.stringPattern) {
      score += 10;
    }
    // Prefer smaller tape dose
    score += Math.max(0, 20 - (plan.predicted.addedMassG ?? 0) * 2);
    // Prefer closer power/control personality
    score += Math.max(0, 12 - Math.abs(r.control - target.control) * 0.25);
    score += Math.max(0, 10 - Math.abs(r.spin - target.spin) * 0.2);

    const reasons: string[] = [];
    if (r.brand === target.brand) reasons.push("same brand line");
    if (r.style === target.style) reasons.push("same playstyle bucket");
    reasons.push(`~${plan.predicted.addedMassG}g tape toward target SW`);
    if (w < tgtW) reasons.push(`${round1(tgtW - w)}g lighter stock (budget-friendly customize)`);

    alts.push({
      racket: r,
      score,
      reason: reasons.join(" · "),
      plan,
    });
  }

  alts.sort((a, b) => b.score - a.score);
  return alts.slice(0, limit);
}

export function targetFromRacket(r: RacketProfile): SpecTarget {
  return {
    label: `${r.brand} ${r.model}`,
    weightG: r.weightG,
    swingweight: r.swingweight,
    balanceMm: r.balanceMm,
    slug: r.slug,
    seenWith: [...(r.atpPlayers ?? []), ...(r.wtaPlayers ?? [])].filter(Boolean),
  };
}
