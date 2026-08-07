import * as THREE from "three";
import type { Anthropometrics, JointAngles } from "@/types/biomechanics";
import { deg } from "@/lib/kinematics";

/**
 * Local athletic space (before scene placement):
 * - +Y up
 * - +Z face-forward
 * - +X toward the right side of a right-handed player
 *
 * Keyframes are authored right-handed. Left-handed poses mirror across the
 * sagittal plane (yaw/twist signs and lateral offsets).
 *
 * FormCanvas places the athlete on the −Z baseline so local +Z faces the net at z = 0.
 */

export interface SkeletonPosePoints {
  pelvis: THREE.Vector3;
  chest: THREE.Vector3;
  head: THREE.Vector3;
  leadHip: THREE.Vector3;
  leadKnee: THREE.Vector3;
  leadAnkle: THREE.Vector3;
  trailHip: THREE.Vector3;
  trailKnee: THREE.Vector3;
  trailAnkle: THREE.Vector3;
  hitShoulder: THREE.Vector3;
  hitElbow: THREE.Vector3;
  hitWrist: THREE.Vector3;
  racketTip: THREE.Vector3;
  nonHitShoulder: THREE.Vector3;
  nonHitElbow: THREE.Vector3;
  nonHitWrist: THREE.Vector3;
}

const RACKET_LENGTH = 0.68;

function shoulderRotation(
  flexion: number,
  abduction: number,
  internalRotation: number,
  mirror: number,
): THREE.Quaternion {
  // Rest pose: upper arm hangs along (0, -1, 0) in torso space.
  // Abduction raises the arm in the frontal plane toward +X (mirrored for lefties).
  // Flexion then swings that arm toward +Z (face-forward).
  // Internal rotation twists about the humerus long axis.
  let q = new THREE.Quaternion();
  q = new THREE.Quaternion()
    .setFromAxisAngle(new THREE.Vector3(0, 0, 1), deg(abduction * mirror))
    .multiply(q);

  const localX = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
  q = new THREE.Quaternion().setFromAxisAngle(localX, -deg(flexion)).multiply(q);

  const longAxis = new THREE.Vector3(0, -1, 0).applyQuaternion(q);
  q = new THREE.Quaternion()
    .setFromAxisAngle(longAxis, deg(internalRotation * mirror))
    .multiply(q);

  return q;
}

function armChain(
  shoulder: THREE.Vector3,
  torsoQ: THREE.Quaternion,
  flex: number,
  abd: number,
  ir: number,
  elbowFlex: number,
  mirror: number,
  upperArm: number,
  forearm: number,
  racketPathElevation: number,
  racketFaceAngle: number,
  withRacket: boolean,
): { elbow: THREE.Vector3; wrist: THREE.Vector3; tip: THREE.Vector3 } {
  const shQ = shoulderRotation(flex, abd, ir, mirror);
  const upperDir = new THREE.Vector3(0, -1, 0)
    .applyQuaternion(shQ)
    .applyQuaternion(torsoQ)
    .normalize();
  const elbow = shoulder.clone().add(upperDir.clone().multiplyScalar(upperArm));

  let elbowAxis = new THREE.Vector3().crossVectors(upperDir, new THREE.Vector3(0, 1, 0));
  if (elbowAxis.lengthSq() < 1e-5) {
    elbowAxis = new THREE.Vector3()
      .crossVectors(upperDir, new THREE.Vector3(0, 0, 1).applyQuaternion(torsoQ));
  }
  if (elbowAxis.lengthSq() < 1e-5) {
    elbowAxis = new THREE.Vector3(mirror, 0, 0);
  }
  elbowAxis.normalize();

  const foreDir = upperDir
    .clone()
    .applyQuaternion(new THREE.Quaternion().setFromAxisAngle(elbowAxis, deg(elbowFlex)))
    .normalize();
  const wrist = elbow.clone().add(foreDir.clone().multiplyScalar(forearm));

  // Elevation: positive raises the tip toward +Y, negative drops it.
  // Face angle: tilts the tip laterally in the player's hitting-side direction.
  const elevRad = deg(Math.max(-80, Math.min(80, racketPathElevation)));
  const faceRad = deg(racketFaceAngle * mirror);
  const racketDir = foreDir.clone().normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const lateral = new THREE.Vector3(mirror, 0, 0).applyQuaternion(torsoQ).normalize();
  // Spherical blend keeps tip height stable regardless of handedness / arm plane.
  racketDir.addScaledVector(up, Math.sin(elevRad));
  racketDir.addScaledVector(lateral, Math.sin(faceRad) * 0.35);
  // Mild forward bias so the head stays ahead of the handle for groundstrokes.
  // Stronger bias when the tip is not intentionally elevated (contact / punch phases).
  const forwardBias = 0.22 + Math.max(0, 0.18 - Math.abs(elevRad) * 0.25);
  racketDir.addScaledVector(new THREE.Vector3(0, 0, 1).applyQuaternion(torsoQ), forwardBias);
  if (racketDir.lengthSq() < 1e-6) {
    racketDir.set(0, 0.25, 1).applyQuaternion(torsoQ);
  }
  const tip = withRacket
    ? wrist.clone().add(racketDir.normalize().multiplyScalar(RACKET_LENGTH))
    : wrist.clone();

  return { elbow, wrist, tip };
}

