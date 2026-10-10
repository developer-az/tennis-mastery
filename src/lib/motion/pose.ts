import * as THREE from "three";

/**
 * World-space armature used by the lab renderer.
 * Frame: +X right, +Y up, −Z toward net.
 */
export interface SkeletonPose {
  pelvis: THREE.Vector3;
  chest: THREE.Vector3;
  head: THREE.Vector3;
  leadHip: THREE.Vector3;
  leadKnee: THREE.Vector3;
  leadAnkle: THREE.Vector3;
  trailHip: THREE.Vector3;
  trailKnee: THREE.Vector3;
  trailAnkle: THREE.Vector3;
  leadFootFwd: THREE.Vector3;
  trailFootFwd: THREE.Vector3;
  hitShoulder: THREE.Vector3;
  hitElbow: THREE.Vector3;
  hitWrist: THREE.Vector3;
  hitHand: THREE.Vector3;
  racketTip: THREE.Vector3;
  racketFaceNormal: THREE.Vector3;
  racketFaceRoll: number;
  hitUpperTwist: number;
  nonHitUpperTwist: number;
  nonHitShoulder: THREE.Vector3;
  nonHitElbow: THREE.Vector3;
  nonHitWrist: THREE.Vector3;
  nonHitHand: THREE.Vector3;
}

export function createSkeletonPose(): SkeletonPose {
  return {
    pelvis: new THREE.Vector3(),
    chest: new THREE.Vector3(),
    head: new THREE.Vector3(),
    leadHip: new THREE.Vector3(),
    leadKnee: new THREE.Vector3(),
    leadAnkle: new THREE.Vector3(),
    trailHip: new THREE.Vector3(),
    trailKnee: new THREE.Vector3(),
    trailAnkle: new THREE.Vector3(),
    leadFootFwd: new THREE.Vector3(0, 0, -1),
    trailFootFwd: new THREE.Vector3(0, 0, -1),
    hitShoulder: new THREE.Vector3(),
    hitElbow: new THREE.Vector3(),
    hitWrist: new THREE.Vector3(),
    hitHand: new THREE.Vector3(),
    racketTip: new THREE.Vector3(),
    racketFaceNormal: new THREE.Vector3(0, 0, -1),
    racketFaceRoll: 0,
    hitUpperTwist: 0,
    nonHitUpperTwist: 0,
    nonHitShoulder: new THREE.Vector3(),
    nonHitElbow: new THREE.Vector3(),
    nonHitWrist: new THREE.Vector3(),
    nonHitHand: new THREE.Vector3(),
  };
}

export function copyPose(src: SkeletonPose, dst: SkeletonPose): SkeletonPose {
  dst.pelvis.copy(src.pelvis);
  dst.chest.copy(src.chest);
  dst.head.copy(src.head);
  dst.leadHip.copy(src.leadHip);
  dst.leadKnee.copy(src.leadKnee);
  dst.leadAnkle.copy(src.leadAnkle);
  dst.trailHip.copy(src.trailHip);
  dst.trailKnee.copy(src.trailKnee);
  dst.trailAnkle.copy(src.trailAnkle);
  dst.leadFootFwd.copy(src.leadFootFwd);
  dst.trailFootFwd.copy(src.trailFootFwd);
  dst.hitShoulder.copy(src.hitShoulder);
  dst.hitElbow.copy(src.hitElbow);
  dst.hitWrist.copy(src.hitWrist);
  dst.hitHand.copy(src.hitHand);
  dst.racketTip.copy(src.racketTip);
  dst.racketFaceNormal.copy(src.racketFaceNormal);
  dst.racketFaceRoll = src.racketFaceRoll;
  dst.hitUpperTwist = src.hitUpperTwist;
  dst.nonHitUpperTwist = src.nonHitUpperTwist;
  dst.nonHitShoulder.copy(src.nonHitShoulder);
  dst.nonHitElbow.copy(src.nonHitElbow);
  dst.nonHitWrist.copy(src.nonHitWrist);
  dst.nonHitHand.copy(src.nonHitHand);
  return dst;
}
