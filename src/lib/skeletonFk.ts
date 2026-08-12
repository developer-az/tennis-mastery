import * as THREE from "three";
import type { Anthropometrics, JointAngles } from "@/types/biomechanics";
import { deg } from "@/lib/kinematics";

/**
 * Advanced stick-figure FK for tennis Form Lab.
 *
 * World frame (hipYaw = 0, facing the net):
 *   +X = player's right   +Y = up   -Z = toward net (forward)
 *
 * Kinetic-chain aware:
 *   - Legs use hipPitch + per-leg hip/knee flex with proper thigh→shank fold
 *   - Hitting arm: spherical shoulder + continuous elbow hinge + humeral IR twist
 *   - Lead/off arm: independent abd/flex/IR (counterbalance, toss, 2HBH)
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
  hitShoulder: THREE.Vector3;
  hitElbow: THREE.Vector3;
  hitWrist: THREE.Vector3;
  racketTip: THREE.Vector3;
  racketFaceNormal: THREE.Vector3;
  racketFaceRoll: number;
  /** Humeral long-axis twist (rad) for upper-arm mesh roll. */
  hitUpperTwist: number;
  nonHitUpperTwist: number;
  nonHitShoulder: THREE.Vector3;
  nonHitElbow: THREE.Vector3;
  nonHitWrist: THREE.Vector3;
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
    hitShoulder: new THREE.Vector3(),
    hitElbow: new THREE.Vector3(),
    hitWrist: new THREE.Vector3(),
    racketTip: new THREE.Vector3(),
    racketFaceNormal: new THREE.Vector3(0, 0, -1),
    racketFaceRoll: 0,
    hitUpperTwist: 0,
    nonHitUpperTwist: 0,
    nonHitShoulder: new THREE.Vector3(),
    nonHitElbow: new THREE.Vector3(),
    nonHitWrist: new THREE.Vector3(),
  };
}

const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _dir = new THREE.Vector3();
const _fdir = new THREE.Vector3();
const _rdir = new THREE.Vector3();
const _axis = new THREE.Vector3();
const _back = new THREE.Vector3();
const _tmp = new THREE.Vector3();
const _tmp2 = new THREE.Vector3();
const _preferred = new THREE.Vector3();
const _face = new THREE.Vector3();
const _thigh = new THREE.Vector3();
const _shank = new THREE.Vector3();

function yawBasis(yaw: number, forward: THREE.Vector3, right: THREE.Vector3) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  forward.set(-s, 0, -c);
  right.set(c, 0, -s);
}

function rotateAround(v: THREE.Vector3, axis: THREE.Vector3, angle: number) {
  _tmp2.copy(v).applyAxisAngle(axis, angle);
  v.copy(_tmp2);
}

