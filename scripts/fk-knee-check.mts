import { createSkeletonPose, solveSkeletonFk } from "../src/lib/skeletonFk";
import { sampleStroke } from "../src/lib/kinematics";
import { federerForehand, nadalForehand, serenaServe } from "../src/data/strokes";
import * as THREE from "three";

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

function kneeFlexDeg(
  hip: THREE.Vector3,
  knee: THREE.Vector3,
  ankle: THREE.Vector3,
): number {
  const a = new THREE.Vector3().subVectors(hip, knee).normalize();
  const b = new THREE.Vector3().subVectors(ankle, knee).normalize();
  const cos = Math.max(-1, Math.min(1, a.dot(b)));
  return ((Math.PI - Math.acos(cos)) * 180) / Math.PI;
}

function anteriorOk(
  hip: THREE.Vector3,
  knee: THREE.Vector3,
  ankle: THREE.Vector3,
  fwd: THREE.Vector3,
): boolean {
  const ha = new THREE.Vector3().subVectors(ankle, hip);
  const hk = new THREE.Vector3().subVectors(knee, hip);
  const t = hk.dot(ha) / Math.max(1e-8, ha.lengthSq());
  const off = hk.clone().addScaledVector(ha, -t);
  return off.dot(fwd) >= -0.015;
}

function scan(label: string, stroke: typeof federerForehand) {
  let sumL = 0;
  let sumT = 0;
  let maxL = 0;
  let maxT = 0;
  let n = 0;
  let reverse = 0;
  let maxKneeJump = 0;
  let prevLead: THREE.Vector3 | null = null;
  for (let i = 0; i <= 100; i++) {
    const t = i / 100;
    const s = sampleStroke(stroke, t);
    solveSkeletonFk(pose, s.joints, anthro, stroke.handedness, stroke.oneHanded);
    const leadSolved = kneeFlexDeg(pose.leadHip, pose.leadKnee, pose.leadAnkle);
    const trailSolved = kneeFlexDeg(pose.trailHip, pose.trailKnee, pose.trailAnkle);
    const eL = Math.abs(leadSolved - s.joints.leadKneeFlexion);
    const eT = Math.abs(trailSolved - s.joints.trailKneeFlexion);
    sumL += eL;
    sumT += eT;
    maxL = Math.max(maxL, eL);
    maxT = Math.max(maxT, eT);
    n++;
    if (!anteriorOk(pose.leadHip, pose.leadKnee, pose.leadAnkle, pose.leadFootFwd)) reverse++;
    if (!anteriorOk(pose.trailHip, pose.trailKnee, pose.trailAnkle, pose.trailFootFwd)) reverse++;
    if (prevLead) maxKneeJump = Math.max(maxKneeJump, pose.leadKnee.distanceTo(prevLead));
    prevLead = pose.leadKnee.clone();
  }
  console.log(
    `${label}: lead mean/max=${(sumL / n).toFixed(1)}/${maxL.toFixed(1)}°  trail mean/max=${(sumT / n).toFixed(1)}/${maxT.toFixed(1)}°  reverse=${reverse}  maxLeadKneeΔ=${maxKneeJump.toFixed(3)}`,
  );
}

scan("Federer FH", federerForehand);
scan("Nadal FH", nadalForehand);
scan("Serena serve", serenaServe);
