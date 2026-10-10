import type { StrokeType } from "@/types/biomechanics";
import type { MotionClip } from "@/lib/motion/types";
import type { PlayerMotionId } from "@/lib/motion/author";
import { MOTION_CLIPS } from "./registry";

const cache = new Map<string, MotionClip>(MOTION_CLIPS.map((c) => [c.id, c]));

export function getMotionClip(id: string): MotionClip | undefined {
  return cache.get(id);
}

export function clipIdFor(playerId: string, stroke: StrokeType): string {
  return `${playerId}/${stroke}`;
}

export function requireMotionClip(playerId: PlayerMotionId | string, stroke: StrokeType): MotionClip {
  const id = clipIdFor(playerId, stroke);
  const clip = getMotionClip(id);
  if (!clip) throw new Error(`Motion clip not found: ${id}`);
  return clip;
}

export function allMotionClips(): MotionClip[] {
  return MOTION_CLIPS;
}
