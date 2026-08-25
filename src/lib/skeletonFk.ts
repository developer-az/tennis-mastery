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
 *   - Feet plant in court space (trail back, lead forward) so a unit turn
 *     rotates over a base instead of spinning a crouch
 *   - Pelvis height from two-bone reach — athletic hinge on the load, stand into contact
 *   - Trunk lags the hips (X-factor); shoulders/arms lag the trunk
 *   - Hitting elbow stays on the wing; lead arm points then tucks
 *   - Collision catcher keeps tip/shaft clear of torso and head
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
  /** Plantigrade toe direction (court XZ) for foot meshes. */
  leadFootFwd: THREE.Vector3;
  trailFootFwd: THREE.Vector3;
  hitShoulder: THREE.Vector3;
  hitElbow: THREE.Vector3;
  hitWrist: THREE.Vector3;
  hitHand: THREE.Vector3;
  racketTip: THREE.Vector3;
  racketFaceNormal: THREE.Vector3;
  racketFaceRoll: number;
  /** Humeral long-axis twist (rad) for upper-arm mesh roll. */
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
const _leadFwd = new THREE.Vector3();
const _trailFwd = new THREE.Vector3();
const _clear = new THREE.Vector3();

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

/** Authored serve-like overhead (high flex + high abd) — allows deeper trophy sit. */
function overheadAuthGuess(j: JointAngles): number {
  return (
    smooth01((j.shoulderFlexion - 125) / 45) *
    smooth01((Math.abs(j.shoulderAbduction) - 55) / 35)
  );
}

/**
 * Elbow hinge: 1-DOF fold about upperArm × wingOut.
 * Polarity is locked to the hitting wing so the axis never flips mid-swing
 * (flips were the post-contact / recovery racket glitches).
 */
function elbowHingeAxis(
  upperDir: THREE.Vector3,
  right: THREE.Vector3,
  forward: THREE.Vector3,
  mirror: number,
  out: THREE.Vector3,
  takebackW = 0,
  swingW = 0,
): THREE.Vector3 {
  const overheadW = smooth01((Math.abs(upperDir.dot(_up)) - 0.78) / 0.16);
  // Wing-out is the stable reference; blend a little up (loop) / forward (swing)
  _preferred
    .copy(right)
    .multiplyScalar(mirror)
    .addScaledVector(_up, 0.55 * takebackW * (1 - swingW) * (1 - overheadW))
    .addScaledVector(forward, 0.35 * swingW + 0.1);
  _preferred.addScaledVector(upperDir, -upperDir.dot(_preferred));
  if (_preferred.lengthSq() < 1e-8) {
    _preferred.copy(forward).addScaledVector(upperDir, -upperDir.dot(forward));
  }
  if (_preferred.lengthSq() < 1e-8) {
    _preferred.copy(right).multiplyScalar(mirror);
  }
  _preferred.normalize();
  out.crossVectors(upperDir, _preferred);
  if (out.lengthSq() < 1e-8) {
    out.crossVectors(upperDir, forward);
  }
  out.normalize();
  return out;
}

const FOOT_Y = 0.03;
/** Court axes — feet plant here so a unit turn is rotation over a base, not a spin. */
const _courtFwd = new THREE.Vector3(0, 0, -1);
const _courtRight = new THREE.Vector3(1, 0, 0);

/** Hip–ankle chord for a given knee flexion (0 = straight). */
function legChord(thighLen: number, shankLen: number, kneeFlexRad: number): number {
  const k = Math.max(0.08, Math.min(2.45, kneeFlexRad));
  return Math.sqrt(
    thighLen * thighLen + shankLen * shankLen + 2 * thighLen * shankLen * Math.cos(k),
  );
}

/** Pelvis height that realizes `kneeFlex` over a planted ankle (two-bone). */
function hipHeightForPlant(
  hipX: number,
  hipZ: number,
  ankleX: number,
  ankleZ: number,
  kneeFlexRad: number,
  thighLen: number,
  shankLen: number,
): number {
  const d = legChord(thighLen, shankLen, kneeFlexRad);
  const horiz = Math.hypot(hipX - ankleX, hipZ - ankleZ);
  const span = Math.min(horiz, d - 0.012);
  return FOOT_Y + Math.sqrt(Math.max(0, d * d - span * span));
}

function restoreLen(from: THREE.Vector3, to: THREE.Vector3, len: number) {
  _tmp.subVectors(to, from);
  if (_tmp.lengthSq() < 1e-10) return;
  _tmp.normalize();
  to.copy(from).addScaledVector(_tmp, len);
}

/**
 * Keep the elbow on the hitting wing — never collapsed into the ribs.
 */
function wingElbow(
  shoulder: THREE.Vector3,
  elbow: THREE.Vector3,
  chest: THREE.Vector3,
  right: THREE.Vector3,
  mirror: number,
  minLat: number,
  upperArm: number,
): void {
  _tmp.subVectors(elbow, chest);
  const lat = _tmp.dot(right) * mirror;
  if (lat < minLat) {
    elbow.addScaledVector(right, (minLat - lat) * mirror);
    restoreLen(shoulder, elbow, upperArm);
  }
}

/**
 * Two-bone plant IK: realize authored knee flexion while keeping the ankle on court.
 * Human plantigrade rule — knee bends toward the toes (anterior to hip–ankle), never reverse.
 */
function anteriorScore(
  knee: THREE.Vector3,
  hip: THREE.Vector3,
  ankle: THREE.Vector3,
  stanceFwd: THREE.Vector3,
): number {
  _tmp.subVectors(ankle, hip);
  const haLenSq = _tmp.lengthSq();
  if (haLenSq < 1e-10) return knee.dot(stanceFwd);
  _tmp2.subVectors(knee, hip);
  const t = _tmp2.dot(_tmp) / haLenSq;
  _tmp2.addScaledVector(_tmp, -t);
  // Anterior toes matter most; lightly penalize knees that climb above the hip
  return _tmp2.dot(stanceFwd) * 2.2 + Math.min(0, hip.y - knee.y) * 1.4;
}

