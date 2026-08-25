/**
 * Map stroke metrics (path, spin, grip, lag, GRF, contact height) onto joint
 * offsets so Form Lab poses follow player/statistics data — not just keyframe
 * clones with different labels.
 */
import type {
  JointAngles,
  StrokeMetrics,
  StrokePhase,
  StrokeProfile,
  GripType,
} from "@/types/biomechanics";

/** Neutral FH reference — deltas from these drive shaping. */
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

function gripPrep(grip: GripType): number {
  switch (grip) {
    case "western":
      return 1;
    case "semiWestern":
      return 0.45;
    case "eastern":
      return -0.2;
    case "continental":
      return -0.1;
    case "twoHanded":
      return 0.15;
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
 * Shape joints from authored metrics. Safe to call every sample — pure and
 * relative to REF so eastern/flat molds stay calm while western/steep molds
 * lift the tip toward the head and wipe harder.
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
  const grip = gripPrep(m.grip);

  // Western + steep path → tip coils up beside/toward the head in prep
  const headPrep = clamp(grip * 0.55 + pathD * 0.4 + spinD * 0.2, -0.35, 1.25);
  // Compact/linear molds (Sinner): early contact, less wipe
  const compact = clamp(-pathD * 0.35 - grip * 0.25 + (m.contactDepthM - 0.35) * 2, -0.2, 0.9);

  const band = phaseBand(phase);
  const out = { ...joints };

  if (band === "prep") {
    out.racketPathElevation += headPrep * 24 + pathD * 6 - compact * 12;
    out.shoulderFlexion += headPrep * 14 - compact * 8;
    out.elbowFlexion += headPrep * 16 - compact * 10;
    out.shoulderAbduction += pathD * 8 + grip * 5 - compact * 10;
    out.wristExtension += lagD * 14 + spinD * 8 - compact * 10;
    out.shoulderInternalRotation -= headPrep * 12 + lagD * 4;
    out.spineTwist -= xD * 7;
    out.hipYaw -= xD * 4 + pathD * 3;
    out.hipPitch += grfD * 5 + headPrep * 2;
    out.trailKneeFlexion += grfD * 10 + headPrep * 4;
    out.leadKneeFlexion += grfD * 5;
    out.pelvisSurge -= grfD * 4 + headPrep * 2;
  }

  if (band === "drive") {
    out.racketPathElevation += pathD * 14 + heightD * 10 + launchD * 4 - compact * 6;
    out.shoulderInternalRotation += pathD * 14 + grip * 12 - compact * 6;
    out.wristExtension += lagD * 12 + spinD * 6 - compact * 8;
    out.wristUlnarDeviation += pathD * 7 + grip * 4;
    out.pelvisSurge += grfD * 4 + compact * 3;
    out.shoulderFlexion += heightD * 4;
    // Early-contact molds pull contact slightly more in front (less lag carry)
    if (compact > 0.2) {
      out.elbowFlexion -= compact * 8;
      out.shoulderAbduction -= compact * 4;
    }
  }

  if (band === "finish") {
    out.wristUlnarDeviation += pathD * 10 + grip * 8 + spinD * 5 - compact * 14;
    out.shoulderInternalRotation += pathD * 10 + grip * 8 - compact * 8;
    out.racketPathElevation += pathD * 5 + heightD * 3 - compact * 4;
    out.elbowFlexion += pathD * 8 + grip * 5 - compact * 12;
    out.shoulderAbduction -= pathD * 4;
  }

  out.racketPathElevation = clamp(out.racketPathElevation, -95, 95);
  out.elbowFlexion = clamp(out.elbowFlexion, 8, 145);
  out.shoulderFlexion = clamp(out.shoulderFlexion, 0, 175);
  out.shoulderAbduction = clamp(out.shoulderAbduction, -95, 120);
  out.wristExtension = clamp(out.wristExtension, -30, 90);
  out.wristUlnarDeviation = clamp(out.wristUlnarDeviation, -25, 45);
  out.trailKneeFlexion = clamp(out.trailKneeFlexion, 5, 95);
  out.leadKneeFlexion = clamp(out.leadKneeFlexion, 5, 90);
  out.hipPitch = clamp(out.hipPitch, 0, 55);

  return out;
}
