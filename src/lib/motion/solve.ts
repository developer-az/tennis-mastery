import * as THREE from "three";
import type { Anthropometrics, StrokeType } from "../../types/biomechanics";
import {
  FOOT_Y,
  MOTION_JOINTS,
  type MotionContinuity,
  type MotionJointId,
  type QuatTuple,
  type SampledClip,
} from "./types";
import { clamp, flexionDeg, mirrorQuatYZ, packQuat, twoBoneIk, unpackQuat } from "./math";
import { createSkeletonPose, type SkeletonPose } from "./pose";
import { segmentLens } from "./segments";

const Y = new THREE.Vector3(0, 1, 0);
const NY = new THREE.Vector3(0, -1, 0);

function childOf(
  origin: THREE.Vector3,
  parentWorld: THREE.Quaternion,
  local: QuatTuple,
  bindAxis: THREE.Vector3,
  length: number,
  outPos: THREE.Vector3,
  outWorld: THREE.Quaternion,
) {
  unpackQuat(local, outWorld);
  outWorld.premultiply(parentWorld);
  outPos.copy(bindAxis).multiplyScalar(length).applyQuaternion(outWorld).add(origin);
}

/**
 * Thin hierarchical FK: local quats + anthro binds → world joints.
 * Bind: spine/head +Y; hanging limbs −Y.
 */
export function fkClipSample(
  sample: SampledClip,
  anthro: Anthropometrics,
  pose: SkeletonPose,
): SkeletonPose {
  const L = segmentLens(anthro);
  const q = sample.quats;

  const pelvisQ = new THREE.Quaternion();
  const spineQ = new THREE.Quaternion();
  const headQ = new THREE.Quaternion();
  const ltQ = new THREE.Quaternion();
  const lsQ = new THREE.Quaternion();
  const ttQ = new THREE.Quaternion();
  const tsQ = new THREE.Quaternion();
  const huQ = new THREE.Quaternion();
  const hfQ = new THREE.Quaternion();
  const hhQ = new THREE.Quaternion();
  const rkQ = new THREE.Quaternion();
  const nuQ = new THREE.Quaternion();
  const nfQ = new THREE.Quaternion();
  const nhQ = new THREE.Quaternion();

  unpackQuat(q.pelvis, pelvisQ);
  pose.pelvis.set(sample.root[0], sample.root[1], sample.root[2]);

  const off = new THREE.Vector3();
  off.set(-L.hipW / 2, 0, 0).applyQuaternion(pelvisQ);
  pose.leadHip.copy(pose.pelvis).add(off);
  off.set(L.hipW / 2, 0, 0).applyQuaternion(pelvisQ);
  pose.trailHip.copy(pose.pelvis).add(off);

  childOf(pose.leadHip, pelvisQ, q.leadThigh, NY, L.thigh, pose.leadKnee, ltQ);
  childOf(pose.leadKnee, ltQ, q.leadShank, NY, L.shank, pose.leadAnkle, lsQ);
  childOf(pose.trailHip, pelvisQ, q.trailThigh, NY, L.thigh, pose.trailKnee, ttQ);
  childOf(pose.trailKnee, ttQ, q.trailShank, NY, L.shank, pose.trailAnkle, tsQ);

  childOf(pose.pelvis, pelvisQ, q.spine, Y, L.torso, pose.chest, spineQ);
  childOf(pose.chest, spineQ, q.head, Y, L.neck, pose.head, headQ);

  off.set(L.shoulderW / 2, 0.04, 0).applyQuaternion(spineQ);
  pose.hitShoulder.copy(pose.chest).add(off);
  off.set(-L.shoulderW / 2, 0.04, 0).applyQuaternion(spineQ);
  pose.nonHitShoulder.copy(pose.chest).add(off);

  childOf(pose.hitShoulder, spineQ, q.hitUpper, NY, L.upper, pose.hitElbow, huQ);
  childOf(pose.hitElbow, huQ, q.hitFore, NY, L.fore, pose.hitWrist, hfQ);
  childOf(pose.hitWrist, hfQ, q.hitHand, NY, L.hand, pose.hitHand, hhQ);
  childOf(pose.hitHand, hhQ, q.racket, NY, L.racket, pose.racketTip, rkQ);

  childOf(pose.nonHitShoulder, spineQ, q.nonHitUpper, NY, L.upper, pose.nonHitElbow, nuQ);
  childOf(pose.nonHitElbow, nuQ, q.nonHitFore, NY, L.fore, pose.nonHitWrist, nfQ);
  childOf(pose.nonHitWrist, nfQ, q.nonHitHand, NY, L.hand, pose.nonHitHand, nhQ);

  pose.leadFootFwd.set(0, 0, -1).applyQuaternion(pelvisQ);
  pose.leadFootFwd.y = 0;
  if (pose.leadFootFwd.lengthSq() < 1e-6) pose.leadFootFwd.set(0, 0, -1);
  else pose.leadFootFwd.normalize();
  pose.trailFootFwd.copy(pose.leadFootFwd);

  const shaft = new THREE.Vector3().subVectors(pose.racketTip, pose.hitHand);
  if (shaft.lengthSq() > 1e-8) shaft.normalize();
  else shaft.set(0, 1, 0);
  const face = new THREE.Vector3(1, 0, 0).applyQuaternion(rkQ);
  face.addScaledVector(shaft, -face.dot(shaft));
  if (face.lengthSq() < 1e-8) face.set(0, 0, -1);
  else face.normalize();
  pose.racketFaceNormal.copy(face);
  pose.racketFaceRoll = Math.atan2(face.x, face.z);
  pose.hitUpperTwist = 0;
  pose.nonHitUpperTwist = 0;

  return pose;
}

