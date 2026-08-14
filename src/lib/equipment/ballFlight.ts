/**
 * Clean-hit ball flight in meters — shared by the 2D court plot and the 3D scene.
 *
 * Net: ITF 0.914 m at center. Baseline→net 11.89 m.
 * Trajectory is a ballistic quadratic y = h0 + tan(θ)·x − a·x² whose slope at
 * the strings is the molded launch angle and whose height at the net is
 * exactly tape + ball radius + netClearIn inches (from computeFlightMetrics).
 * That is the constraint; we do not freehand a bezier that can duck into the tape.
 */

export type StrikeBand = "neck" | "chest" | "waist";

export const NET_HEIGHT_M = 0.914;
export const BASELINE_TO_NET_M = 11.887;
export const BALL_RADIUS_M = 0.0335;
export const G_M_S2 = 9.81;
export const M_TO_FT = 3.280839895;

export function mToFt(m: number): number {
  return m * M_TO_FT;
}

export function formatFt(m: number, digits = 1): string {
  return `${mToFt(m).toFixed(digits)} ft`;
}

export type TrajectoryPoint = { x: number; y: number };

export type BallTrajectory = {
  points: TrajectoryPoint[];
  /** Horizontal distance, contact → net (m). */
  netX: number;
  /** Ball center height at the net (m). */
  heightAtNet: number;
  /** Inches over the tape — matches computeFlightMetrics.netClearIn. */
  netClearIn: number;
  landX: number;
  apex: TrajectoryPoint;
  /** Implied exit speed (m/s) from curvature + launch. */
  v0Ms: number;
  launchDeg: number;
  contactHeightM: number;
};

export function contactHeightM(band: StrikeBand): number {
  switch (band) {
    case "neck":
      return 1.4;
    case "chest":
      return 1.12;
    case "waist":
      return 0.82;
  }
}

export function contactHeightWindowM(band: StrikeBand): { lo: number; hi: number; mid: number } {
  const mid = contactHeightM(band);
  const span = band === "waist" ? 0.14 : band === "chest" ? 0.16 : 0.12;
  return { lo: mid - span, hi: mid + span, mid };
}

/**
 * How far in front of the torso the sweet-spot contact sits (m).
 * Flatter / eastern-style paths take it further out; steep windshields a bit closer.
 */
export function contactOutFrontM(pathDeg: number): { mid: number; lo: number; hi: number } {
  const mid = clamp(0.7 - (pathDeg - 14) * 0.0075, 0.4, 0.78);
  return { mid, lo: mid - 0.1, hi: mid + 0.08 };
}

function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}

export function computeBallTrajectory(input: {
  launchDeg: number;
  netClearIn: number;
  contactHeightM: number;
  outFrontM: number;
  topspin?: number;
}): BallTrajectory {
  void input.topspin;
  const launchDeg = clamp(input.launchDeg, 1.5, 16);
  const netClearIn = Math.max(0.5, input.netClearIn);
  const h0 = input.contactHeightM;
  const outFront = input.outFrontM;
  const netX = Math.max(8.5, BASELINE_TO_NET_M - outFront);
  // Ball *center* at the net: tape + ball radius + advertised inches over the tape.
  const heightAtNet = NET_HEIGHT_M + BALL_RADIUS_M + netClearIn * 0.0254;
  const k = Math.tan((launchDeg * Math.PI) / 180);

  // y = h0 + k x − a x² with y(netX) = heightAtNet exactly (not a freehand bezier).
  const a = (h0 + k * netX - heightAtNet) / (netX * netX);

  const yAt = (x: number) => h0 + k * x - a * x * x;

  // First bounce: y = ball radius
  const landY = BALL_RADIUS_M;
  const disc = k * k - 4 * a * (h0 - landY);
  const landX =
    a > 1e-8 && disc > 0 ? (k + Math.sqrt(disc)) / (2 * a) : netX + 6;

  const apexX = a > 1e-8 ? k / (2 * a) : netX * 0.45;
  const apex = { x: apexX, y: yAt(apexX) };

  const aAbs = Math.max(Math.abs(a), 1e-8);
  const vx = Math.sqrt(G_M_S2 / (2 * aAbs));
  const v0Ms = vx / Math.cos((launchDeg * Math.PI) / 180);

  const endX = Math.min(24, Math.max(landX, netX + 1.2));
  const n = 72;
  const points: TrajectoryPoint[] = [];
  for (let i = 0; i <= n; i++) {
    const x = (endX * i) / n;
    points.push({ x, y: Math.max(0, yAt(x)) });
  }

  return {
    points,
    netX,
    heightAtNet,
    netClearIn,
    landX,
    apex,
    v0Ms,
    launchDeg,
    contactHeightM: h0,
  };
}
