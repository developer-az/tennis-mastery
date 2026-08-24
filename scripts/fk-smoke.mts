import { createSkeletonPose, solveSkeletonFk } from "../src/lib/skeletonFk.ts";
import type { JointAngles } from "../src/types/biomechanics.ts";

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
const base: JointAngles = {
  hipYaw: 0,
  hipPitch: 0,
  pelvisSurge: 0,
  pelvisSway: 0,
  spineTwist: 0,
  spineLean: 5,
  shoulderFlexion: 30,
  shoulderAbduction: 18,
  shoulderInternalRotation: 0,
  elbowFlexion: 50,
  wristExtension: 12,
  wristUlnarDeviation: 0,
  leadKneeFlexion: 25,
  trailKneeFlexion: 25,
  leadHipFlexion: 20,
  trailHipFlexion: 20,
  ankleDorsiflexion: 10,
  leadAnkleDorsiflexion: 10,
  trailAnkleDorsiflexion: 10,
  leadFootLift: 0,
  trailFootLift: 0,
  nonHittingShoulderFlexion: 25,
  nonHittingShoulderAbduction: 28,
  nonHittingShoulderInternalRotation: 0,
  nonHittingElbowFlexion: 45,
  racketFaceAngle: 0,
  racketPathElevation: 25,
};

function run(name: string, partial: Partial<JointAngles>) {
  const j = { ...base, ...partial };
  solveSkeletonFk(pose, j, anthro, "right", true);
  const t = pose.racketTip;
  const side = t.x > 0.2 ? "RIGHT" : t.x < -0.2 ? "LEFT" : "CENTER";
  const depth = t.z < -0.2 ? "FRONT" : t.z > 0.25 ? "BACK" : "MID";
  console.log(
    name.padEnd(10),
    "tip",
    [t.x, t.y, t.z].map((n) => n.toFixed(2)).join(","),
    side,
    depth,
    "wristY",
    pose.hitWrist.y.toFixed(2),
    "shY",
    pose.hitShoulder.y.toFixed(2),
  );
}

run("ready", {
  shoulderFlexion: 48,
  shoulderAbduction: 22,
  elbowFlexion: 55,
  racketPathElevation: 40,
});
run("fhBS", {
  hipYaw: -48,
  spineTwist: -30,
  shoulderFlexion: 28,
  shoulderAbduction: 105,
  shoulderInternalRotation: -20,
  elbowFlexion: 95,
  wristExtension: 58,
  racketPathElevation: 58,
});
run("fhACC", {
  hipYaw: -12,
  spineTwist: 8,
  shoulderFlexion: 50,
  shoulderAbduction: 78,
  shoulderInternalRotation: 28,
  elbowFlexion: 52,
  wristExtension: 68,
  racketPathElevation: 8,
});
run("fhC", {
  hipYaw: 18,
  spineTwist: 22,
  spineLean: 6,
  shoulderFlexion: 62,
  shoulderAbduction: 62,
  shoulderInternalRotation: 48,
  elbowFlexion: 30,
  wristExtension: 8,
  racketPathElevation: 22,
});
run("fhFT", {
  hipYaw: 42,
  spineTwist: 38,
  shoulderFlexion: 155,
  shoulderAbduction: -15,
  elbowFlexion: 80,
  wristExtension: -18,
  racketPathElevation: 82,
});
run("bhBS", {
  hipYaw: 58,
  spineTwist: 40,
  shoulderFlexion: 65,
  shoulderAbduction: -70,
  shoulderInternalRotation: -35,
  elbowFlexion: 100,
  wristExtension: 40,
  racketPathElevation: 52,
});
run("bhC", {
  hipYaw: -8,
  spineTwist: -16,
  shoulderFlexion: 72,
  shoulderAbduction: -52,
  shoulderInternalRotation: 12,
  elbowFlexion: 28,
  wristExtension: 10,
  racketPathElevation: 16,
});
run("bhFT", {
  hipYaw: -32,
  spineTwist: -28,
  shoulderFlexion: 150,
  shoulderAbduction: 35,
  elbowFlexion: 70,
  wristExtension: -8,
  racketPathElevation: 70,
});
run("srvT", {
  hipYaw: -32,
  spineTwist: -22,
  spineLean: -14,
  shoulderFlexion: 160,
  shoulderAbduction: 70,
  shoulderInternalRotation: -85,
  elbowFlexion: 95,
  wristExtension: 20,
  racketPathElevation: 88,
  leadKneeFlexion: 75,
  trailKneeFlexion: 78,
});
run("srvDrop", {
  hipYaw: -22,
  spineTwist: -12,
  spineLean: -4,
  shoulderFlexion: 168,
  shoulderAbduction: 95,
  shoulderInternalRotation: -125,
  elbowFlexion: 40,
  wristExtension: 38,
  racketPathElevation: -75,
  leadKneeFlexion: 30,
});
run("srvC", {
  hipYaw: 12,
  spineTwist: 24,
  spineLean: 14,
  shoulderFlexion: 178,
  shoulderAbduction: 15,
  shoulderInternalRotation: 95,
  elbowFlexion: 6,
  wristExtension: 0,
  racketPathElevation: 95,
});
run("srvFT", {
  hipYaw: 38,
  spineTwist: 40,
  spineLean: 22,
  shoulderFlexion: 70,
  shoulderAbduction: 25,
  shoulderInternalRotation: 115,
  elbowFlexion: 65,
  wristExtension: -12,
  racketPathElevation: -30,
});
run("sliceBS", {
  hipYaw: 52,
  spineTwist: 36,
  shoulderFlexion: 120,
  shoulderAbduction: -55,
  elbowFlexion: 28,
  wristExtension: -6,
  racketPathElevation: 78,
  racketFaceAngle: 38,
});
run("sliceC", {
  hipYaw: 2,
  spineTwist: -6,
  shoulderFlexion: 68,
  shoulderAbduction: -42,
  elbowFlexion: 22,
  wristExtension: -16,
  racketPathElevation: 12,
  racketFaceAngle: 42,
});
run("volC", {
  hipYaw: 6,
  spineTwist: 5,
  shoulderFlexion: 68,
  shoulderAbduction: 42,
  elbowFlexion: 44,
  wristExtension: 4,
  racketPathElevation: 44,
  racketFaceAngle: 2,
});