function plantLeg(
  hip: THREE.Vector3,
  knee: THREE.Vector3,
  ankle: THREE.Vector3,
  thigh: number,
  shank: number,
  pole: THREE.Vector3,
  liftY: number,
) {
  ankle.y = FOOT_Y + Math.max(0, liftY);
  const reach = hip.distanceTo(ankle);
  const maxR = thigh + shank - 0.01;
  if (reach > maxR) {
    const pull = new THREE.Vector3().subVectors(ankle, hip);
    pull.setLength(reach - maxR);
    hip.add(pull);
  }
  twoBoneIk(hip, ankle, thigh, shank, pole, knee);
}

function groundClamp(p: THREE.Vector3, minY: number) {
  if (p.y < minY) p.y = minY;
}

function applyPlantAndGround(pose: SkeletonPose, anthro: Anthropometrics, stroke: StrokeType) {
  const L = segmentLens(anthro);
  const serve = stroke === "serve";
  const trailLift = serve ? Math.max(0, pose.trailAnkle.y - FOOT_Y) : 0;
  const leadLift = serve ? Math.max(0, Math.min(0.05, pose.leadAnkle.y - FOOT_Y)) : 0;

  const pole = new THREE.Vector3();
  pole.set(pose.leadHip.x - 0.12, pose.leadHip.y + 0.1, pose.leadHip.z - 0.2);
  plantLeg(pose.leadHip, pose.leadKnee, pose.leadAnkle, L.thigh, L.shank, pole, leadLift);
  pole.set(pose.trailHip.x + 0.12, pose.trailHip.y + 0.1, pose.trailHip.z + 0.14);
  plantLeg(pose.trailHip, pose.trailKnee, pose.trailAnkle, L.thigh, L.shank, pole, trailLift);

  pose.pelvis.x = (pose.leadHip.x + pose.trailHip.x) * 0.5;
  pose.pelvis.z = (pose.leadHip.z + pose.trailHip.z) * 0.5;
  pose.pelvis.y = (pose.leadHip.y + pose.trailHip.y) * 0.5;

  const floor = 0.02;
  for (const j of [
    pose.pelvis,
    pose.chest,
    pose.head,
    pose.leadHip,
    pose.leadKnee,
    pose.leadAnkle,
    pose.trailHip,
    pose.trailKnee,
    pose.trailAnkle,
    pose.hitShoulder,
    pose.hitElbow,
    pose.hitWrist,
    pose.hitHand,
    pose.nonHitShoulder,
    pose.nonHitElbow,
    pose.nonHitWrist,
    pose.nonHitHand,
    pose.racketTip,
  ]) {
    groundClamp(j, floor);
  }
  pose.leadAnkle.y = Math.max(pose.leadAnkle.y, FOOT_Y);
  pose.trailAnkle.y = Math.max(pose.trailAnkle.y, FOOT_Y);
}