function bentLeg(
  hip: THREE.Vector3,
  bodyQ: THREE.Quaternion,
  hipFlex: number,
  kneeFlex: number,
  thigh: number,
  shank: number,
  side: number,
): { knee: THREE.Vector3; ankle: THREE.Vector3 } {
  // Sagittal bend: hip flex brings thigh forward; knee flex folds shank back under the thigh.
  const hipRad = deg(Math.max(0, Math.min(80, hipFlex)));
  const kneeRad = deg(Math.max(0, Math.min(140, kneeFlex)));

  const thighDir = new THREE.Vector3(
    side * 0.03,
    -Math.cos(hipRad * 0.65),
    Math.sin(hipRad * 0.65),
  )
    .applyQuaternion(bodyQ)
    .normalize();
  const knee = hip.clone().add(thighDir.clone().multiplyScalar(thigh));

  // Fold shank opposite the thigh's forward component so the foot plants under the hip.
  const lateral = new THREE.Vector3(1, 0, 0).applyQuaternion(bodyQ).normalize();
  const shankDir = thighDir
    .clone()
    .applyQuaternion(new THREE.Quaternion().setFromAxisAngle(lateral, kneeRad * 0.85))
    .normalize();
  if (shankDir.y > -0.15) {
    // Keep the foot below the knee for readable stance.
    shankDir.y = -Math.abs(shankDir.y) - 0.35;
    shankDir.normalize();
  }

  const ankle = knee.clone().add(shankDir.multiplyScalar(shank));
  // Plant on the court plane without collapsing segment length visually.
  if (ankle.y < 0.03) {
    const lift = 0.03 - ankle.y;
    knee.y += lift * 0.35;
    ankle.y = 0.03;
  }
  return { knee, ankle };
}

export function computeSkeletonPose(
  joints: JointAngles,
  anthro: Anthropometrics,
  handedness: "right" | "left",
  oneHanded: boolean,
): SkeletonPosePoints {
  const mirror = handedness === "left" ? -1 : 1;
  const H = anthro.heightM;
  const torso = H * anthro.torsoRatio;
  const upperArm = H * anthro.upperArmRatio;
  const forearm = H * anthro.forearmRatio;
  const thigh = H * anthro.thighRatio;
  const shank = H * anthro.shankRatio;
  const hipWidth = 0.28;
  const shoulderWidth = 0.4;

  const hipYaw = joints.hipYaw * mirror;
  const spineTwist = joints.spineTwist * mirror;

  const pelvis = new THREE.Vector3(0, shank + thigh * 0.12, 0);
  const bodyQ = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(deg(joints.hipPitch), deg(hipYaw), 0, "YXZ"),
  );
  const spineQ = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(deg(joints.spineLean), deg(spineTwist), 0, "YXZ"),
  );
  const torsoQ = bodyQ.clone().multiply(spineQ);

  const chest = pelvis.clone().add(new THREE.Vector3(0, torso, 0).applyQuaternion(torsoQ));
  const head = chest.clone().add(new THREE.Vector3(0, 0.28, 0).applyQuaternion(torsoQ));

  const leadHip = pelvis
    .clone()
    .add(new THREE.Vector3(-hipWidth * 0.5 * mirror, 0, 0.05).applyQuaternion(bodyQ));
  const trailHip = pelvis
    .clone()
    .add(new THREE.Vector3(hipWidth * 0.5 * mirror, 0, -0.05).applyQuaternion(bodyQ));

  const lead = bentLeg(
    leadHip,
    bodyQ,
    joints.leadHipFlexion,
    joints.leadKneeFlexion,
    thigh,
    shank,
    -mirror,
  );
  const trail = bentLeg(
    trailHip,
    bodyQ,
    joints.trailHipFlexion,
    joints.trailKneeFlexion,
    thigh,
    shank,
    mirror,
  );

  const hitShoulder = chest
    .clone()
    .add(new THREE.Vector3(shoulderWidth * 0.5 * mirror, 0.04, 0).applyQuaternion(torsoQ));
  const nonHitShoulder = chest
    .clone()
    .add(new THREE.Vector3(-shoulderWidth * 0.5 * mirror, 0.04, 0).applyQuaternion(torsoQ));

  const hit = armChain(
    hitShoulder,
    torsoQ,
    joints.shoulderFlexion,
    joints.shoulderAbduction,
    joints.shoulderInternalRotation,
    joints.elbowFlexion,
    mirror,
    upperArm,
    forearm,
    joints.racketPathElevation,
    joints.racketFaceAngle,
    true,
  );

  const non = armChain(
    nonHitShoulder,
    torsoQ,
    joints.nonHittingShoulderFlexion,
    18,
    0,
    joints.nonHittingElbowFlexion,
    mirror,
    upperArm,
    forearm,
    0,
    0,
    false,
  );

  let nonHitElbow = non.elbow;
  let nonHitWrist = non.wrist;
  if (!oneHanded) {
    nonHitWrist = non.wrist.clone().lerp(hit.wrist, 0.55);
    nonHitElbow = non.elbow.clone().lerp(hit.elbow, 0.35);
  }

  return {
    pelvis,
    chest,
    head,
    leadHip,
    leadKnee: lead.knee,
    leadAnkle: lead.ankle,
    trailHip,
    trailKnee: trail.knee,
    trailAnkle: trail.ankle,
    hitShoulder,
    hitElbow: hit.elbow,
    hitWrist: hit.wrist,
    racketTip: hit.tip,
    nonHitShoulder,
    nonHitElbow,
    nonHitWrist,
  };
}
