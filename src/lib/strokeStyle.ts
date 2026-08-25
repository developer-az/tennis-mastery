/**
 * Map stroke metrics onto the tip PATH using tour-typical ranges.
 *
 * Real FH takebacks are compact (elbow tucked ~55–75° abd) — tip climbs via
 * elevation/flexion, not wing-flared abduction. Western/high-RPM molds lift the
 * tip beside the head while keeping the elbow closer to the ribs.
 *
 * Contrasting prep archetypes (research-aligned):
 * - Djokovic: longer upright tip above the hands, hands more inside, gravity drop
 * - Sinner: shorter/lower tip beside the hip–shoulder, compact flip/lag
 * - Nadal/Alcaraz: tip high beside the skull, but laterally compact (not wing-spread)
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

/** Tour-typical FH takeback abduction (degrees) — not a wing flare. */
const ABD_PREP_MIN = 54;
const ABD_PREP_MAX = 74;

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
 * Tip-path shaping from research metrics.
 * - High path / western → tip up (compact elbow)
 * - High lag / upright prep (Djokovic) → tip above the hands
 * - Compact / early depth (Sinner) → lower tip beside the hip, more lag flip
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

  // Steep path + western → tip climbs beside/above the head (still compact laterally)
  const highLoop = clamp(grip * 0.5 + pathD * 0.5 + spinD * 0.15, -0.35, 1.3);
  // Compact first-strike / early-contact molds (Sinner): shorter, lower tip path
  const compact = clamp(-pathD * 0.35 - grip * 0.15 + (m.contactDepthM - 0.35) * 2.4, -0.2, 1);
  // Upright prep (Djokovic-style): tip above hands, gravity drop — higher lag, less compact flip
  const upright = clamp(lagD * 0.9 - compact * 0.75 + (pathD < 0.2 ? 0.35 : 0), -0.3, 1.15);

  const band = phaseBand(phase);
  const out = { ...joints };

  if (band === "prep") {
    // Tip path: climb via elev/flex — tuck abd so the elbow stays near the ribs
    out.racketPathElevation +=
      highLoop * 16 + upright * 14 - compact * 20 + pathD * 2;
    out.shoulderFlexion += highLoop * 10 + upright * 8 - compact * 10;
    // Critical: high loops are COMPACT — reduce flare, don't add wing abd
    out.shoulderAbduction +=
      -highLoop * 8 - upright * 6 + (grip < 0 ? 2 : 0) + (compact > 0.2 ? 4 : 0);
    out.elbowFlexion += upright * 8 - highLoop * 6 - compact * 2;
    out.wristExtension += lagD * 10 + spinD * 4 + compact * 10 - upright * 2;
    out.shoulderInternalRotation -= highLoop * 8 + lagD * 4 - compact * 4;
    out.racketFaceAngle -= 4 + highLoop * 3 + pathD * 2;
    out.spineTwist -= xD * 5;
    out.hipYaw -= xD * 3 + pathD * 2;
    out.hipPitch += grfD * 4;
    out.trailKneeFlexion += grfD * 8;
    out.leadKneeFlexion += grfD * 4;
    out.pelvisSurge -= grfD * 3 + highLoop * 2;
    // Tour prep abd by archetype — high tip ≠ wing flare
    let abdLo = ABD_PREP_MIN;
    let abdHi = ABD_PREP_MAX;
    if (highLoop > 0.45) {
      // Western / steep path: tip high, elbow tucked ~58–68°
      abdLo = 58;
      abdHi = 68;
    } else if (upright > 0.4) {
      // Upright tip-above-hands: hands more inside ~54–64°
      abdLo = 54;
      abdHi = 64;
    } else if (compact > 0.25) {
      // Compact/side flip: slightly more outside, still not flared
      abdLo = 64;
      abdHi = 74;
    }
    out.shoulderAbduction = clamp(out.shoulderAbduction, abdLo, abdHi);
  }

  if (band === "drive") {
    out.racketPathElevation += pathD * 14 + heightD * 10 + launchD * 4 - compact * 8 + upright * 2;
    out.shoulderInternalRotation += pathD * 10 + grip * 8;
    out.wristExtension += lagD * 8 + compact * 6 - upright * 4;
    out.wristUlnarDeviation += pathD * 4;
    out.racketFaceAngle -= 6 + pathD * 3 + grip * 3 + heightD * 2;
    out.pelvisSurge += grfD * 3 + compact * 2;
    out.shoulderAbduction = clamp(out.shoulderAbduction, 50, 86);
  }

  if (band === "finish") {
    out.racketPathElevation += pathD * 5 + heightD * 3 - compact * 4;
    out.wristUlnarDeviation += pathD * 9 + grip * 7 - compact * 10;
    out.shoulderInternalRotation += pathD * 7 + grip * 5;
    out.elbowFlexion += pathD * 5 - compact * 6;
    out.racketFaceAngle -= 8 + pathD * 2 + grip * 2;
    if (out.racketFaceAngle > -2) out.racketFaceAngle = -2 - pathD * 2;
  }

  out.racketPathElevation = clamp(out.racketPathElevation, -95, 95);
  out.elbowFlexion = clamp(out.elbowFlexion, 8, 120);
  out.shoulderFlexion = clamp(out.shoulderFlexion, 0, 170);
  out.shoulderAbduction = clamp(out.shoulderAbduction, -95, 95);
  out.wristExtension = clamp(out.wristExtension, -30, 90);
  out.wristUlnarDeviation = clamp(out.wristUlnarDeviation, -25, 42);
  out.racketFaceAngle = clamp(out.racketFaceAngle, -30, 8);
  out.trailKneeFlexion = clamp(out.trailKneeFlexion, 5, 95);
  out.leadKneeFlexion = clamp(out.leadKneeFlexion, 5, 90);
  out.hipPitch = clamp(out.hipPitch, 0, 55);

  return out;
}