function applyRacketContinuity(pose: SkeletonPose, continuity: MotionContinuity | undefined) {
  const shaft = new THREE.Vector3().subVectors(pose.racketTip, pose.hitHand);
  const len = Math.max(0.42, shaft.length());
  if (shaft.lengthSq() < 1e-8) shaft.set(0, 1, 0);
  else shaft.normalize();

  if (continuity?.prevShaft) {
    const prev = new THREE.Vector3(continuity.prevShaft.x, continuity.prevShaft.y, continuity.prevShaft.z);
    if (prev.lengthSq() > 1e-8) {
      prev.normalize();
      if (shaft.dot(prev) < -0.55) {
        shaft.negate();
        pose.racketTip.copy(pose.hitHand).addScaledVector(shaft, len);
      }
    }
  }

  if (continuity?.prevFace) {
    const face = pose.racketFaceNormal.clone();
    face.addScaledVector(shaft, -face.dot(shaft));
    const prev = new THREE.Vector3(continuity.prevFace.x, continuity.prevFace.y, continuity.prevFace.z);
    if (face.lengthSq() < 1e-8) {
      face.copy(prev);
      face.addScaledVector(shaft, -face.dot(shaft));
    }
    if (face.lengthSq() > 1e-8) face.normalize();
    if (face.dot(prev) < -0.15) face.negate();
    face.multiplyScalar(0.7).addScaledVector(prev, 0.3);
    face.addScaledVector(shaft, -face.dot(shaft));
    if (face.lengthSq() > 1e-8) pose.racketFaceNormal.copy(face.normalize());
  }

  if (continuity) {
    continuity.prevTip = { x: pose.racketTip.x, y: pose.racketTip.y, z: pose.racketTip.z };
    continuity.prevFace = {
      x: pose.racketFaceNormal.x,
      y: pose.racketFaceNormal.y,
      z: pose.racketFaceNormal.z,
    };
    continuity.prevShaft = { x: shaft.x, y: shaft.y, z: shaft.z };
  }
}

function mirrorSample(sample: SampledClip): SampledClip {
  const quats = { ...sample.quats };
  for (const id of MOTION_JOINTS) {
    quats[id] = mirrorQuatYZ(sample.quats[id], [0, 0, 0, 1]);
  }
  return {
    ...sample,
    root: [-sample.root[0], sample.root[1], sample.root[2]],
    quats,
  };
}

export function solveMotionClip(
  sample: SampledClip,
  anthro: Anthropometrics,
  opts: {
    handedness: "right" | "left";
    stroke: StrokeType;
    continuity?: MotionContinuity;
    pose?: SkeletonPose;
  },
): SkeletonPose {
  const posed = opts.pose ?? createSkeletonPose();
  const src = opts.handedness === "left" ? mirrorSample(sample) : sample;
  fkClipSample(src, anthro, posed);
  applyPlantAndGround(posed, anthro, opts.stroke);
  applyRacketContinuity(posed, opts.continuity);
  return posed;
}

