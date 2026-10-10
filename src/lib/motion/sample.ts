import type { Anthropometrics, StrokeProfile, StrokeType } from "@/types/biomechanics";
import type { MotionClip, MotionContinuity } from "./types";
import { poseAngles, solveMotionClip } from "./solve";
import { createSkeletonPose, type SkeletonPose } from "./pose";
import { sampleStroke, type SampledPose } from "@/lib/kinematics";
import { sampleClip } from "./clipSample";

export { sampleClip };

export type MotionAngles = ReturnType<typeof poseAngles>;

export type MotionPlayback = SampledPose & {
  pose: SkeletonPose;
  angles: MotionAngles;
  clipId: string;
};

export function sampleMotion(
  clip: MotionClip,
  stroke: StrokeProfile,
  anthro: Anthropometrics,
  t: number,
  continuity?: MotionContinuity,
  pose = createSkeletonPose(),
): MotionPlayback {
  const sampled = sampleClip(clip, t);
  const solved = solveMotionClip(sampled, anthro, {
    handedness: stroke.handedness,
    stroke: stroke.type,
    continuity,
    pose,
  });
  const meta = sampleStroke(stroke, t);
  const angles = poseAngles(solved);
  return {
    ...meta,
    pose: solved,
    angles,
    clipId: clip.id,
    joints: {
      ...meta.joints,
      elbowFlexion: angles.elbowFlexion,
      leadKneeFlexion: angles.leadKneeFlexion,
      trailKneeFlexion: angles.trailKneeFlexion,
      spineTwist: angles.spineTwist,
      shoulderInternalRotation: angles.shoulderInternalRotation,
    },
  };
}

export function sampleMotionStroke(
  getClip: (id: string) => MotionClip | undefined,
  playerId: string,
  stroke: StrokeProfile,
  anthro: Anthropometrics,
  t: number,
  continuity?: MotionContinuity,
  pose?: SkeletonPose,
): MotionPlayback {
  const clip =
    getClip(stroke.clipId ?? `${playerId}/${stroke.type}`) ??
    getClip(`${playerId}/${stroke.type as StrokeType}`);
  if (!clip) {
    throw new Error(`Missing motion clip for ${playerId}/${stroke.type}`);
  }
  return sampleMotion(clip, stroke, anthro, t, continuity, pose);
}
