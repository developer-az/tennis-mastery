import { clamp01, lerpVec3, slerpQuat } from "./math";
import {
  MOTION_JOINTS,
  type MotionClip,
  type MotionJointId,
  type QuatTuple,
  type SampledClip,
  type Vec3Tuple,
} from "./types";
import type { StrokePhase } from "../../types/biomechanics";

function framePair(clip: MotionClip, t: number) {
  const x = clamp01(t);
  const n = clip.frameCount;
  if (n <= 1) return { i0: 0, i1: 0, local: 0 };
  const f = x * (n - 1);
  const i0 = Math.min(n - 2, Math.floor(f));
  const i1 = i0 + 1;
  return { i0, i1, local: f - i0 };
}

function readRoot(clip: MotionClip, i: number): Vec3Tuple {
  const o = i * 3;
  return [clip.root[o], clip.root[o + 1], clip.root[o + 2]];
}

function readQuat(clip: MotionClip, frame: number, jointIndex: number): QuatTuple {
  const o = (frame * MOTION_JOINTS.length + jointIndex) * 4;
  return [clip.quats[o], clip.quats[o + 1], clip.quats[o + 2], clip.quats[o + 3]];
}

function phaseAtClip(clip: MotionClip, t: number): StrokePhase {
  const marks = clip.phases;
  if (!marks.length) return "ready";
  let best = marks[0];
  for (const m of marks) {
    if (m.t <= t + 1e-6) best = m;
  }
  return best.phase;
}

export function sampleClip(clip: MotionClip, t: number): SampledClip {
  const { i0, i1, local } = framePair(clip, t);
  const root: Vec3Tuple = [0, 0, 0];
  lerpVec3(readRoot(clip, i0), readRoot(clip, i1), local, root);
  const quats = {} as Record<MotionJointId, QuatTuple>;
  for (let j = 0; j < MOTION_JOINTS.length; j++) {
    const id = MOTION_JOINTS[j];
    const out: QuatTuple = [0, 0, 0, 1];
    slerpQuat(readQuat(clip, i0, j), readQuat(clip, i1, j), local, out);
    quats[id] = out;
  }
  return {
    t: clamp01(t),
    root,
    quats,
    phase: phaseAtClip(clip, clamp01(t)),
  };
}