/**
 * Place knee on the two-sphere intersection with locked hip + ankle.
 * Always prefers plantigrade (toes) and never leaves the knee above the hip.
 * Any polish rotates about hip→ankle so BOTH bone lengths stay exact.
 */
function placeKneeTwoBone(
  hip: THREE.Vector3,
  ankle: THREE.Vector3,
  thighLen: number,
  shankLen: number,
  stanceFwd: THREE.Vector3,
  right: THREE.Vector3,
  outKnee: THREE.Vector3,
): void {
  const maxR = thighLen + shankLen - 0.006;
  const minR = Math.abs(thighLen - shankLen) + 0.03;
  _thigh.subVectors(ankle, hip);
  const realDist = _thigh.length();
  if (realDist < 1e-6) {
    outKnee.copy(hip).addScaledVector(stanceFwd, 0.1);
    outKnee.y = hip.y - thighLen * 0.55;
    restoreLen(hip, outKnee, thighLen);
    return;
  }
  _dir.copy(_thigh).multiplyScalar(1 / realDist);

  if (realDist >= maxR) {
    outKnee.copy(hip).addScaledVector(_dir, thighLen);
    return;
  }
  if (realDist <= minR) {
    outKnee.copy(hip).addScaledVector(stanceFwd, thighLen * 0.35);
    outKnee.y = hip.y - thighLen * 0.75;
    if (outKnee.y < FOOT_Y + 0.12) outKnee.y = FOOT_Y + 0.12;
    restoreLen(hip, outKnee, thighLen);
    return;
  }

  const cosThigh =
    (thighLen * thighLen + realDist * realDist - shankLen * shankLen) /
    (2 * thighLen * realDist);
  const along = thighLen * Math.max(-1, Math.min(1, cosThigh));
  const rise = Math.sqrt(Math.max(0, thighLen * thighLen - along * along));
  // Circle center in _shank — anteriorScore clobbers _tmp/_tmp2
  _shank.copy(hip).addScaledVector(_dir, along);

  _preferred.copy(stanceFwd).addScaledVector(_dir, -_dir.dot(stanceFwd));
  if (_preferred.lengthSq() < 1e-8) {
    _preferred.copy(_up).addScaledVector(_dir, -_dir.dot(_up));
  }
  if (_preferred.lengthSq() < 1e-8) {
    _preferred.copy(right).addScaledVector(_dir, -_dir.dot(right));
  }
  _preferred.normalize();
  _axis.crossVectors(_dir, _preferred);
  if (_axis.lengthSq() < 1e-8) {
    _axis.set(1, 0, 0).addScaledVector(_dir, -_dir.x);
    if (_axis.lengthSq() < 1e-8) _axis.set(0, 0, 1);
  }
  _axis.normalize();

  let bestScore = -Infinity;
  let bestAng = 0;
  for (let i = 0; i < 24; i++) {
    const ang = (i / 24) * Math.PI * 2;
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    outKnee
      .copy(_shank)
      .addScaledVector(_preferred, rise * c)
      .addScaledVector(_axis, rise * s);
    const ant = anteriorScore(outKnee, hip, ankle, stanceFwd);
    const below = hip.y - outKnee.y;
    const score = ant + (below >= 0.025 ? 4 : below * 16) - Math.max(0, -below) * 25;
    if (score > bestScore) {
      bestScore = score;
      bestAng = ang;
    }
  }
  {
    const c = Math.cos(bestAng);
    const s = Math.sin(bestAng);
    outKnee
      .copy(_shank)
      .addScaledVector(_preferred, rise * c)
      .addScaledVector(_axis, rise * s);
  }

  if (outKnee.y > hip.y - 0.02 && rise > 1e-5) {
    _clear.copy(_up).multiplyScalar(-1).addScaledVector(_dir, _dir.dot(_up));
    if (_clear.lengthSq() < 1e-8) {
      _clear.copy(stanceFwd).addScaledVector(_dir, -_dir.dot(stanceFwd));
    }
    if (_clear.lengthSq() > 1e-8) {
      _clear.normalize();
      _thigh.subVectors(outKnee, _shank);
      _thigh.multiplyScalar(0.35).addScaledVector(_clear, rise * 0.65);
      _thigh.addScaledVector(_dir, -_thigh.dot(_dir));
      if (_thigh.lengthSq() > 1e-8) {
        _thigh.normalize().multiplyScalar(rise);
        outKnee.copy(_shank).add(_thigh);
      }
    }
  }
}

function plantLegIk(
  hip: THREE.Vector3,
  plantX: number,
  plantZ: number,
  thighLen: number,
  shankLen: number,
  stanceFwd: THREE.Vector3,
  right: THREE.Vector3,
  _flare: number,
  targetKneeFlexRad: number,
  ankleDorsiRad: number,
  outKnee: THREE.Vector3,
  outAnkle: THREE.Vector3,
): void {
  const flex = Math.max(0.12, Math.min(2.35, targetKneeFlexRad));
  const dorsi = Math.max(0, Math.min(0.55, ankleDorsiRad));
  const maxR = thighLen + shankLen - 0.012;
  const minR = Math.abs(thighLen - shankLen) + 0.05;

  // Feet stay planted — do NOT slide ankles under the hip (that popped knees L/R).
  outAnkle.set(plantX, FOOT_Y, plantZ);
  outAnkle.addScaledVector(stanceFwd, dorsi * 0.02);

  _tmp.subVectors(outAnkle, hip);
  let dist = _tmp.length();
  // Soft chord trim only when plant is clearly longer than authored flexion
  const targetChord = Math.max(minR, Math.min(maxR, legChord(thighLen, shankLen, flex)));
  if (dist > targetChord + 0.05) {
    const hipH = Math.max(0.05, hip.y - FOOT_Y);
    const wantHoriz = Math.sqrt(Math.max(0, targetChord * targetChord - hipH * hipH));
    _tmp2.set(outAnkle.x - hip.x, 0, outAnkle.z - hip.z);
    const h = _tmp2.length();
    if (h > wantHoriz + 0.025 && h > 1e-6) {
      const s = 1 - (0.28 * (h - wantHoriz)) / h;
      outAnkle.x = hip.x + _tmp2.x * s;
      outAnkle.z = hip.z + _tmp2.z * s;
      outAnkle.y = FOOT_Y;
    }
  }

  placeKneeTwoBone(hip, outAnkle, thighLen, shankLen, stanceFwd, right, outKnee);

  // Re-lock plant after any numeric drift — never stretch the shank by moving the ankle
  outAnkle.x = plantX + stanceFwd.x * dorsi * 0.02;
  outAnkle.z = plantZ + stanceFwd.z * dorsi * 0.02;
  outAnkle.y = FOOT_Y;
  placeKneeTwoBone(hip, outAnkle, thighLen, shankLen, stanceFwd, right, outKnee);
}

