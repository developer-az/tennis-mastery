import type { StrokePhase, StrokeType } from "@/types/biomechanics";

/** Local-quaternion bones. Bind axis is +Y parent→child except hanging limbs (−Y). */
export const MOTION_JOINTS = [
  "pelvis",
  "spine",
  "head",
  "leadThigh",
  "leadShank",
  "trailThigh",
  "trailShank",
  "hitUpper",
  "hitFore",
  "hitHand",
  "nonHitUpper",
  "nonHitFore",
  "nonHitHand",
  "racket",
] as const;

export type MotionJointId = (typeof MOTION_JOINTS)[number];

export type QuatTuple = [number, number, number, number];
export type Vec3Tuple = [number, number, number];

export interface MotionPhaseMark {
  phase: StrokePhase;
  t: number;
}

/** Dense packed clip — local joint quaternions + root translation. */
export interface MotionClip {
  id: string;
  playerId: string;
  stroke: StrokeType;
  oneHanded: boolean;
  /** Authored as right-handed. Lefty is mirrored at sample time. */
  authoredHand: "right";
  frameCount: number;
  /** frameCount × 3 */
  root: number[];
  /** frameCount × joints × 4, joint order = MOTION_JOINTS */
  quats: number[];
  phases: MotionPhaseMark[];
}

export interface SampledClip {
  t: number;
  root: Vec3Tuple;
  quats: Record<MotionJointId, QuatTuple>;
  phase: StrokePhase;
}

export interface MotionContinuity {
  prevTip: { x: number; y: number; z: number } | null;
  prevFace: { x: number; y: number; z: number } | null;
  prevShaft: { x: number; y: number; z: number } | null;
}

export function createMotionContinuity(): MotionContinuity {
  return { prevTip: null, prevFace: null, prevShaft: null };
}

export const FOOT_Y = 0.03;
export const RACKET_LEN = 0.58;
export const HAND_LEN = 0.08;
export const REF_HEIGHT = 1.85;