export function extractLocalQuats(pose: SkeletonPose): Record<MotionJointId, QuatTuple> {
  const out = {} as Record<MotionJointId, QuatTuple>;

  const chestFlat = new THREE.Vector3().subVectors(pose.chest, pose.pelvis);
  chestFlat.y = 0;
  if (chestFlat.lengthSq() < 1e-8) chestFlat.set(0, 0, -1);
  else chestFlat.normalize();
  const yaw = Math.atan2(-chestFlat.x, -chestFlat.z);
  const rise = pose.chest.y - pose.pelvis.y;
  const run = new THREE.Vector3(pose.chest.x - pose.pelvis.x, 0, pose.chest.z - pose.pelvis.z).length();
  const pitch = -Math.atan2(run, Math.max(0.05, rise)) * 0.15;
  const pelvisQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(clamp(pitch, -0.5, 0.35), yaw, 0, "YXZ"));
  out.pelvis = packQuat(pelvisQ);

  const bone = (
    parentQ: THREE.Quaternion,
    from: THREE.Vector3,
    to: THREE.Vector3,
    bindAxis: THREE.Vector3,
  ): [QuatTuple, THREE.Quaternion] => {
    const dir = to.clone().sub(from);
    if (dir.lengthSq() < 1e-10) dir.copy(bindAxis);
    else dir.normalize();
    const world = new THREE.Quaternion().setFromUnitVectors(bindAxis, dir);
    const local = parentQ.clone().invert().multiply(world);
    return [packQuat(local), world];
  };

  const [spineT, spineQ] = bone(pelvisQ, pose.pelvis, pose.chest, Y);
  out.spine = spineT;
  const [headT] = bone(spineQ, pose.chest, pose.head, Y);
  out.head = headT;

  const [lt, ltQ] = bone(pelvisQ, pose.leadHip, pose.leadKnee, NY);
  out.leadThigh = lt;
  const [ls] = bone(ltQ, pose.leadKnee, pose.leadAnkle, NY);
  out.leadShank = ls;

  const [tt, ttQ] = bone(pelvisQ, pose.trailHip, pose.trailKnee, NY);
  out.trailThigh = tt;
  const [ts] = bone(ttQ, pose.trailKnee, pose.trailAnkle, NY);
  out.trailShank = ts;

  const [hu, huQ] = bone(spineQ, pose.hitShoulder, pose.hitElbow, NY);
  out.hitUpper = hu;
  const [hf, hfQ] = bone(huQ, pose.hitElbow, pose.hitWrist, NY);
  out.hitFore = hf;
  const [hh, hhQ] = bone(hfQ, pose.hitWrist, pose.hitHand, NY);
  out.hitHand = hh;
  const [rq] = bone(hhQ, pose.hitHand, pose.racketTip, NY);
  out.racket = rq;

  const [nu, nuQ] = bone(spineQ, pose.nonHitShoulder, pose.nonHitElbow, NY);
  out.nonHitUpper = nu;
  const [nf, nfQ] = bone(nuQ, pose.nonHitElbow, pose.nonHitWrist, NY);
  out.nonHitFore = nf;
  const [nh] = bone(nfQ, pose.nonHitWrist, pose.nonHitHand, NY);
  out.nonHitHand = nh;

  return out;
}

export function poseAngles(pose: SkeletonPose) {
  const elbow = flexionDeg(pose.hitShoulder, pose.hitElbow, pose.hitWrist);
  const leadKnee = flexionDeg(pose.leadHip, pose.leadKnee, pose.leadAnkle);
  const trailKnee = flexionDeg(pose.trailHip, pose.trailKnee, pose.trailAnkle);

  const pelvisRight = new THREE.Vector3().subVectors(pose.trailHip, pose.leadHip);
  pelvisRight.y = 0;
  const chestAcross = new THREE.Vector3().subVectors(pose.hitShoulder, pose.nonHitShoulder);
  chestAcross.y = 0;
  const pelvisFwd = new THREE.Vector3(-pelvisRight.z, 0, pelvisRight.x);
  let spineTwist = 0;
  if (pelvisFwd.lengthSq() > 1e-8 && chestAcross.lengthSq() > 1e-8) {
    pelvisFwd.normalize();
    const chestFwd = new THREE.Vector3(-chestAcross.z, 0, chestAcross.x).normalize();
    spineTwist =
      (Math.atan2(pelvisFwd.x * chestFwd.z - pelvisFwd.z * chestFwd.x, pelvisFwd.dot(chestFwd)) * 180) /
      Math.PI;
  }

  const upper = pose.hitElbow.clone().sub(pose.hitShoulder);
  const fore = pose.hitWrist.clone().sub(pose.hitElbow);
  let shoulderIR = 0;
  if (upper.lengthSq() > 1e-8 && fore.lengthSq() > 1e-8) {
    upper.normalize();
    const rest = new THREE.Vector3().crossVectors(upper, Y);
    if (rest.lengthSq() < 1e-8) rest.set(1, 0, 0);
    rest.normalize();
    const hinged = fore.addScaledVector(upper, -fore.dot(upper));
    if (hinged.lengthSq() > 1e-8) {
      hinged.normalize();
      shoulderIR =
        (Math.atan2(rest.clone().cross(hinged).dot(upper), rest.dot(hinged)) * 180) / Math.PI;
    }
  }

  return {
    elbowFlexion: elbow,
    leadKneeFlexion: leadKnee,
    trailKneeFlexion: trailKnee,
    spineTwist,
    shoulderInternalRotation: shoulderIR,
  };
}