function shiftY(out: SkeletonPose, dy: number) {
  out.pelvis.y += dy;
  out.chest.y += dy;
  out.head.y += dy;
  out.leadHip.y += dy;
  out.leadKnee.y += dy;
  out.leadAnkle.y += dy;
  out.trailHip.y += dy;
  out.trailKnee.y += dy;
  out.trailAnkle.y += dy;
  out.hitShoulder.y += dy;
  out.hitElbow.y += dy;
  out.hitWrist.y += dy;
  out.hitHand.y += dy;
  out.racketTip.y += dy;
  out.nonHitShoulder.y += dy;
  out.nonHitElbow.y += dy;
  out.nonHitWrist.y += dy;
  out.nonHitHand.y += dy;
}

/** Dual-support polish — re-solve knees with locked plants (no stretch / shoot-up). */
function groundPose(
  out: SkeletonPose,
  thighLen: number,
  shankLen: number,
  leadFwd: THREE.Vector3,
  trailFwd: THREE.Vector3,
): void {
  const lockXLead = out.leadAnkle.x;
  const lockZLead = out.leadAnkle.z;
  const lockXTrail = out.trailAnkle.x;
  const lockZTrail = out.trailAnkle.z;
  out.leadAnkle.set(lockXLead, FOOT_Y, lockZLead);
  out.trailAnkle.set(lockXTrail, FOOT_Y, lockZTrail);
  placeKneeTwoBone(
    out.leadHip,
    out.leadAnkle,
    thighLen,
    shankLen,
    leadFwd,
    _courtRight,
    out.leadKnee,
  );
  placeKneeTwoBone(
    out.trailHip,
    out.trailAnkle,
    thighLen,
    shankLen,
    trailFwd,
    _courtRight,
    out.trailKnee,
  );
  out.leadAnkle.set(lockXLead, FOOT_Y, lockZLead);
  out.trailAnkle.set(lockXTrail, FOOT_Y, lockZTrail);
}

/**
 * Coaching-grade collision catcher: push tip clear of torso capsule + head sphere.
 * Never moves the gripping hand — the racket is owned by hitHand.
 */
function clearRacketFromBody(out: SkeletonPose, mirror: number): void {
  const headR = 0.14;
  const torsoR = 0.11;
  const shaftLen = Math.max(0.4, out.hitHand.distanceTo(out.racketTip));
  for (let iter = 0; iter < 6; iter++) {
    let moved = false;
    _tmp.subVectors(out.racketTip, out.head);
    const dHead = _tmp.length();
    if (dHead < headR + 0.08) {
      if (dHead < 1e-5) _tmp.set(mirror, 0, 0);
      else _tmp.normalize();
      out.racketTip.addScaledVector(_tmp, headR + 0.1 - dHead);
      moved = true;
    }
    for (let s = 0.2; s <= 1; s += 0.2) {
      _tmp.copy(out.hitHand).lerp(out.racketTip, s);
      _dir.subVectors(out.chest, out.pelvis);
      const lenSq = _dir.lengthSq();
      let tParam = 0;
      if (lenSq > 1e-8) {
        const proj =
          (_tmp.x - out.pelvis.x) * _dir.x +
          (_tmp.y - out.pelvis.y) * _dir.y +
          (_tmp.z - out.pelvis.z) * _dir.z;
        tParam = Math.max(0, Math.min(1, proj / lenSq));
      }
      _clear.copy(out.pelvis).addScaledVector(_dir, tParam);
      _tmp2.subVectors(_tmp, _clear);
      const d = _tmp2.length();
      if (d < torsoR + 0.06) {
        if (d < 1e-5) {
          _tmp2.set(mirror, 0, 0.3).normalize();
        } else {
          _tmp2.normalize();
        }
        const push = torsoR + 0.08 - d;
        out.racketTip.addScaledVector(_tmp2, push * (0.55 + s * 0.45));
        moved = true;
      }
    }
    if (!moved) break;
  }
  // Re-anchor tip on the hand→tip shaft so the grip never floats
  _rdir.subVectors(out.racketTip, out.hitHand);
  if (_rdir.lengthSq() > 1e-8) {
    _rdir.normalize();
    out.racketTip.copy(out.hitHand).addScaledVector(_rdir, shaftLen);
  }
}

