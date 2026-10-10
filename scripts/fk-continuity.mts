/**
 * Scan clip timelines for knee pop, tip flip, unplanted feet, serve peak.
 */
import { allMotionClips } from "../src/data/motion/index.ts";
import { sampleClip } from "../src/lib/motion/clipSample.ts";
import { poseAngles, solveMotionClip } from "../src/lib/motion/solve.ts";
import { createMotionContinuity } from "../src/lib/motion/types.ts";
import { createSkeletonPose } from "../src/lib/motion/pose.ts";

const anthro = {
  heightM: 1.85,
  wingspanM: 1.9,
  massKg: 80,
  torsoRatio: 0.3,
  upperArmRatio: 0.186,
  forearmRatio: 0.146,
  thighRatio: 0.245,
  shankRatio: 0.246,
};

const pose = createSkeletonPose();

function scan(clip: ReturnType<typeof allMotionClips>[number], handedness: "right" | "left", steps = 120) {
  const cont = createMotionContinuity();
  let maxKneeJump = 0;
  let maxTipJump = 0;
  let minAnkle = 99;
  let maxTipY = -99;
  let minTipY = 99;
  let prevKnee: number | null = null;
  let prevTip: { x: number; y: number; z: number } | null = null;
  let prevFace: { x: number; y: number; z: number } | null = null;
  let maxFaceFlip = 0;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const sampled = sampleClip(clip, t);
    solveMotionClip(sampled, anthro, { handedness, stroke: clip.stroke, continuity: cont, pose });
    const a = poseAngles(pose);
    if (prevKnee != null) maxKneeJump = Math.max(maxKneeJump, Math.abs(a.leadKneeFlexion - prevKnee));
    prevKnee = a.leadKneeFlexion;
    const tip = pose.racketTip;
    minAnkle = Math.min(minAnkle, pose.leadAnkle.y, pose.trailAnkle.y);
    maxTipY = Math.max(maxTipY, tip.y);
    minTipY = Math.min(minTipY, tip.y);
    if (prevTip) maxTipJump = Math.max(maxTipJump, Math.hypot(tip.x - prevTip.x, tip.y - prevTip.y, tip.z - prevTip.z));
    prevTip = { x: tip.x, y: tip.y, z: tip.z };
    if (prevFace) {
      const d = pose.racketFaceNormal.x * prevFace.x + pose.racketFaceNormal.y * prevFace.y + pose.racketFaceNormal.z * prevFace.z;
      maxFaceFlip = Math.min(maxFaceFlip, d);
    }
    prevFace = { x: pose.racketFaceNormal.x, y: pose.racketFaceNormal.y, z: pose.racketFaceNormal.z };
  }

  const serveOk = clip.stroke !== "serve" || maxTipY > pose.head.y + 0.35;
  const plantOk = minAnkle >= 0.029;
  const kneeOk = maxKneeJump < 18;
  const tipOk = maxTipJump < 0.45;
  const status = serveOk && plantOk && kneeOk && tipOk ? "ok" : "WARN";
  console.log(
    status.padEnd(4),
    clip.id.padEnd(22),
    `ankle=${minAnkle.toFixed(3)}`,
    `tipY[${minTipY.toFixed(2)}..${maxTipY.toFixed(2)}]`,
    `kneeΔ=${maxKneeJump.toFixed(1)}`,
    `tipΔ=${maxTipJump.toFixed(3)}`,
    `faceMin=${maxFaceFlip.toFixed(2)}`,
    clip.stroke === "serve" ? `serveAbove=${(maxTipY - 1.6).toFixed(2)}` : "",
  );
}

for (const clip of allMotionClips()) {
  const lefty = clip.playerId === "nadal";
  scan(clip, lefty ? "left" : "right");
}
