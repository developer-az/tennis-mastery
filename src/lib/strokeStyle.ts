/**
 * Map stroke metrics onto the swing PATH (tip elevation, lag, path steepness,
 * finish wipe) — not a generic “racket holding” pose. Elbow crook is reduced
 * on high prep so the forearm can rise with the tip.
 */
import type {
  JointAngles,
  StrokeMetrics,
  StrokePhase,
  StrokeProfile,
  GripType,
} from "@/types/biomechanics";

const REF = {
  swingPathDeg: 30,
  avgSpinRpm: 2800,
  contactHeightM: 1.15,
  launchAngleDeg: 8,
  proximalDistalLagMs: 35,
  xFactorDeg: 40,
  peakGrfN: 1400,
};

function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}

function gripPath(grip: GripType): number {
  switch (grip) {
    case "western":
      return 1;
    case "semiWestern":
      return 0.5;
    case "eastern":
      return -0.25;
    case "continental":
      return -0.15;
    case "twoHanded":
      return 0.1;
  }
}

function phaseBand(phase: StrokePhase): "prep" | "drive" | "finish" | "other" {
  if (phase === "ready" || phase === "unitTurn" || phase === "backswing" || phase === "trophy") {
    return "prep";
  }
  if (phase === "acceleration" || phase === "contact") return "drive";
  if (phase === "followThrough") return "finish";
  return "other";
}

/**
 * Tip-path shaping from research metrics. High path/western → tip climbs in
 * prep; eastern finish stays closed; compact molds keep a shorter loop.
 */
export function applyStrokeStyle(
  joints: JointAngles,
  stroke: StrokeProfile,
  phase: StrokePhase,
): JointAngles {
  if (stroke.type !== "forehand") return joints;

  const m: StrokeMetrics = stroke.metrics;
  const pathD = clamp((m.swingPathDeg - REF.swingPathDeg) / 20, -0.9, 1.3);
  const spinD = clamp((Math.abs(m.avgSpinRpm) - REF.avgSpinRpm) / 1200, -0.9, 1.3);
  const heightD = clamp((m.contactHeightM - REF.contactHeightM) / 0.2, -0.9, 1.2);
  const launchD = clamp((m.launchAngleDeg - REF.launchAngleDeg) / 8, -0.9, 1.2);
  const lagD = clamp(
    (m.kineticChain.proximalDistalLagMs - REF.proximalDistalLagMs) / 15,
    -0.9,
    1.2,
  );
  const xD = clamp((m.kineticChain.xFactorDeg - REF.xFactorDeg) / 15, -0.9, 1.3);
  const grfD = clamp((m.kineticChain.peakGrfN - REF.peakGrfN) / 400, -0.9, 1.3);
  const grip = gripPath(m.grip);

  // Steep path + western → tip path climbs beside/above the head
  const highLoop = clamp(grip * 0.5 + pathD * 0.5 + spinD * 0.15, -0.35, 1.3);
  // Compact first-strike molds: shorter tip path, earlier/flatter
  const compact = clamp(-pathD * 0.4 - grip * 0.2 + (m.contactDepthM - 0.35) * 2.2, -0.2, 1);

  const band = phaseBand(phase);
  const out = { ...joints };

  if (band === "prep") {
    // Tip path up — raise elev/flex; OPEN the elbow crook so forearm can rise with tip
    out.racketPathElevation += highLoop * 28 + pathD * 8 - compact * 14;
    out.shoulderFlexion += highLoop * 18 - compact * 6;
    out.shoulderAbduction += pathD * 10 + grip * 6 - compact * 12;
    out.elbowFlexion -= highLoop * 22 + compact * 4; // less hang under biceps
    out.wristExtension += lagD * 12 + spinD * 6 - compact * 8;
    out.shoulderInternalRotation -= highLoop * 10 + lagD * 4;
    // Topspin prep face stays closed (never open)
    out.racketFaceAngle -= 4 + highLoop * 4 + pathD * 2;
    out.spineTwist -= xD * 6;
    out.hipYaw -= xD * 3 + pathD * 2;
    out.hipPitch += grfD * 4;
    out.trailKneeFlexion += grfD * 8;
    out.leadKneeFlexion += grfD * 4;
    out.pelvisSurge -= grfD * 3 + highLoop * 2;
  }

  if (band === "drive") {
    // Steep ascending tip path through the ball
    out.racketPathElevation += pathD * 16 + heightD * 12 + launchD * 4 - compact * 8;
    out.shoulderInternalRotation += pathD * 12 + grip * 10;
    out.wristExtension += lagD * 10 - compact * 6;
    out.wristUlnarDeviation += pathD * 5;
    out.racketFaceAngle -= 6 + pathD * 4 + grip * 4 + heightD * 2; // closed through contact
    out.pelvisSurge += grfD * 3 + compact * 2;
    if (compact > 0.25) {
      out.elbowFlexion -= compact * 6;
      out.shoulderAbduction -= compact * 4;
    }
  }

  if (band === "finish") {
    // Finish follows the swing path: tip high across; face stays CLOSED for topspin
    // (Federer never opens the face like a slice on the FH finish)
    out.racketPathElevation += pathD * 6 + heightD * 4 - compact * 4;
    out.wristUlnarDeviation += pathD * 10 + grip * 8 - compact * 12; // wipe amount
    out.shoulderInternalRotation += pathD * 8 + grip * 6;
    out.elbowFlexion += pathD * 6 - compact * 8;
    out.racketFaceAngle -= 8 + pathD * 3 + grip * 3; // keep closed through finish
    // Kill any authored open finish for FH topspin
    if (out.racketFaceAngle > -2) out.racketFaceAngle = -2 - pathD * 2;
  }

  out.racketPathElevation = clamp(out.racketPathElevation, -95, 95);
  out.elbowFlexion = clamp(out.elbowFlexion, 8, 130);
  out.shoulderFlexion = clamp(out.shoulderFlexion, 0, 175);
  out.shoulderAbduction = clamp(out.shoulderAbduction, -95, 120);
  out.wristExtension = clamp(out.wristExtension, -30, 90);
  out.wristUlnarDeviation = clamp(out.wristUlnarDeviation, -25, 42);
  out.racketFaceAngle = clamp(out.racketFaceAngle, -30, 8);
  out.trailKneeFlexion = clamp(out.trailKneeFlexion, 5, 95);
  out.leadKneeFlexion = clamp(out.leadKneeFlexion, 5, 90);
  out.hipPitch = clamp(out.hipPitch, 0, 55);

  return out;
}