function recomputeFace(
  out: SkeletonPose,
  fwd: THREE.Vector3,
  right: THREE.Vector3,
  mirror: number,
  faceDeg: number,
  irDeg: number,
  ulnarDeg: number,
): void {
  _rdir.subVectors(out.racketTip, out.hitHand);
  if (_rdir.lengthSq() < 1e-8) return;
  _rdir.normalize();
  // Soft roll — IR/ulnar should paint the face, not snap it
  out.racketFaceRoll = deg(faceDeg * 0.85 + irDeg * 0.18 + ulnarDeg * 0.35);
  // Prefer a wing-stable open/closed blend over fwd (fwd flips on unit turn)
  _preferred.copy(right).multiplyScalar(mirror);
  _preferred.addScaledVector(_rdir, -_rdir.dot(_preferred));
  if (_preferred.lengthSq() < 1e-8) {
    _preferred.copy(_up).addScaledVector(_rdir, -_rdir.dot(_up));
  }
  _preferred.normalize();
  _face.copy(fwd).addScaledVector(_rdir, -_rdir.dot(fwd));
  const faceAimW = smooth01((0.22 - Math.sqrt(Math.max(0, _face.lengthSq()))) / 0.18);
  if (_face.lengthSq() > 1e-8) _face.normalize();
  else _face.copy(_preferred);
  // Mostly wing-stable; only a little court-forward aim when the shaft is horizontal
  _face.multiplyScalar(0.35 * (1 - faceAimW)).addScaledVector(_preferred, 0.65 + 0.35 * faceAimW);
  _face.normalize();
  rotateAround(_face, _rdir, out.racketFaceRoll);
  out.racketFaceNormal.copy(_face).normalize();
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
  const shoulderWidth = 0.42;

  const yaw = deg(j.hipYaw * mirror);
  const twist = deg(j.spineTwist * mirror);
  const lean = deg(j.spineLean);
  const hipPitch = deg(Math.max(0, Math.min(55, j.hipPitch)));
  const pelvisSurge = j.pelvisSurge ?? 0;
  const pelvisSway = j.pelvisSway ?? 0;
  const surge = pelvisSurge * 0.012; // cm-ish units from degrees-like authoring
  const sway = pelvisSway * 0.01 * mirror;

  yawBasis(yaw, _fwd, _right);
  _back.copy(_fwd).multiplyScalar(-1);

  const loadW = smooth01((-pelvisSurge - 2) / 16);
  const driveW = smooth01((pelvisSurge - 2) / 12);
  const avgKnee = (j.leadKneeFlexion + j.trailKneeFlexion) * 0.5;

  // Stance toes face mostly toward the net — slight open, never platypus splay.
  const stanceYaw = yaw * 0.1;
  _leadFwd.copy(_courtFwd).applyAxisAngle(_up, stanceYaw - mirror * deg(5));
  _trailFwd.copy(_courtFwd).applyAxisAngle(_up, stanceYaw + mirror * deg(7));

  const leadKnee = deg(j.leadKneeFlexion);
  const trailKnee = deg(j.trailKneeFlexion);

  // Athletic base under the hips — feet track the sockets, not a wide duck stance.
  const halfW = 0.13;
  let trailX = halfW * mirror + sway * 0.08;
  let trailZ = 0.12 + loadW * 0.08 - driveW * 0.04;
  let leadX = -halfW * mirror + sway * 0.18;
  let leadZ = -0.08 - driveW * 0.08 + loadW * 0.015;
  // Soft pivot of the lead plant with the coil (fraction of stanceYaw — no knee pops)
  {
    const dx = leadX - trailX;
    const dz = leadZ - trailZ;
    const pivot = stanceYaw * 0.55;
    const c = Math.cos(pivot);
    const s = Math.sin(pivot);
    leadX = trailX + dx * c - dz * s;
    leadZ = trailZ + dx * s + dz * c;
  }

  // Weight transfer: COM stays over the trail foot on the load, then over the lead.
  const leadWeight = 0.42 + driveW * 0.32 - loadW * 0.2;
  out.pelvis.set(
    trailX + (leadX - trailX) * leadWeight + sway * 0.15,
    0.8,
    trailZ + (leadZ - trailZ) * leadWeight - surge * 0.2,
  );

  // Hip sockets stay above the plants (slight medial inset). Unit turn coils the
  // torso/shoulders — not the hip sockets off the feet (that popped knees L/R).
  const hipSit = Math.sin(hipPitch);
  const leadHipFlex = deg(Math.max(0, Math.min(70, j.leadHipFlexion)));
  const trailHipFlex = deg(Math.max(0, Math.min(80, j.trailHipFlexion)));
  const ankleDorsi = deg(Math.max(0, Math.min(40, j.ankleDorsiflexion ?? 0)));
  const hipInset = 0.025;
  out.leadHip.set(
    leadX + hipInset * mirror + _fwd.x * (hipSit * 0.02 + Math.sin(leadHipFlex) * 0.02),
    0,
    leadZ * 0.35 + out.pelvis.z * 0.65 + _fwd.z * (hipSit * 0.02 + Math.sin(leadHipFlex) * 0.02),
  );
  out.trailHip.set(
    trailX - hipInset * mirror - _fwd.x * (hipSit * 0.03 + Math.sin(trailHipFlex) * 0.025),
    0,
    trailZ * 0.35 + out.pelvis.z * 0.65 - _fwd.z * (hipSit * 0.03 + Math.sin(trailHipFlex) * 0.025),
  );

  // Height from the loaded leg — athletic hinge on takeback, stand into contact.
  // Dual-support blend keeps the figure from collapsing into a chair squat when
  // only the trail knee is deeply flexed.
  const leadH = hipHeightForPlant(
    out.leadHip.x,
    out.leadHip.z,
    leadX,
    leadZ,
    leadKnee,
    thigh,
    shank,
  );
  const trailH = hipHeightForPlant(
    out.trailHip.x,
    out.trailHip.z,
    trailX,
    trailZ,
    trailKnee,
    thigh,
    shank,
  );
  const hingeDrop = Math.sin(hipPitch) * thigh * 0.08 + Math.sin(trailHipFlex) * thigh * 0.02;
  const supportH =
    loadW > 0.35 ? trailH : driveW > 0.35 ? leadH : Math.min(leadH, trailH);
  const otherH = loadW > 0.35 ? leadH : driveW > 0.35 ? trailH : Math.max(leadH, trailH);
  // Favor the loaded limb so authored knee flex actually reads, but keep enough
  // dual-support so the figure never collapses into a chair squat.
  const supportW = 0.68 + loadW * 0.08;
  const driveLift = driveW * 0.02;
  out.pelvis.y = Math.max(
    0.5,
    supportH * supportW + otherH * (1 - supportW) - hingeDrop + driveLift,
  );
  // Soft floor: athletic hinge, not seated — serve trophy exempt via overheadAuth
  if (overheadAuthGuess(j) < 0.35) {
    out.pelvis.y = Math.max(out.pelvis.y, 0.78 - loadW * 0.05);
  }
  // Pelvis tips slightly with hip pitch (athletic hinge) — sockets follow
  out.leadHip.y = out.pelvis.y - hipSit * 0.015 - Math.sin(leadHipFlex) * 0.01;
  out.trailHip.y = out.pelvis.y + hipSit * 0.01 - Math.sin(trailHipFlex) * 0.006;

  // Torso: lean + light gravity flexion (keep upright athletic posture, not a folded sit)
  const gravLean = deg(Math.min(8, 2 + avgKnee * 0.04 + Math.max(0, j.hipPitch) * 0.06));
  const leanTotal = lean + gravLean * 0.28;
  _dir
    .copy(_up)
    .multiplyScalar(Math.cos(leanTotal) * torsoLen)
    .addScaledVector(_fwd, Math.sin(leanTotal) * torsoLen);
  out.chest.copy(out.pelvis).add(_dir);
  out.head
    .copy(out.chest)
    .addScaledVector(_up, 0.28)
    .addScaledVector(_fwd, leanTotal * 0.04);

  plantLegIk(
    out.leadHip,
    leadX,
    leadZ,
    thigh,
    shank,
    _leadFwd,
    _courtRight,
    0,
    leadKnee,
    ankleDorsi * (0.55 + driveW * 0.35),
    out.leadKnee,
    out.leadAnkle,
  );
  plantLegIk(
    out.trailHip,
    trailX,
    trailZ,
    thigh,
    shank,
    _trailFwd,
    _courtRight,
    0,
    trailKnee,
    ankleDorsi * (0.75 + loadW * 0.35),
    out.trailKnee,
    out.trailAnkle,
  );
  groundPose(out, thigh, shank, _leadFwd, _trailFwd);
  out.leadFootFwd.copy(_leadFwd);
  out.trailFootFwd.copy(_trailFwd);

  // --- Shoulders / X-factor ---
  // Kinetic chain: hips (yaw) → trunk (partial twist) → shoulders/arms (more twist).
  // Cap arm-frame separation so BH wing tips don't cross the body from over-twist.
  const twistArm = Math.max(-0.55, Math.min(0.55, twist)) * 0.85;
  const trunkYaw = yaw + twist * 0.38;
  const shYaw = yaw + twistArm * 0.55;
  yawBasis(trunkYaw, _fwd, _right);
  const xFactorShift = Math.sin(twist) * 0.24;

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
  _back.copy(_fwd).multiplyScalar(-1);

  // --- Hitting arm: load on the wing beside the body, loop tip up — never yank elbow behind ---
  const flex = deg(j.shoulderFlexion);
  // Allow full FH wing (+abd) and BH wing (−abd). The old −20° floor crushed every backhand.
  const abd = deg(Math.max(-95, Math.min(120, j.shoulderAbduction)));
  const irDegSigned = j.shoulderInternalRotation * mirror;
  const ir = deg(irDegSigned);
  out.hitUpperTwist = ir * 0.45;

  const erLoad = smooth01((-j.shoulderInternalRotation - 5) / 40);
  const abdMag = Math.abs(j.shoulderAbduction);
  const takebackW =
    erLoad * smooth01((abdMag - 30) / 50) * smooth01((90 - Math.abs(j.shoulderFlexion - 45)) / 70);
  const contactW = smooth01((j.shoulderInternalRotation - 8) / 40) * (1 - takebackW);
  // Authored overhead (serve trophy/accel) — high flex WITH high abduction
  const overheadAuth =
    smooth01((j.shoulderFlexion - 125) / 45) * smooth01((abdMag - 55) / 35);
  // FH wrap finish only (high flex + modest POSITIVE abd) — never fire on BH wing
  const wrapW =
    smooth01((j.shoulderFlexion - 95) / 45) *
    smooth01((45 - j.shoulderAbduction) / 50) *
    smooth01((j.shoulderAbduction + 8) / 30) *
    (1 - overheadAuth);

  // Hitting-wing sign from authored abduction. Flip only once clearly on the BH
  // wing so slice/BH entry doesn't snap the elbow hinge at abd≈0.
  const wingMirror = mirror * (j.shoulderAbduction >= -12 ? 1 : -1);
  // BH wing weight: ramps after the wingMirror commit so locks don't fight the hinge
  const bhWingW = smooth01((-j.shoulderAbduction - 12) / 22);
  const worldWing = -mirror; // righty BH = −X court side

  // Authored abduction drives the wing (sin supports ±abd for FH/BH)
  const wing = 0.04 + 0.03 * contactW;
  const abdLat = Math.sin(abd);
  _dir
    .set(0, 0, 0)
    .addScaledVector(_right, mirror * (abdLat * 0.95 + wing * Math.sign(abdLat || wingMirror)))
    .addScaledVector(
      _up,
      -Math.cos(abd) * Math.cos(flex) + 0.06 * takebackW - 0.4 * wrapW + 0.12 * overheadAuth,
    )
    .addScaledVector(
      _fwd,
      Math.cos(abd) * Math.sin(flex) + 0.05 * takebackW + 0.12 * contactW + 0.18 * wrapW,
    )
    .normalize();
  // Extra court-lateral drive onto the BH wing — torso yaw alone under-pulls the elbow
  if (bhWingW > 0.05 && overheadAuth < 0.5) {
    _dir.x += worldWing * (0.14 + 0.18 * takebackW) * bhWingW;
    _dir.normalize();
  }
  // Cap upper-arm elevation on groundstrokes so the elbow never sits above the shoulder
  {
    const maxUp = 0.22 + 0.55 * overheadAuth + 0.18 * takebackW * (1 - wrapW);
    if (_dir.y > maxUp) {
      _dir.y = maxUp;
      _dir.normalize();
    }
  }
  // IR mostly rolls the face — keep it off the upper-arm orbit on takeback
  rotateAround(_dir, _right, ir * 0.02 * (1 - takebackW * 0.85));
  _dir.normalize();
  out.hitElbow.copy(out.hitShoulder).addScaledVector(_dir, upperArm);

  // Soft world-X lock: elbow stays on the BH side of the chest through the swing
  if (bhWingW > 0.05 && overheadAuth < 0.5) {
    const elOnBh = (out.hitElbow.x - out.chest.x) * worldWing;
    const wantEl = (0.08 + 0.16 * takebackW + 0.05 * contactW) * bhWingW;
    if (elOnBh < wantEl) {
      out.hitElbow.x += worldWing * (wantEl - elOnBh);
      restoreLen(out.hitShoulder, out.hitElbow, upperArm);
      _dir.subVectors(out.hitElbow, out.hitShoulder).normalize();
    }
  }

  // Keep the elbow on the hitting wing: lateral yes, deep behind no (real unit turn)
  {
    _tmp.subVectors(out.hitElbow, out.hitShoulder);
    const behind = -_tmp.dot(_fwd); // +behind = toward back fence
    const maxBehind = 0.04 + 0.035 * takebackW;
    if (behind > maxBehind) {
      out.hitElbow.addScaledVector(_fwd, behind - maxBehind);
      restoreLen(out.hitShoulder, out.hitElbow, upperArm);
    }
    wingElbow(
      out.hitShoulder,
      out.hitElbow,
      out.chest,
      _right,
      wingMirror,
      0.14 + 0.06 * takebackW - 0.04 * wrapW,
      upperArm,
    );
    _tmp.subVectors(out.hitElbow, out.hitShoulder);
    const behind2 = -_tmp.dot(_fwd);
    if (behind2 > maxBehind) {
      out.hitElbow.addScaledVector(_fwd, behind2 - maxBehind);
      restoreLen(out.hitShoulder, out.hitElbow, upperArm);
    }
    const maxElbowY =
      out.hitShoulder.y + 0.04 + 0.1 * takebackW + 0.22 * overheadAuth - 0.02 * wrapW;
    if (out.hitElbow.y > maxElbowY) {
      out.hitElbow.y = maxElbowY;
      restoreLen(out.hitShoulder, out.hitElbow, upperArm);
    }
  }
  _dir.subVectors(out.hitElbow, out.hitShoulder).normalize();

  _fdir.copy(_dir);
  // Cap extreme crook on 1H takeback; 2HBH keeps authored double-arm bend
  const elbowAuth = Math.max(12, Math.min(145, j.elbowFlexion));
  const elbowCap =
    takebackW > 0.25 && oneHanded
      ? Math.min(elbowAuth, 78 + takebackW * 12)
      : takebackW > 0.25
        ? Math.min(elbowAuth, 98 + takebackW * 8)
        : elbowAuth;
  const elbow = deg(elbowCap);
  const overheadW = Math.max(
    overheadAuth,
    smooth01((Math.abs(_dir.dot(_up)) - 0.78) / 0.16),
  );
  const swingW = Math.max(contactW, wrapW) * (1 - takebackW * 0.85);

  elbowHingeAxis(_dir, _right, _fwd, wingMirror, _axis, takebackW * (1 - overheadW), swingW);
  _fdir.copy(_dir);
  rotateAround(_fdir, _axis, -elbow);

  // Soft carry — keep IR off the takeback orbit
  const carry = deg(4) * wingMirror * (1 - overheadW * 0.65) * (0.2 + 0.1 * contactW);
  rotateAround(_fdir, _dir, carry);
  rotateAround(_fdir, _dir, ir * (0.08 + 0.05 * contactW) * (1 - takebackW * 0.75));
  _fdir.normalize();

  // Soft wing nudge (no hinge flip — flipping caused post-contact glitches)
  if (overheadW < 0.45 && takebackW > 0.15) {
    _tmp.copy(out.hitElbow).addScaledVector(_fdir, forearm);
    const elbowLat = _tmp2.subVectors(out.hitElbow, out.chest).dot(_right) * wingMirror;
    const wristLat = _tmp.subVectors(_tmp, out.chest).dot(_right) * wingMirror;
    if (wristLat < elbowLat - 0.05) {
      _fdir.addScaledVector(_right, wingMirror * 0.12);
      _fdir.normalize();
    }
  }

  // Mild loop lift on takeback — tip rises from elevation authoring, not an arm yank
  if (takebackW > 0.05 && overheadW < 0.55 && wrapW < 0.25) {
    _fdir.addScaledVector(_up, 0.55 * takebackW * (1 - overheadW));
    _fdir.addScaledVector(_back, 0.1 * takebackW);
    _fdir.addScaledVector(_right, wingMirror * 0.06 * takebackW);
    _fdir.normalize();
  }
  // Soft wrap finish — tip high across, no violent yank
  if (wrapW > 0.12 && overheadW < 0.5) {
    _fdir.addScaledVector(_up, 0.12 * wrapW);
    _fdir.addScaledVector(_right, -mirror * 0.1 * wrapW);
    _fdir.addScaledVector(_fwd, 0.05 * wrapW);
    _fdir.normalize();
  }

  out.hitWrist.copy(out.hitElbow).addScaledVector(_fdir, forearm);
  // Hand is a short palm along the forearm — grips the racket butt
  out.hitHand.copy(out.hitWrist).addScaledVector(_fdir, 0.05);

  // BH: keep wrist on the backhand wing through takeback → contact
  if (bhWingW > 0.15 && takebackW > 0.1 && wrapW < 0.15 && overheadW < 0.4) {
    if ((out.hitWrist.x - out.hitElbow.x) * worldWing < 0.02) {
      out.hitWrist.x = out.hitElbow.x + worldWing * (0.06 + 0.06 * takebackW);
      restoreLen(out.hitElbow, out.hitWrist, forearm);
      _fdir.subVectors(out.hitWrist, out.hitElbow).normalize();
      out.hitHand.copy(out.hitWrist).addScaledVector(_fdir, 0.05);
    }
  }

  // --- Racket tip from HAND (grip owns the shaft) ---
  const elevRad = deg(Math.max(-95, Math.min(95, j.racketPathElevation)));
  const faceDeg = j.racketFaceAngle * mirror;
  const ulnarDeg = j.wristUlnarDeviation * mirror;
  const face = faceDeg / 45;
  const ulnar = ulnarDeg / 40;
  const lag = j.wristExtension / 70;

  _preferred.set(_dir.x, 0, _dir.z);
  const upperHoriz = Math.sqrt(_preferred.lengthSq());

  // Tip aim starts from forearm — continuous pitch about a wing-locked axis
  _rdir.copy(_fdir);
  const forearmPitch = Math.asin(Math.max(-1, Math.min(1, _fdir.y)));
  let dPitch = elevRad - forearmPitch;
  // Soft-compress large elevation deltas so accel→contact doesn't teleport the tip
  dPitch = Math.max(-1.05, Math.min(1.2, dPitch));
  if (Math.abs(dPitch) > 0.5) {
    const over = Math.abs(dPitch) - 0.5;
    dPitch = Math.sign(dPitch) * (0.5 + over * 0.55);
  }
  // Pitch axis = forearm × wingOut (stable) — not forearm × world-up (flips when forearm is steep)
  _preferred.copy(_right).multiplyScalar(wingMirror);
  _preferred.addScaledVector(_fdir, -_fdir.dot(_preferred));
  if (_preferred.lengthSq() < 1e-6) {
    _preferred.set(-_fdir.z, 0, _fdir.x);
    if (_preferred.dot(_right) * wingMirror < 0) _preferred.multiplyScalar(-1);
  }
  _axis.copy(_preferred).normalize();
  // Positive elevation lifts the tip about the wing-out axis
  rotateAround(_rdir, _axis, dPitch);

  // Soft floor: keep tip from dumping when elevation asks for level-or-up
  if (elevRad > 0.12) {
    const minY =
      Math.sin(Math.max(0.15, elevRad)) * (0.38 + 0.12 * takebackW) + 0.1 * takebackW;
    if (_rdir.y < minY) {
      const blend = smooth01((minY - _rdir.y) / 0.4) * (0.75 + 0.2 * takebackW);
      _rdir.y = _rdir.y * (1 - blend) + minY * blend;
      _rdir.normalize();
    }
  }

  if (lag > 0) {
    // Soft lag: tip trails the hand slightly behind the forearm — continuous, no teleport
    const lagAmt = lag * (0.1 + 0.08 * takebackW) * (1 - contactW * 0.35);
    _tmp.set(_fdir.x, 0, _fdir.z);
    if (_tmp.lengthSq() > 0.04) {
      _tmp.normalize();
      _rdir.addScaledVector(_tmp, -lagAmt);
    } else if (upperHoriz > 0.06) {
      _tmp.set(_dir.x, 0, _dir.z).normalize();
      _rdir.addScaledVector(_tmp, -lagAmt * 0.7);
    }
    _rdir.addScaledVector(_up, lag * 0.1 * (1 - contactW * 0.4));
  } else if (lag < 0) {
    _rdir.addScaledVector(_fwd, -lag * 0.22);
  }

  _rdir.addScaledVector(_right, face * 0.05 - ulnar * 0.1 + wingMirror * 0.01 * contactW);
  _rdir.addScaledVector(_up, ulnar * 0.04);
  if (_rdir.lengthSq() < 1e-8) {
    _rdir.copy(_fwd).multiplyScalar(Math.cos(elevRad));
    _rdir.y = Math.sin(elevRad);
  }
  _rdir.normalize();

  // BH: soft shaft bias — keep tip on BH wing without killing the takeback loop
  if (bhWingW > 0.02 && overheadW < 0.5) {
    const shaftOnBh = _rdir.x * worldWing;
    const wantShaft = 0.08 + 0.2 * takebackW + 0.08 * contactW;
    if (shaftOnBh < wantShaft) {
      _rdir.x += worldWing * (wantShaft - shaftOnBh) * (0.35 + 0.35 * bhWingW);
    }
    // Takeback: tip loops UP and BACK on the BH wing (classic unit-turn coil)
    if (takebackW > 0.15) {
      _rdir.addScaledVector(_back, 0.35 * takebackW * bhWingW);
      _rdir.y += 0.35 * takebackW * bhWingW;
      if (_rdir.y < 0.15) _rdir.y = 0.15 + 0.25 * takebackW;
    }
    // Finish: gentle lift — avoid a sky spike that teleports into recovery
    if (j.shoulderFlexion > 95 && takebackW < 0.25) {
      _rdir.y += 0.08 * bhWingW * smooth01((j.shoulderFlexion - 95) / 50);
    }
    _rdir.normalize();
  }

  const RACKET_LEN = 0.58;
  out.racketTip.copy(out.hitHand).addScaledVector(_rdir, RACKET_LEN);

  // BH tip position lock — soft, continuous; never a hard abd cliff
  if (bhWingW > 0.02 && overheadW < 0.5) {
    const tipOnBh = (out.racketTip.x - out.chest.x) * worldWing;
    const minOnBh = (0.06 + 0.2 * takebackW + 0.05 * contactW) * bhWingW;
    const maxFhLeak = 0.1 * (1 - bhWingW * 0.65);
    if (tipOnBh < -maxFhLeak) {
      out.racketTip.x += worldWing * (-maxFhLeak - tipOnBh) * 0.8;
    } else if (tipOnBh < minOnBh) {
      out.racketTip.x += worldWing * (minOnBh - tipOnBh) * 0.65;
    }
    // Tip must not sit deep FH-side of the hitting hand (shaft X flip)
    const tipFromHand = (out.racketTip.x - out.hitHand.x) * worldWing;
    const minFromHand = -0.1 + 0.08 * takebackW;
    if (tipFromHand < minFromHand) {
      out.racketTip.x += worldWing * (minFromHand - tipFromHand) * 0.7;
    }
    // After X correction, restore takeback loop depth/height
    if (takebackW > 0.2) {
      const wantBehind = out.hitHand.z + 0.15 + 0.32 * takebackW;
      if (out.racketTip.z < wantBehind) {
        out.racketTip.z += (wantBehind - out.racketTip.z) * Math.min(1, 0.75 * takebackW);
      }
      const wantUp = out.hitHand.y + 0.08 + 0.18 * takebackW;
      if (out.racketTip.y < wantUp) {
        out.racketTip.y += (wantUp - out.racketTip.y) * Math.min(1, 0.9 * takebackW);
      }
    }
    _rdir.subVectors(out.racketTip, out.hitHand);
    if (_rdir.lengthSq() > 1e-8) {
      _rdir.normalize();
      out.racketTip.copy(out.hitHand).addScaledVector(_rdir, RACKET_LEN);
    }
  }

  const irDeg = j.shoulderInternalRotation * mirror;
  recomputeFace(out, _fwd, _right, mirror, faceDeg, irDeg, ulnarDeg);

  clearRacketFromBody(out, mirror);
  recomputeFace(out, _fwd, _right, mirror, faceDeg, irDeg, ulnarDeg);

  // --- Lead / non-hitting arm: point UP at the ball (FH) or share the BH wing (2HBH) ---
  const nhFlex = deg(Math.max(15, Math.min(175, j.nonHittingShoulderFlexion)));
  // Allow negative abd so 2HBH off-arm sits on the backhand wing
  const nhAbd = deg(Math.max(-90, Math.min(95, j.nonHittingShoulderAbduction ?? 40)));
  const nhIr = deg((j.nonHittingShoulderInternalRotation ?? 0) * -mirror);
  out.nonHitUpperTwist = nhIr * 0.4;
  // FH: off-arm opposite the hitting wing. BH: both arms on the backhand wing.
  const nhWingMirror = -mirror;

  const nhOverheadW = smooth01((j.nonHittingShoulderFlexion - 140) / 40);
  const pointW =
    smooth01((j.nonHittingShoulderFlexion - 40) / 35) *
    smooth01((55 - j.nonHittingElbowFlexion) / 35) *
    (1 - nhOverheadW * 0.5);
  const tuckW =
    smooth01((j.nonHittingElbowFlexion - 50) / 35) *
    smooth01((70 - j.nonHittingShoulderFlexion) / 40) *
    (1 - pointW * 0.5);

  const nhAbdLat = Math.sin(nhAbd);
  _dir
    .set(0, 0, 0)
    .addScaledVector(_right, mirror * (nhAbdLat * 0.9 - 0.08 * pointW * (j.shoulderAbduction < -15 ? -1 : 1)))
    .addScaledVector(_up, -Math.cos(nhAbd) * Math.cos(nhFlex) + 0.32 * pointW - 0.08 * tuckW)
    .addScaledVector(
      _fwd,
      Math.cos(nhAbd) * Math.sin(nhFlex) + 0.32 * pointW - 0.06 * tuckW,
    )
    .normalize();
  if (pointW > 0.2 && _dir.y < 0.05 && j.shoulderAbduction >= -15) {
    _dir.y = 0.05 + 0.25 * pointW;
    _dir.normalize();
  }
  out.nonHitElbow.copy(out.nonHitShoulder).addScaledVector(_dir, upperArm);
  wingElbow(
    out.nonHitShoulder,
    out.nonHitElbow,
    out.chest,
    _right,
    nhWingMirror,
    0.1,
    upperArm,
  );
  if (
    out.nonHitElbow.y < out.nonHitShoulder.y - 0.06 &&
    tuckW < 0.55 &&
    j.shoulderAbduction >= -15
  ) {
    out.nonHitElbow.y = out.nonHitShoulder.y - 0.04 + 0.1 * pointW;
    restoreLen(out.nonHitShoulder, out.nonHitElbow, upperArm);
  }
  _dir.subVectors(out.nonHitElbow, out.nonHitShoulder).normalize();

  _fdir.copy(_dir);
  const nhElbow = deg(Math.max(8, Math.min(130, j.nonHittingElbowFlexion)));
  elbowHingeAxis(_dir, _right, _fwd, nhWingMirror, _axis, 0, 0);
  rotateAround(_fdir, _axis, -nhElbow * (0.65 + 0.2 * tuckW));
  rotateAround(_fdir, _dir, nhIr * 0.3);
  if (pointW > 0.15) {
    _fdir.addScaledVector(_fwd, 0.22 * pointW);
    _fdir.addScaledVector(_up, 0.1 * pointW);
  }
  if (tuckW > 0.2) {
    _fdir.addScaledVector(_fwd, 0.05 * tuckW);
    _fdir.addScaledVector(_up, -0.1 * tuckW);
    _fdir.addScaledVector(_right, mirror * 0.15 * tuckW);
  }
  _fdir.normalize();
  out.nonHitWrist.copy(out.nonHitElbow).addScaledVector(_fdir, forearm);
  out.nonHitHand.copy(out.nonHitWrist).addScaledVector(_fdir, 0.05);

  if (!oneHanded) {
    // 2HBH: hands share the grip — blend toward hitting hand without yanking elbow across
    out.nonHitHand.lerp(out.hitHand, 0.72);
    out.nonHitWrist.lerp(out.hitWrist, 0.62);
    out.nonHitElbow.lerp(out.hitElbow, 0.22);
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
