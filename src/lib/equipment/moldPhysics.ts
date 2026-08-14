import type { StringProfile } from "@/types/equipment";
import { tensionOutcome } from "@/lib/equipment/strings";

/** Quantified clean-hit flight for the molded setup. */
export interface FlightMetrics {
  launchDeg: number;
  pathDeg: number;
  /** Effective plow-through (mass × tip bias) 0–100 */
  plow: number;
  /** Topspin / drop leverage 0–100 */
  topspin: number;
  /** Through-court depth 0–100 */
  depth: number;
  /** Estimated inches over the net on a center hit */
  netClearIn: number;
  /** Sail / long tendency 0–100 */
  flyRisk: number;
}

export interface ScorePieceDeltas {
  power: number;
  spin: number;
  control: number;
  comfort: number;
}

function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

/**
 * Lead-tape → score shifts (coaching-grade, same map as Gear Lab).
 *
 * Physics basis (Brody; Cross & Lindsey / Tennis Warehouse University):
 * - Swingweight scales ~ m·r² about the handle. Tip/12 sit ~65–68 cm from the
 *   butt → largest SW and plow per gram, slightly flatter leave, more arm load.
 * - Twistweight / polar MOI: 3 & 9 sit far from the long axis, so the hoop
 *   resists twisting on off-center hits (face stays through the ball).
 * - Handle mass is near the rotation axis: recoil weight up, SW barely moves,
 *   balance goes head-light → faster prep, easier low-to-high path.
 * - Throat/yoke sits near the balance point: solid without a SW spike.
 */
export function scoreDeltasFromTape(input: {
  tipG: number;
  handleG: number;
  sideG: number;
  throatG: number;
  deltaSw: number;
  deltaPath: number;
}): ScorePieceDeltas {
  const { tipG, handleG, sideG, throatG, deltaSw, deltaPath } = input;
  return {
    power: round1(tipG * 1.45 + sideG * 0.35 + throatG * 0.45 - handleG * 0.4 + deltaSw * 0.12),
    spin: round1(tipG * 0.4 + sideG * 0.2 + deltaPath * 0.55 - handleG * 0.15),
    control: round1(sideG * 1.25 + handleG * 0.55 + throatG * 0.35 - tipG * 0.35),
    comfort: round1(-tipG * 0.95 - deltaSw * 0.1 + handleG * 0.35 + throatG * 0.25),
  };
}

/** Clean-hit flight quantities from molded leave/path/scores/SW. */
export function computeFlightMetrics(input: {
  launchDeg: number;
  pathDeg: number;
  power: number | null;
  spin: number | null;
  control: number | null;
  swingweight: number | null;
  tipG?: number;
  handleG?: number;
  /** 3 + 9 grams — polar stability through contact (optional). */
  sideG?: number;
}): FlightMetrics {
  const launch = clamp(input.launchDeg, 1.5, 16);
  const path = clamp(input.pathDeg, 4, 48);
  const pw = input.power ?? 55;
  const sp = input.spin ?? 55;
  const ct = input.control ?? 55;
  const sw = input.swingweight ?? 315;
  const tipG = input.tipG ?? 0;
  const handleG = input.handleG ?? 0;
  const sideG = input.sideG ?? 0;

  const plow = clamp(
    Math.round(pw * 0.45 + (sw - 300) * 0.55 + tipG * 2.2 - handleG * 1.1 + sideG * 0.7),
    5,
    98,
  );
  const topspin = clamp(
    Math.round(sp * 0.5 + path * 1.15 + (launch > 9 ? 4 : 0) + tipG * 0.4),
    5,
    98,
  );
  const depth = clamp(
    Math.round(
      plow * 0.35 +
        pw * 0.25 +
        (18 - Math.abs(launch - 7.2)) * 2.4 +
        (40 - path) * 0.28 -
        Math.max(0, topspin - 70) * 0.15,
    ),
    5,
    98,
  );
  const netClearIn = round1(clamp(2.2 + launch * 1.85 + Math.max(0, path - 18) * 0.12, 0.5, 42));
  const flyRisk = clamp(
    Math.round(
      22 +
        (launch - 7) * 6.5 +
        (22 - path) * 1.15 +
        (pw - ct) * 0.28 +
        Math.max(0, plow - 70) * 0.12 -
        Math.max(0, topspin - 65) * 0.18,
    ),
    5,
    98,
  );

  return {
    launchDeg: round1(launch),
    pathDeg: round1(path),
    plow,
    topspin,
    depth,
    netClearIn,
    flyRisk,
  };
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
  const delta = (tensionLbs - mid) / span;

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