function smooth01(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

/**
 * Continuous elbow hinge through overhead + takeback.
 * Soft-blends world-up → body-side reference so groundstrokes stay stable and
 * serves don't hard-switch (which caused ~180° forearm flips).
 * `takebackW` biases the fold so the elbow points down/back like a real unit turn.
 */
function elbowHingeAxis(
  upperDir: THREE.Vector3,
  right: THREE.Vector3,
  forward: THREE.Vector3,
  mirror: number,
  out: THREE.Vector3,
  takebackW = 0,
): THREE.Vector3 {
  const overheadW = smooth01((Math.abs(upperDir.dot(_up)) - 0.78) / 0.16);
  // Mild carrying-angle bias keeps the fold human (not a perfect mathematical plane)
  _preferred.copy(_up).multiplyScalar(1 - overheadW * 0.85);
  _preferred.addScaledVector(forward, -mirror * overheadW * 0.55);
  _preferred.addScaledVector(right, mirror * 0.14 * (1 - overheadW));
  // Takeback: fold so the elbow drops slightly behind the hip line (not a side kink)
  _preferred.addScaledVector(forward, -0.35 * takebackW);
  _preferred.addScaledVector(_up, 0.45 * takebackW);
  if (_preferred.lengthSq() < 1e-8) {
    _preferred.copy(forward).multiplyScalar(-mirror);
  }
  out.crossVectors(upperDir, _preferred);
  if (out.lengthSq() < 1e-6) {
    out.copy(right).multiplyScalar(mirror);
    out.addScaledVector(upperDir, -upperDir.dot(out));
  }
  if (out.lengthSq() < 1e-8) {
    out.crossVectors(upperDir, forward);
  }
  out.normalize();
  return out;
}

/**
 * Anatomical bent leg: thigh hinges from hip, shank folds at knee toward ground.
 * `stanceFwd` > 0 = foot more toward net; `flare` = lateral out.
 */
function placeBentLeg(
  hip: THREE.Vector3,
  outKnee: THREE.Vector3,
  outAnkle: THREE.Vector3,
  thighLen: number,
  shankLen: number,
  hipFlexRad: number,
  kneeFlexRad: number,
  anklePitchRad: number,
  forward: THREE.Vector3,
  right: THREE.Vector3,
  flare: number,
): void {
  // Clamp to athletic ranges so stick-figure knees never hyperextend / lock oddly
  const hipF = Math.max(0.02, Math.min(1.35, hipFlexRad));
  const kneeF = Math.max(0.08, Math.min(2.2, kneeFlexRad));

  // Thigh: from hip, hinged forward by hip flexion (sit/load) with slight external flare
  _thigh
    .copy(_up)
    .multiplyScalar(-Math.cos(hipF))
    .addScaledVector(forward, Math.sin(hipF) * 0.92)
    .addScaledVector(right, flare + Math.sin(hipF) * flare * 0.4)
    .normalize();
  outKnee.copy(hip).addScaledVector(_thigh, thighLen);

  // Shank: anatomical knee hinge — fold in the sagittal plane of the thigh
  const shankFold = kneeF * 0.94;
  _shank.copy(_thigh);
  _axis.crossVectors(_thigh, right);
  if (_axis.lengthSq() < 1e-6) _axis.crossVectors(_thigh, forward);
  _axis.normalize();
  rotateAround(_shank, _axis, shankFold);
  // Plant foot under knee / slightly toward net — avoids "boomerang" shanks
  const plant = Math.sin(shankFold);
  _shank.addScaledVector(_up, -0.42 * plant);
  _shank.addScaledVector(forward, 0.18 * Math.sin(anklePitchRad) + 0.12 * plant);
  _shank.addScaledVector(right, -flare * 0.35 * plant);
  _shank.normalize();
  outAnkle.copy(outKnee).addScaledVector(_shank, shankLen);
  outAnkle.y = Math.max(0.02, outAnkle.y);
}

export function solveSkeletonFk(
  out: SkeletonPose,
  j: JointAngles,
  anthro: Anthropometrics,
  handedness: "right" | "left",
  oneHanded: boolean,
): void {
  const mirror = handedness === "left" ? -1 : 1;
  const H = anthro.heightM;
  const torsoLen = H * anthro.torsoRatio;
  const upperArm = H * anthro.upperArmRatio;
  const forearm = H * anthro.forearmRatio;
  const thigh = H * anthro.thighRatio;
  const shank = H * anthro.shankRatio;
  const hipWidth = 0.28;
  const shoulderWidth = 0.42;

  const yaw = deg(j.hipYaw * mirror);
  const twist = deg(j.spineTwist * mirror);
  const lean = deg(j.spineLean);
  const hipPitch = deg(Math.max(0, Math.min(55, j.hipPitch)));

  yawBasis(yaw, _fwd, _right);

  // Sit into the legs — pelvis drops slightly with hipPitch + average knee bend
  const avgKnee = (j.leadKneeFlexion + j.trailKneeFlexion) * 0.5;
  const sit = Math.sin(hipPitch) * thigh * 0.22 + Math.sin(deg(avgKnee)) * shank * 0.08;
  out.pelvis.set(0, Math.max(0.55, shank + thigh * 0.18 - sit), 0);

  _dir
    .copy(_up)
    .multiplyScalar(Math.cos(lean) * torsoLen)
    .addScaledVector(_fwd, Math.sin(lean) * torsoLen);
  out.chest.copy(out.pelvis).add(_dir);
  out.head.copy(out.chest).addScaledVector(_up, 0.28).addScaledVector(_fwd, lean * 0.05);

  // --- Legs ---
  // Lead = front / net-side foot (contralateral to hitting side for open athletic base)
  out.leadHip
    .copy(out.pelvis)
    .addScaledVector(_right, -hipWidth * 0.5 * mirror)
    .addScaledVector(_fwd, 0.05 + Math.sin(hipPitch) * 0.03);
  out.trailHip
    .copy(out.pelvis)
    .addScaledVector(_right, hipWidth * 0.5 * mirror)
    .addScaledVector(_fwd, -0.04 - Math.sin(hipPitch) * 0.02);

  const leadHipF = deg(j.leadHipFlexion) + hipPitch * 0.65;
  const trailHipF = deg(j.trailHipFlexion) + hipPitch * 0.55;
  const leadKnee = deg(j.leadKneeFlexion);
  const trailKnee = deg(j.trailKneeFlexion);
  const ankle = deg(j.ankleDorsiflexion);

  placeBentLeg(
    out.leadHip,
    out.leadKnee,
    out.leadAnkle,
    thigh,
    shank,
    leadHipF,
    leadKnee,
    ankle + leadKnee * 0.25,
    _fwd,
    _right,
    -mirror * 0.06,
  );
  placeBentLeg(
    out.trailHip,
    out.trailKnee,
    out.trailAnkle,
    thigh,
    shank,
    trailHipF,
    trailKnee,
    trailKnee * 0.2,
    _fwd,
    _right,
    mirror * 0.05,
  );

  // --- Shoulders / X-factor ---
  const shYaw = yaw + twist * 0.32;
  yawBasis(yaw, _fwd, _right);
  const xFactorShift = Math.sin(twist) * 0.18;

  out.hitShoulder
    .copy(out.chest)
    .addScaledVector(_right, shoulderWidth * 0.5 * mirror)
    .addScaledVector(_up, 0.05)
    .addScaledVector(_fwd, 0.02 - xFactorShift);
  out.nonHitShoulder
    .copy(out.chest)
    .addScaledVector(_right, -shoulderWidth * 0.5 * mirror)
    .addScaledVector(_up, 0.05)
    .addScaledVector(_fwd, 0.02 + xFactorShift);

  yawBasis(shYaw, _fwd, _right);

  // --- Hitting arm ---
  // Spherical shoulder: flexion in sagittal, abduction in frontal, then humeral twist.
  const flex = deg(j.shoulderFlexion);
  const abd = deg(j.shoulderAbduction);
  const irDegSigned = j.shoulderInternalRotation * mirror;
  const ir = deg(irDegSigned);
  out.hitUpperTwist = ir * 0.62;

  // Horizontal-adduction bias during coiled takeback keeps the upper arm connected to the torso
  const erLoad = smooth01((-j.shoulderInternalRotation - 5) / 40);
  const abdMag = Math.abs(j.shoulderAbduction);
  const takebackW =
    erLoad * smooth01((abdMag - 35) / 55) * smooth01((90 - Math.abs(j.shoulderFlexion - 40)) / 70);
  const horizAdd = deg(12 * takebackW); // pull arm slightly across / behind

  _dir
    .set(0, 0, 0)
    .addScaledVector(_right, mirror * Math.sin(abd - horizAdd * Math.sign(abd || 1) * 0.15))
    .addScaledVector(_up, -Math.cos(abd) * Math.cos(flex))
    .addScaledVector(_fwd, Math.cos(abd) * Math.sin(flex) - Math.sin(horizAdd) * 0.55)
    .normalize();
  // Mild IR/ER also rolls the upper-arm aim (not just forearm) — more human twist
  rotateAround(_dir, _right, ir * 0.08 * (1 - takebackW));
  _dir.normalize();
  out.hitElbow.copy(out.hitShoulder).addScaledVector(_dir, upperArm);

  _fdir.copy(_dir);
  const elbow = deg(Math.max(8, Math.min(148, j.elbowFlexion)));
  const overheadW = smooth01((Math.abs(_dir.dot(_up)) - 0.78) / 0.16);

  elbowHingeAxis(_dir, _right, _fwd, mirror, _axis, takebackW * (1 - overheadW));
  // Soft fold — sin ease avoids stick kinks at both full flex and near extension
  const elbowEase = 0.9 + 0.06 * Math.sin(elbow);
  rotateAround(_fdir, _axis, -elbow * elbowEase);

  // Carrying angle (~12°) — forearm valgus so elbows don't look locked in one plane
  const carry = deg(11) * mirror * (1 - overheadW * 0.7);
  rotateAround(_fdir, _dir, carry * 0.35);

  _back.set(_fwd.x, 0, _fwd.z);
  if (_back.lengthSq() > 0.04) {
    _back.normalize().multiplyScalar(-1);
    // Takeback slot: forearm behind the hitting hip, tip ready to loop
    _fdir.addScaledVector(_back, 0.38 * Math.sin(elbow) * takebackW * (1 - overheadW));
    _fdir.addScaledVector(_up, 0.14 * takebackW * (1 - overheadW));
    _fdir.addScaledVector(_right, mirror * 0.08 * takebackW * (1 - overheadW));
    // Overhead scratch-back
    _fdir.addScaledVector(_back, 0.26 * Math.sin(elbow) * overheadW);
  }
  // Groundstroke slot: mild forward/up so the arm doesn't collapse into the torso
  _fdir.addScaledVector(_fwd, 0.12 * Math.sin(elbow) * (1 - overheadW) * (1 - takebackW));
  _fdir.addScaledVector(_up, 0.07 * Math.sin(elbow) * (1 - overheadW));

  // Humeral IR/ER is the main twist through the kinetic chain (cocking → pronation)
  rotateAround(_fdir, _dir, ir * (0.88 + 0.1 * takebackW));
  _fdir.normalize();
  out.hitWrist.copy(out.hitElbow).addScaledVector(_fdir, forearm);

  // --- Racket tip ---
  const elevRad = deg(Math.max(-95, Math.min(95, j.racketPathElevation)));
  const faceDeg = j.racketFaceAngle * mirror;
  const ulnarDeg = j.wristUlnarDeviation * mirror;
  const face = faceDeg / 45;
  const ulnar = ulnarDeg / 40;
  const lag = j.wristExtension / 70;

  _rdir.set(_fdir.x, 0, _fdir.z);
  const horizLen = Math.sqrt(_rdir.lengthSq());
  const aimBlend = smooth01((0.1 - horizLen) / 0.08);
  if (horizLen > 1e-6) _rdir.multiplyScalar(1 / horizLen);
  else _rdir.copy(_fwd);
  _rdir.multiplyScalar(1 - aimBlend).addScaledVector(_fwd, aimBlend).normalize();
  _rdir.multiplyScalar(Math.cos(elevRad));
  _rdir.y = Math.sin(elevRad);

  if (lag > 0) {
    _tmp.set(_fdir.x, 0, _fdir.z);
    if (_tmp.lengthSq() > 0.04) {
      _tmp.normalize();
      _rdir.addScaledVector(_tmp, -lag * 0.3);
    }
    _rdir.addScaledVector(_up, lag * 0.24);
  } else if (lag < 0) {
    _rdir.addScaledVector(_fwd, -lag * 0.5);
  }

  _rdir.addScaledVector(_right, face * 0.12 - ulnar * 0.28);
  _rdir.addScaledVector(_up, ulnar * 0.08);
  _rdir.normalize();

  out.racketTip.copy(out.hitWrist).addScaledVector(_rdir, 0.62);

  const irDeg = j.shoulderInternalRotation * mirror;
  out.racketFaceRoll = deg(faceDeg + irDeg * 0.3 + ulnarDeg * 0.45);

  _face.copy(_fwd).addScaledVector(_rdir, -_rdir.dot(_fwd));
  const faceAimW = smooth01((0.18 - Math.sqrt(Math.max(0, _face.lengthSq()))) / 0.14);
  _preferred.copy(_up).addScaledVector(_rdir, -_rdir.dot(_up));
  if (_face.lengthSq() > 1e-8) _face.normalize();
  else _face.set(0, 0, 0);
  if (_preferred.lengthSq() > 1e-8) _preferred.normalize();
  else _preferred.copy(_right).multiplyScalar(mirror);
  if (_face.lengthSq() < 0.5) _face.copy(_preferred);
  else _face.multiplyScalar(1 - faceAimW).addScaledVector(_preferred, faceAimW).normalize();
  rotateAround(_face, _rdir, out.racketFaceRoll);
  out.racketFaceNormal.copy(_face).normalize();

  // --- Lead / non-hitting arm (independent DOFs) ---
  // Counterbalance on groundstrokes, toss arm on serve, second hand on 2HBH.
  const nhFlex = deg(j.nonHittingShoulderFlexion);
  const nhAbd = deg(j.nonHittingShoulderAbduction ?? 28);
  const nhIr = deg((j.nonHittingShoulderInternalRotation ?? 0) * -mirror);
  out.nonHitUpperTwist = nhIr * 0.55;

  _dir
    .set(0, 0, 0)
    .addScaledVector(_right, -mirror * Math.sin(nhAbd))
    .addScaledVector(_up, -Math.cos(nhAbd) * Math.cos(nhFlex))
    .addScaledVector(_fwd, Math.cos(nhAbd) * Math.sin(nhFlex))
    .normalize();
  // Pointing / across-body bias when flexion is mid-range (unit-turn balance arm)
  const nhOverheadW = smooth01((Math.abs(_dir.dot(_up)) - 0.78) / 0.16);
  const pointW =
    smooth01((j.nonHittingShoulderFlexion - 40) / 50) * (1 - nhOverheadW);
  _dir.addScaledVector(_fwd, 0.12 * pointW);
  _dir.addScaledVector(_right, -mirror * 0.08 * pointW);
  _dir.normalize();
  out.nonHitElbow.copy(out.nonHitShoulder).addScaledVector(_dir, upperArm * 0.95);

  _fdir.copy(_dir);
  const nhElbow = deg(Math.max(5, Math.min(145, j.nonHittingElbowFlexion)));
  elbowHingeAxis(_dir, _right, _fwd, -mirror, _axis, 0);
  rotateAround(_fdir, _axis, -nhElbow * 0.92);
  rotateAround(_fdir, _dir, nhIr * 0.9 + deg(-8) * -mirror * 0.2);
  _fdir.normalize();
  out.nonHitWrist.copy(out.nonHitElbow).addScaledVector(_fdir, forearm * 0.95);

  if (!oneHanded) {
    // Two-handed: both hands share the handle — blend without collapsing the elbow
    out.nonHitWrist.lerp(out.hitWrist, 0.72);
    out.nonHitElbow.lerp(out.hitElbow, 0.32);
  }
}

export function estimateRacketTip(
  target: THREE.Vector3,
  j: JointAngles,
  anthro: Anthropometrics,
  handedness: "right" | "left",
  oneHanded: boolean,
  scratch?: SkeletonPose,
): THREE.Vector3 {
  const pose = scratch ?? createSkeletonPose();
  solveSkeletonFk(pose, j, anthro, handedness, oneHanded);
  return target.copy(pose.racketTip);
}
