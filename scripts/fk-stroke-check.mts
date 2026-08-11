import { createSkeletonPose, solveSkeletonFk } from "../src/lib/skeletonFk.ts";
import {
  alcarazVolley,
  djokovicBackhand,
  federerForehand,
  federerOneHandedBackhand,
  federerSlice,
  nadalForehand,
  serenaServe,
} from "../src/data/strokes.ts";
import type { StrokeProfile } from "../src/types/biomechanics.ts";

const anthro = {
  heightM: 1.85,
  wingspanM: 1.9,
  massKg: 80,
  torsoRatio: 0.3,
  upperArmRatio: 0.174,
  forearmRatio: 0.146,
  thighRatio: 0.245,
  shankRatio: 0.246,
};

const pose = createSkeletonPose();

function check(stroke: StrokeProfile) {
  console.log(`\n=== ${stroke.label} (${stroke.handedness}) ===`);
  for (const kf of stroke.keyframes) {
    solveSkeletonFk(pose, kf.joints, anthro, stroke.handedness, stroke.oneHanded);
    const t = pose.racketTip;
    const side = t.x > 0.2 ? "RIGHT" : t.x < -0.2 ? "LEFT" : "CENTER";
    const depth = t.z < -0.2 ? "FRONT" : t.z > 0.25 ? "BACK" : "MID";
    console.log(
      kf.phase.padEnd(14),
      "tip",
      [t.x, t.y, t.z].map((n) => n.toFixed(2)).join(","),
      side.padEnd(6),
      depth.padEnd(5),
      `y=${t.y.toFixed(2)}`,
    );
  }
}

check(federerForehand);
check(nadalForehand);
check(djokovicBackhand);
check(federerOneHandedBackhand);
check(serenaServe);
check(federerSlice);
check(alcarazVolley);
