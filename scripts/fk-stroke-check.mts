import { allMotionClips } from "../src/data/motion/index.ts";
import { sampleClip } from "../src/lib/motion/clipSample.ts";
import { solveMotionClip } from "../src/lib/motion/solve.ts";
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

for (const clip of allMotionClips()) {
  const lefty = clip.playerId === "nadal" ? "left" : "right";
  console.log(`\n=== ${clip.id} ===`);
  for (const mark of clip.phases) {
    solveMotionClip(sampleClip(clip, mark.t), anthro, {
      handedness: lefty,
      stroke: clip.stroke,
      pose,
    });
    const t = pose.racketTip;
    const side = t.x > 0.2 ? "RIGHT" : t.x < -0.2 ? "LEFT" : "CENTER";
    const depth = t.z < -0.2 ? "FRONT" : t.z > 0.25 ? "BACK" : "MID";
    console.log(
      mark.phase.padEnd(14),
      [t.x, t.y, t.z].map((n) => n.toFixed(2)).join(","),
      side.padEnd(6),
      depth.padEnd(5),
      `head=${pose.head.y.toFixed(2)}`,
    );
  }
}
