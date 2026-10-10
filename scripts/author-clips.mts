/**
 * Bake authored motion clips to JSON under src/data/motion/<player>/<stroke>.json
 * and print continuity / serve / plant checks.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { authorAllClips } from "../src/lib/motion/author.ts";
import { sampleClip } from "../src/lib/motion/clipSample.ts";
import { poseAngles, solveMotionClip } from "../src/lib/motion/solve.ts";
import { createMotionContinuity } from "../src/lib/motion/types.ts";
import { createSkeletonPose } from "../src/lib/motion/pose.ts";
import type { StrokeType } from "../src/types/biomechanics.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const clips = authorAllClips(96);
for (const clip of clips) {
  const dest = join(root, "src/data/motion", `${clip.id}.json`);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, `${JSON.stringify(clip)}\n`);
  console.log("wrote", dest.replace(`${root}/`, ""), "frames", clip.frameCount);
}

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

function scan(playerId: string, strokeType: StrokeType, handedness: "right" | "left" = "right") {
  const clip = clips.find((c) => c.id === `${playerId}/${strokeType}`)!;
  const cont = createMotionContinuity();
  let minAnkle = 99;
  let minTipY = 99;
  let maxTipY = -99;
  let maxKneeJump = 0;
  let prevKnee: number | null = null;
  let maxTipJump = 0;
  let prevTip: { x: number; y: number; z: number } | null = null;

  for (let i = 0; i <= 80; i++) {
    const t = i / 80;
    const sampled = sampleClip(clip, t);
    solveMotionClip(sampled, anthro, { handedness, stroke: strokeType, continuity: cont, pose });
    const tip = pose.racketTip;
    const angles = poseAngles(pose);
    minTipY = Math.min(minTipY, tip.y);
    maxTipY = Math.max(maxTipY, tip.y);
    minAnkle = Math.min(minAnkle, pose.leadAnkle.y, pose.trailAnkle.y);
    if (prevKnee != null) maxKneeJump = Math.max(maxKneeJump, Math.abs(angles.leadKneeFlexion - prevKnee));
    prevKnee = angles.leadKneeFlexion;
    if (prevTip) {
      maxTipJump = Math.max(maxTipJump, Math.hypot(tip.x - prevTip.x, tip.y - prevTip.y, tip.z - prevTip.z));
    }
    prevTip = { x: tip.x, y: tip.y, z: tip.z };
    if (strokeType === "serve" && Math.abs(t - 0.7) < 0.02) {
      console.log(
        `  ${playerId} serve@${t.toFixed(2)} tipY=${tip.y.toFixed(2)} headY=${pose.head.y.toFixed(2)} above=${(tip.y - pose.head.y).toFixed(2)}`,
      );
    }
    if (strokeType !== "serve" && Math.abs(t - 0.68) < 0.02) {
      console.log(
        `  ${playerId} ${strokeType}@${t.toFixed(2)} tip=${tip.x.toFixed(2)},${tip.y.toFixed(2)},${tip.z.toFixed(2)}`,
      );
    }
  }
  console.log(
    `${playerId}/${strokeType} minAnkle=${minAnkle.toFixed(3)} tipY[${minTipY.toFixed(2)}..${maxTipY.toFixed(2)}] kneeJump=${maxKneeJump.toFixed(1)} tipJump=${maxTipJump.toFixed(3)}`,
  );
}

scan("federer", "forehand");
scan("federer", "backhand");
scan("federer", "serve");
scan("nadal", "forehand", "left");
scan("nadal", "serve", "left");
scan("djokovic", "backhand");
