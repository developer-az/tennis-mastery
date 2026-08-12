import type { JointAngles, PhaseKeyframe, StrokePhase, StrokeProfile } from "@/types/biomechanics";

const JOINT_KEYS = Object.keys({
  hipYaw: 0,
  hipPitch: 0,
  pelvisSurge: 0,
  pelvisSway: 0,
  spineTwist: 0,
  spineLean: 0,
  shoulderFlexion: 0,
  shoulderAbduction: 0,
  shoulderInternalRotation: 0,
  elbowFlexion: 0,
  wristExtension: 0,
  wristUlnarDeviation: 0,
  leadKneeFlexion: 0,
  trailKneeFlexion: 0,
  leadHipFlexion: 0,
  trailHipFlexion: 0,
  ankleDorsiflexion: 0,
  nonHittingShoulderFlexion: 0,
  nonHittingShoulderAbduction: 0,
  nonHittingShoulderInternalRotation: 0,
  nonHittingElbowFlexion: 0,
  racketFaceAngle: 0,
  racketPathElevation: 0,
}) as (keyof JointAngles)[];

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t));
}

/** Smoothstep for cinematic interpolation between keyframes */
export function smoothstep(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

/**
 * Shortest-path angular lerp in degrees (handles ±180 wraps).
 * Uses the direct delta when keyframes already agree within ±180°.
 */
export function lerpAngleDeg(a: number, b: number, t: number): number {
  const direct = b - a;
  let delta = direct;
  if (Math.abs(direct) > 180) {
    delta = ((b - a + 540) % 360) - 180;
  }
  return a + delta * t;
}

const ANGLE_WRAP_KEYS = new Set<keyof JointAngles>([
  "hipYaw",
  "spineTwist",
  "shoulderInternalRotation",
  "nonHittingShoulderInternalRotation",
  "racketFaceAngle",
  "racketPathElevation",
  "wristUlnarDeviation",
]);

/**
 * Joint interpolation: light ease (smoother than raw step, less hesitation than
 * full smoothstep endpoints) + shortest-path for wrap-prone angles.
 * Avoid Catmull–Rom here — overshoot drove arms through elbow singularities.
 */
export function lerpJoints(a: JointAngles, b: JointAngles, t: number): JointAngles {
  // Ease in/out without zeroing derivatives as hard as smoothstep (keeps kinetic chain moving)
  const x = clamp01(t);
  const s = x * x * (2 - x); // softer than smoothstep; non-zero end slope
  const out = { ...a };
  for (const key of JOINT_KEYS) {
    out[key] = ANGLE_WRAP_KEYS.has(key)
      ? lerpAngleDeg(a[key], b[key], s)
      : lerp(a[key], b[key], s);
  }
  return out;
}

export interface SampledPose {
  t: number;
  phase: StrokePhase;
  joints: JointAngles;
  racketSpeedMs: number;
  spinRpm: number;
  coachingCue: string;
  /** Progress within current phase 0–1 */
  phaseProgress: number;
  keyframeIndex: number;
}

export function sampleStroke(stroke: StrokeProfile, t: number): SampledPose {
  const frames = stroke.keyframes;
  const x = clamp01(t);

  if (frames.length === 0) {
    throw new Error("Stroke has no keyframes");
  }
  if (x <= frames[0].t) {
    return {
      t: x,
      phase: frames[0].phase,
      joints: frames[0].joints,
      racketSpeedMs: frames[0].racketSpeedMs,
      spinRpm: frames[0].spinRpm,
      coachingCue: frames[0].coachingCue,
      phaseProgress: 0,
      keyframeIndex: 0,
    };
  }
  if (x >= frames[frames.length - 1].t) {
    const last = frames[frames.length - 1];
    return {
      t: x,
      phase: last.phase,
      joints: last.joints,
      racketSpeedMs: last.racketSpeedMs,
      spinRpm: last.spinRpm,
      coachingCue: last.coachingCue,
      phaseProgress: 1,
      keyframeIndex: frames.length - 1,
    };
  }

  let i = 0;
  while (i < frames.length - 1 && frames[i + 1].t < x) i++;
  const a = frames[i];
  const b = frames[i + 1];
  const span = b.t - a.t || 1;
  const local = (x - a.t) / span;

  return {
    t: x,
    phase: local < 0.5 ? a.phase : b.phase,
    joints: lerpJoints(a.joints, b.joints, local),
    racketSpeedMs: lerp(a.racketSpeedMs, b.racketSpeedMs, local),
    spinRpm: local < 0.5 ? a.spinRpm : b.spinRpm,
    coachingCue: local < 0.5 ? a.coachingCue : b.coachingCue,
    phaseProgress: local,
    keyframeIndex: i,
  };
}

export function totalStrokeDurationMs(stroke: StrokeProfile): number {
  return stroke.keyframes.reduce((sum, k) => sum + k.durationMs, 0);
}

export function phaseAt(stroke: StrokeProfile, t: number): PhaseKeyframe {
  const sampled = sampleStroke(stroke, t);
  return stroke.keyframes[sampled.keyframeIndex];
}

export const PHASE_LABELS: Record<StrokePhase, string> = {
  ready: "Ready",
  unitTurn: "Unit Turn",
  backswing: "Backswing",
  trophy: "Trophy Pose",
  acceleration: "Acceleration",
  contact: "Contact",
  followThrough: "Follow-Through",
  recovery: "Recovery",
};

/** Degrees → radians */
export function deg(d: number): number {
  return (d * Math.PI) / 180;
}
