import { requireMotionClip } from "../src/data/motion/index.ts";
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

function run(label: string, player: string, stroke: "forehand" | "serve" | "backhand", t: number) {
  const clip = requireMotionClip(player, stroke);
  solveMotionClip(sampleClip(clip, t), anthro, {
    handedness: player === "nadal" ? "left" : "right",
    stroke,
    pose,
  });
  const tip = pose.racketTip;
  console.log(
    label.padEnd(16),
    [tip.x, tip.y, tip.z].map((n) => n.toFixed(2)).join(","),
    "wrist",
    pose.hitWrist.y.toFixed(2),
    "head",
    pose.head.y.toFixed(2),
  );
}

run("fh ready", "federer", "forehand", 0);
run("fh contact", "federer", "forehand", 0.68);
run("bh contact", "federer", "backhand", 0.68);
run("serve trophy", "federer", "serve", 0.3);
run("serve drop", "federer", "serve", 0.44);
run("serve contact", "federer", "serve", 0.7);
