/**
 * Thin compatibility surface. Live playback uses motion clips
 * (`src/lib/motion`) — do not grow Euler FK heuristics here.
 */
export { createSkeletonPose, type SkeletonPose } from "@/lib/motion/pose";
export { solveMotionClip as solveSkeletonFk } from "@/lib/motion/solve";
export { poseAngles } from "@/lib/motion/solve";

import type { Anthropometrics } from "@/types/biomechanics";
import { getMotionClip } from "@/data/motion";
import { sampleMotion } from "@/lib/motion/sample";
import { createSkeletonPose, type SkeletonPose } from "@/lib/motion/pose";
import type { StrokeProfile } from "@/types/biomechanics";

/** Racket tip from the clip sampler — same path as the lab / hero. */
export function estimateRacketTip(
  stroke: StrokeProfile,
  anthro: Anthropometrics,
  t: number,
  playerId?: string,
  scratch?: SkeletonPose,
): SkeletonPose {
  const pose = scratch ?? createSkeletonPose();
  const id = stroke.clipId ?? (playerId ? `${playerId}/${stroke.type}` : "");
  const clip = getMotionClip(id);
  if (!clip) return pose;
  sampleMotion(clip, stroke, anthro, t, undefined, pose);
  return pose;
}
