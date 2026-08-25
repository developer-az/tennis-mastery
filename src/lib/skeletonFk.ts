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
 *   - Pelvis height comes from two-bone reach — sit on the load, stand into contact
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

/**
 * Elbow hinge: keep fold lateral/down so takeback elbows point out, not into the chest.
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
  // Prefer world-up + strong lateral bias — elbow stays outside the torso
  _preferred.copy(_up).multiplyScalar(1 - overheadW * 0.75);
  _preferred.addScaledVector(right, mirror * (0.55 + 0.35 * takebackW) * (1 - overheadW * 0.5));
  _preferred.addScaledVector(forward, -mirror * overheadW * 0.4);
  // Mild behind bias on takeback without collapsing across midline
  _preferred.addScaledVector(forward, -0.12 * takebackW);
  if (_preferred.lengthSq() < 1e-8) {
    _preferred.copy(right).multiplyScalar(mirror);
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
  return _tmp2.dot(stanceFwd) * 2.2 + _tmp2.y * 0.35;
}

function plantLegIk(
  hip: THREE.Vector3,
  plantX: number,
  plantZ: number,
  thighLen: number,
  shankLen: number,
  stanceFwd: THREE.Vector3,
  right: THREE.Vector3,
  flare: number,
  targetKneeFlexRad: number,
  ankleDorsiRad: number,
  outKnee: THREE.Vector3,
  outAnkle: THREE.Vector3,
): void {
  const maxR = thighLen + shankLen - 0.012;
  const minR = Math.abs(thighLen - shankLen) + 0.05;
  const flex = Math.max(0.12, Math.min(2.35, targetKneeFlexRad));
  const targetChord = Math.max(minR, Math.min(maxR, legChord(thighLen, shankLen, flex)));
  const dorsi = Math.max(0, Math.min(0.55, ankleDorsiRad));

  // Authored plant + mild dorsiflexion (toes load forward)
  outAnkle.set(plantX, FOOT_Y, plantZ);
  outAnkle.addScaledVector(stanceFwd, dorsi * 0.035);

  // Soft horizontal clamp to the flexion chord — avoids hard reach snaps / knee teleports
  _tmp.set(outAnkle.x - hip.x, 0, outAnkle.z - hip.z);
  let horiz = _tmp.length();
  const hipH = Math.max(0.05, hip.y - FOOT_Y);
  const chordHoriz = Math.sqrt(Math.max(0, targetChord * targetChord - hipH * hipH));
  const reachHoriz = Math.sqrt(Math.max(0, maxR * maxR - hipH * hipH));
  const softMax = Math.min(chordHoriz, reachHoriz);
  if (horiz > softMax && horiz > 1e-6) {
    const s = softMax / horiz;
    outAnkle.x = hip.x + _tmp.x * s;
    outAnkle.z = hip.z + _tmp.z * s;
    horiz = softMax;
  } else if (horiz < 0.045) {
    outAnkle.addScaledVector(stanceFwd, -0.05);
  }

  _tmp.subVectors(outAnkle, hip);
  let dist = Math.max(minR, Math.min(maxR, _tmp.length()));
  // Pull plant in so the chord matches authored flexion when geometry over-extends
  if (dist > targetChord + 0.008) {
    const wantHoriz = Math.sqrt(Math.max(0, targetChord * targetChord - hipH * hipH));
    _tmp2.set(outAnkle.x - hip.x, 0, outAnkle.z - hip.z);
    const h = _tmp2.length();
    if (h > 1e-6 && wantHoriz < h) {
      outAnkle.x = hip.x + _tmp2.x * (wantHoriz / h);
      outAnkle.z = hip.z + _tmp2.z * (wantHoriz / h);
    }
    _tmp.subVectors(outAnkle, hip);
    dist = Math.max(minR, Math.min(maxR, _tmp.length()));
  }

  _dir.copy(_tmp).normalize();

  // Bend plane: hip→ankle × stanceFwd. Flip so +α moves the knee toward the toes.
  _axis.crossVectors(_dir, stanceFwd);
  if (_axis.lengthSq() < 1e-6) _axis.crossVectors(_dir, right);
  if (_axis.lengthSq() < 1e-6) _axis.set(1, 0, 0);
  _axis.normalize();
  _thigh.copy(_dir).applyAxisAngle(_axis, 0.15);
  _tmp.copy(hip).addScaledVector(_thigh, thighLen);
  if (anteriorScore(_tmp, hip, outAnkle, stanceFwd) < 0) {
    _axis.multiplyScalar(-1);
  }

  const cosThigh =
    (thighLen * thighLen + dist * dist - shankLen * shankLen) / (2 * thighLen * dist);
  const alpha = Math.acos(Math.max(-1, Math.min(1, cosThigh)));

  _thigh.copy(_dir).applyAxisAngle(_axis, alpha);
  outKnee.copy(hip).addScaledVector(_thigh, thighLen);
  const scoreA = anteriorScore(outKnee, hip, outAnkle, stanceFwd);

  _thigh.copy(_dir).applyAxisAngle(_axis, -alpha);
  _tmp.copy(hip).addScaledVector(_thigh, thighLen);
  const scoreB = anteriorScore(_tmp, hip, outAnkle, stanceFwd);
  if (scoreB > scoreA) outKnee.copy(_tmp);

  // Tiny lateral flare only — large post-nudges wreck authored flexion
  outKnee.addScaledVector(right, flare * 0.012);
  restoreLen(hip, outKnee, thighLen);

  // Ankle stays on the soft-clamped plant; restore shank without re-aiming the plant
  restoreLen(outKnee, outAnkle, shankLen);
  outAnkle.y = FOOT_Y;
  // If FOOT_Y push broke shank length, slide ankle on the floor toward the plant
  _tmp.subVectors(outAnkle, outKnee);
  const need = shankLen * shankLen - _tmp.y * _tmp.y;
  if (need > 1e-8) {
    const hr = Math.sqrt(need);
    _shank.set(plantX - outKnee.x, 0, plantZ - outKnee.z);
    // Prefer current ankle azimuth (preserves chord) over raw plant if far
    _tmp2.set(outAnkle.x - outKnee.x, 0, outAnkle.z - outKnee.z);
    if (_tmp2.lengthSq() > 1e-8) _shank.copy(_tmp2);
    if (_shank.lengthSq() < 1e-8) _shank.copy(stanceFwd).multiplyScalar(-1);
    _shank.normalize().multiplyScalar(hr);
    outAnkle.set(outKnee.x + _shank.x, FOOT_Y, outKnee.z + _shank.z);
  }
  restoreLen(outKnee, outAnkle, shankLen);
  outAnkle.y = FOOT_Y;

  if (anteriorScore(outKnee, hip, outAnkle, stanceFwd) < 0) {
    _tmp.subVectors(outAnkle, hip);
    const t = Math.max(0.2, Math.min(0.8, thighLen / (thighLen + shankLen)));
    _tmp2.copy(hip).addScaledVector(_tmp, t);
    outKnee.x = _tmp2.x * 2 - outKnee.x;
    outKnee.y = Math.max(FOOT_Y + 0.12, _tmp2.y * 2 - outKnee.y);
    outKnee.z = _tmp2.z * 2 - outKnee.z;
    restoreLen(hip, outKnee, thighLen);
    restoreLen(outKnee, outAnkle, shankLen);
    outAnkle.y = FOOT_Y;
  }
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

/** Dual-support floor plant — each ankle on the court; no hanging feet. */
function groundPose(
  out: SkeletonPose,
  thighLen: number,
  shankLen: number,
  leadFwd: THREE.Vector3,
  trailFwd: THREE.Vector3,
): void {
  out.leadAnkle.y = FOOT_Y;
  out.trailAnkle.y = FOOT_Y;

  const fixLeg = (
    hip: THREE.Vector3,
    knee: THREE.Vector3,
    ankle: THREE.Vector3,
    stanceFwd: THREE.Vector3,
  ) => {
    // Keep thigh / shank lengths exact after any prior nudges
    restoreLen(hip, knee, thighLen);
    restoreLen(knee, ankle, shankLen);
    ankle.y = FOOT_Y;
    if (knee.y < FOOT_Y + 0.1) {
      knee.y = FOOT_Y + 0.12;
      restoreLen(hip, knee, thighLen);
      restoreLen(knee, ankle, shankLen);
      ankle.y = FOOT_Y;
    }
    // Reverse-knee emergency flip (should be rare after plantLegIk)
    if (anteriorScore(knee, hip, ankle, stanceFwd) < 0) {
      _tmp.subVectors(ankle, hip);
      const t = thighLen / (thighLen + shankLen);
      _tmp2.copy(hip).addScaledVector(_tmp, t);
      knee.x = _tmp2.x * 2 - knee.x;
      knee.y = Math.max(FOOT_Y + 0.12, _tmp2.y * 2 - knee.y);
      knee.z = _tmp2.z * 2 - knee.z;
      restoreLen(hip, knee, thighLen);
      restoreLen(knee, ankle, shankLen);
      ankle.y = FOOT_Y;
    }
  };

  fixLeg(out.leadHip, out.leadKnee, out.leadAnkle, leadFwd);
  fixLeg(out.trailHip, out.trailKnee, out.trailAnkle, trailFwd);
}

/**
 * Coaching-grade collision catcher: push tip clear of torso capsule + head sphere.
 */
function clearRacketFromBody(out: SkeletonPose, mirror: number): void {
  const headR = 0.14;
  const torsoR = 0.11;
  for (let iter = 0; iter < 6; iter++) {
    let moved = false;
    // Head clearance
    _tmp.subVectors(out.racketTip, out.head);
    const dHead = _tmp.length();
    if (dHead < headR + 0.08) {
      if (dHead < 1e-5) _tmp.set(mirror, 0, 0);
      else _tmp.normalize();
      out.racketTip.addScaledVector(_tmp, headR + 0.1 - dHead);
      moved = true;
    }
    // Sample shaft points (hand → tip) vs torso segment
    for (let s = 0.15; s <= 1; s += 0.2) {
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
        out.racketTip.addScaledVector(_tmp2, push * (0.5 + s * 0.5));
        out.hitHand.addScaledVector(_tmp2, push * 0.15 * (1 - s));
        moved = true;
      }
    }
    if (!moved) break;
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
  out.racketFaceRoll = deg(faceDeg + irDeg * 0.3 + ulnarDeg * 0.45);
  _face.copy(fwd).addScaledVector(_rdir, -_rdir.dot(fwd));
  const faceAimW = smooth01((0.18 - Math.sqrt(Math.max(0, _face.lengthSq()))) / 0.14);
  _preferred.copy(_up).addScaledVector(_rdir, -_rdir.dot(_up));
  if (_face.lengthSq() > 1e-8) _face.normalize();
  else _face.set(0, 0, 0);
  if (_preferred.lengthSq() > 1e-8) _preferred.normalize();
  else _preferred.copy(right).multiplyScalar(mirror);
  if (_face.lengthSq() < 0.5) _face.copy(_preferred);
  else _face.multiplyScalar(1 - faceAimW).addScaledVector(_preferred, faceAimW).normalize();
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
  const hipWidth = 0.3;
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

  // Stance toes mostly face the net; only a fraction of hip yaw (pivot, not spin).
  const stanceYaw = yaw * 0.22;
  _leadFwd.copy(_courtFwd).applyAxisAngle(_up, stanceYaw - mirror * deg(14));
  _trailFwd.copy(_courtFwd).applyAxisAngle(_up, stanceYaw + mirror * deg(18));

  const leadKnee = deg(j.leadKneeFlexion);
  const trailKnee = deg(j.trailKneeFlexion);

  // Court-fixed plants: trail back on load, lead steps toward the net on drive.
  const halfW = 0.175;
  let trailX = halfW * mirror + sway * 0.15;
  let trailZ = 0.15 + loadW * 0.11 - driveW * 0.05;
  let leadX = -halfW * mirror + sway * 0.35;
  let leadZ = -0.11 - driveW * 0.1 + loadW * 0.02;
  // Pivot the lead foot around the trail foot as the hips coil
  {
    const dx = leadX - trailX;
    const dz = leadZ - trailZ;
    const c = Math.cos(stanceYaw);
    const s = Math.sin(stanceYaw);
    leadX = trailX + dx * c - dz * s;
    leadZ = trailZ + dx * s + dz * c;
  }

  // Weight transfer: COM stays over the trail foot on the load, then over the lead.
  const leadWeight = 0.42 + driveW * 0.32 - loadW * 0.2;
  out.pelvis.set(
    trailX + (leadX - trailX) * leadWeight + sway * 0.2,
    0.8,
    trailZ + (leadZ - trailZ) * leadWeight - surge * 0.25,
  );

  // Hip sockets rotate with the pelvis (unit turn) while the feet stay planted.
  // Hip pitch + hip flexion tip sockets into an athletic hinge — drive from the hips.
  const hipSit = Math.sin(hipPitch);
  const leadHipFlex = deg(Math.max(0, Math.min(70, j.leadHipFlexion)));
  const trailHipFlex = deg(Math.max(0, Math.min(80, j.trailHipFlexion)));
  const ankleDorsi = deg(Math.max(0, Math.min(40, j.ankleDorsiflexion ?? 0)));
  out.leadHip.set(
    out.pelvis.x -
      _right.x * hipWidth * 0.5 * mirror +
      _fwd.x * (0.04 + hipSit * 0.07 + Math.sin(leadHipFlex) * 0.055),
    0,
    out.pelvis.z -
      _right.z * hipWidth * 0.5 * mirror +
      _fwd.z * (0.04 + hipSit * 0.07 + Math.sin(leadHipFlex) * 0.055),
  );
  out.trailHip.set(
    out.pelvis.x +
      _right.x * hipWidth * 0.5 * mirror -
      _fwd.x * (0.06 + hipSit * 0.1 + Math.sin(trailHipFlex) * 0.07),
    0,
    out.pelvis.z +
      _right.z * hipWidth * 0.5 * mirror -
      _fwd.z * (0.06 + hipSit * 0.1 + Math.sin(trailHipFlex) * 0.07),
  );

  // Height from the more bent (loaded) leg — sit on takeback, stand into contact.
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
  const hingeDrop = Math.sin(hipPitch) * thigh * 0.18 + Math.sin(trailHipFlex) * thigh * 0.04;
  // Dual-support height: favor the loaded leg's chord so authored flexion reads on that limb
  const supportH =
    loadW > 0.35 ? trailH : driveW > 0.35 ? leadH : Math.min(leadH, trailH);
  const otherH = Math.min(leadH, trailH);
  out.pelvis.y = Math.max(0.38, supportH * 0.78 + otherH * 0.22 - hingeDrop);
  // Pelvis tips slightly with hip pitch (athletic hinge) — sockets follow
  out.leadHip.y = out.pelvis.y - hipSit * 0.02 - Math.sin(leadHipFlex) * 0.012;
  out.trailHip.y = out.pelvis.y + hipSit * 0.012 - Math.sin(trailHipFlex) * 0.008;

  // Torso: lean + slight gravity flexion (chest settles over the base of support)
  const gravLean = deg(Math.min(12, 4 + avgKnee * 0.08 + Math.max(0, j.hipPitch) * 0.12));
  const leanTotal = lean + gravLean * 0.35;
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
    -mirror * 0.06,
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
    mirror * 0.05,
    trailKnee,
    ankleDorsi * (0.75 + loadW * 0.35),
    out.trailKnee,
    out.trailAnkle,
  );
  groundPose(out, thigh, shank, _leadFwd, _trailFwd);
  out.leadFootFwd.copy(_leadFwd);
  out.trailFootFwd.copy(_trailFwd);

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
  _back.copy(_fwd).multiplyScalar(-1);

  // --- Hitting arm (elbow stays on the wing; IR mostly turns the face, not the hand) ---
  const flex = deg(j.shoulderFlexion);
  const abd = deg(j.shoulderAbduction);
  const irDegSigned = j.shoulderInternalRotation * mirror;
  const ir = deg(irDegSigned);
  out.hitUpperTwist = ir * 0.62;

  const erLoad = smooth01((-j.shoulderInternalRotation - 5) / 40);
  const abdMag = Math.abs(j.shoulderAbduction);
  const takebackW =
    erLoad * smooth01((abdMag - 35) / 55) * smooth01((90 - Math.abs(j.shoulderFlexion - 40)) / 70);
  const contactW = smooth01((j.shoulderInternalRotation - 8) / 40) * (1 - takebackW);

  // Extra lateral so the upper arm never hangs in the pocket
  const wing = 0.16 + 0.12 * takebackW + 0.1 * contactW;
  _dir
    .set(0, 0, 0)
    .addScaledVector(_right, mirror * (Math.sin(abd) + wing))
    .addScaledVector(_up, -Math.cos(abd) * Math.cos(flex))
    .addScaledVector(_fwd, Math.cos(abd) * Math.sin(flex) - 0.12 * takebackW + 0.18 * contactW)
    .normalize();
  rotateAround(_dir, _right, ir * 0.04 * (1 - takebackW));
  _dir.normalize();
  out.hitElbow.copy(out.hitShoulder).addScaledVector(_dir, upperArm);
  wingElbow(
    out.hitShoulder,
    out.hitElbow,
    out.chest,
    _right,
    mirror,
    0.18 + 0.1 * takebackW,
    upperArm,
  );
  _dir.subVectors(out.hitElbow, out.hitShoulder).normalize();

  _fdir.copy(_dir);
  const elbow = deg(Math.max(12, Math.min(145, j.elbowFlexion)));
  const overheadW = smooth01((Math.abs(_dir.dot(_up)) - 0.78) / 0.16);

  elbowHingeAxis(_dir, _right, _fwd, mirror, _axis, takebackW * (1 - overheadW));
  rotateAround(_fdir, _axis, -elbow);

  const carry = deg(8) * mirror * (1 - overheadW * 0.65) * (0.35 + 0.2 * takebackW);
  rotateAround(_fdir, _dir, carry);
  // IR cocks the face / lays the wrist — do not orbit the hand across the ribs
  rotateAround(_fdir, _dir, ir * (0.28 + 0.18 * takebackW));
  _fdir.normalize();
  // Prefer the hand on the hitting side of the elbow (real swing, not a chicken wing)
  if (overheadW < 0.45) {
    _tmp.copy(out.hitElbow).addScaledVector(_fdir, forearm);
    const elbowLat = _tmp.subVectors(out.hitElbow, out.chest).dot(_right) * mirror;
    _tmp.copy(out.hitElbow).addScaledVector(_fdir, forearm);
    const wristLat = _tmp.subVectors(_tmp, out.chest).dot(_right) * mirror;
    if (wristLat < elbowLat - 0.03) {
      rotateAround(_fdir, _dir, deg(28) * mirror);
      _fdir.normalize();
    }
  }
  out.hitWrist.copy(out.hitElbow).addScaledVector(_fdir, forearm);

  out.hitHand
    .copy(out.hitWrist)
    .addScaledVector(_fdir, 0.055)
    .addScaledVector(_right, mirror * 0.03);

  // --- Racket tip from HAND ---
  // Build tip continuously from the forearm (pitch by elevation delta) so a near-vertical
  // forearm never flips tip aim through a pelvis-forward XZ blend singularity.
  const elevRad = deg(Math.max(-95, Math.min(95, j.racketPathElevation)));
  const faceDeg = j.racketFaceAngle * mirror;
  const ulnarDeg = j.wristUlnarDeviation * mirror;
  const face = faceDeg / 45;
  const ulnar = ulnarDeg / 40;
  const lag = j.wristExtension / 70;

  // Upper-arm horizontal kept as a stable wing reference when forearm is near vertical
  _preferred.set(_dir.x, 0, _dir.z);
  const upperHoriz = Math.sqrt(_preferred.lengthSq());

  _rdir.copy(_fdir);
  const forearmPitch = Math.asin(Math.max(-1, Math.min(1, _fdir.y)));
  const dPitch = elevRad - forearmPitch;
  _axis.crossVectors(_fdir, _up);
  if (_axis.lengthSq() < 1e-5) {
    // Forearm ≈ vertical: hinge about hitting-wing axis (continuous, not ±fwd flip)
    if (upperHoriz > 0.06) {
      _axis.set(-_preferred.z, 0, _preferred.x).normalize();
      if (_axis.dot(_right) * mirror < 0) _axis.multiplyScalar(-1);
    } else {
      _axis.copy(_right).multiplyScalar(mirror);
    }
  } else {
    _axis.normalize();
  }
  rotateAround(_rdir, _axis, dPitch);

  if (lag > 0) {
    _tmp.set(_fdir.x, 0, _fdir.z);
    if (_tmp.lengthSq() > 0.04) {
      _tmp.normalize();
      _rdir.addScaledVector(_tmp, -lag * 0.28);
    } else if (upperHoriz > 0.06) {
      _tmp.copy(_preferred).multiplyScalar(1 / upperHoriz);
      _rdir.addScaledVector(_tmp, -lag * 0.2);
    }
    _rdir.addScaledVector(_up, lag * 0.22);
  } else if (lag < 0) {
    _rdir.addScaledVector(_fwd, -lag * 0.5);
  }

  _rdir.addScaledVector(_right, face * 0.12 - ulnar * 0.28 + mirror * 0.06 * takebackW);
  _rdir.addScaledVector(_up, ulnar * 0.08);
  if (_rdir.lengthSq() < 1e-8) {
    _rdir.copy(_fwd).multiplyScalar(Math.cos(elevRad));
    _rdir.y = Math.sin(elevRad);
  }
  _rdir.normalize();

  out.racketTip.copy(out.hitHand).addScaledVector(_rdir, 0.58);

  const irDeg = j.shoulderInternalRotation * mirror;
  recomputeFace(out, _fwd, _right, mirror, faceDeg, irDeg, ulnarDeg);

  // Collision catcher — tip/shaft clear of head + torso
  clearRacketFromBody(out, mirror);
  recomputeFace(out, _fwd, _right, mirror, faceDeg, irDeg, ulnarDeg);

  // --- Lead / non-hitting arm: point across on the coil, tuck as the hips fire ---
  const nhFlex = deg(j.nonHittingShoulderFlexion);
  const nhAbd = deg(j.nonHittingShoulderAbduction ?? 28);
  const nhIr = deg((j.nonHittingShoulderInternalRotation ?? 0) * -mirror);
  out.nonHitUpperTwist = nhIr * 0.55;

  const nhOverheadW = smooth01((Math.abs(Math.cos(nhAbd) * Math.cos(nhFlex)) - 0.78) / 0.16);
  const pointW =
    smooth01((j.nonHittingShoulderFlexion - 48) / 40) *
    smooth01((40 - j.nonHittingElbowFlexion) / 28) *
    (1 - nhOverheadW);
  const tuckW =
    smooth01((j.nonHittingElbowFlexion - 58) / 28) *
    (1 - pointW) *
    (1 - nhOverheadW);
  const pullBackW =
    smooth01((28 - j.nonHittingShoulderFlexion) / 24) *
    smooth01(((j.nonHittingShoulderAbduction ?? 28) - 22) / 28);

  _dir
    .set(0, 0, 0)
    .addScaledVector(_right, -mirror * (Math.sin(nhAbd) + 0.1 * pointW))
    .addScaledVector(_up, -Math.cos(nhAbd) * Math.cos(nhFlex) + 0.22 * pullBackW - 0.18 * tuckW)
    .addScaledVector(
      _fwd,
      Math.cos(nhAbd) * Math.sin(nhFlex) + 0.28 * pointW - 0.55 * pullBackW - 0.12 * tuckW,
    )
    .normalize();
  out.nonHitElbow.copy(out.nonHitShoulder).addScaledVector(_dir, upperArm);
  wingElbow(out.nonHitShoulder, out.nonHitElbow, out.chest, _right, -mirror, 0.14, upperArm);
  _dir.subVectors(out.nonHitElbow, out.nonHitShoulder).normalize();

  _fdir.copy(_dir);
  const nhElbow = deg(Math.max(5, Math.min(145, j.nonHittingElbowFlexion)));
  elbowHingeAxis(_dir, _right, _fwd, -mirror, _axis, 0);
  rotateAround(_fdir, _axis, -nhElbow * (0.72 + 0.2 * tuckW));
  rotateAround(_fdir, _dir, nhIr * 0.45 + deg(-6) * -mirror * 0.15);
  if (tuckW > 0.15) {
    // Fold the forearm in toward the ribs — counterbalance, not a second hitting arm
    _fdir.addScaledVector(_fwd, -0.25 * tuckW);
    _fdir.addScaledVector(_up, -0.2 * tuckW);
    _fdir.addScaledVector(_right, mirror * 0.12 * tuckW);
  }
  if (pointW > 0.15) {
    _fdir.addScaledVector(_fwd, 0.2 * pointW);
    _fdir.addScaledVector(_right, -mirror * 0.08 * pointW);
  }
  _fdir.normalize();
  out.nonHitWrist.copy(out.nonHitElbow).addScaledVector(_fdir, forearm);
  out.nonHitHand.copy(out.nonHitWrist).addScaledVector(_fdir, 0.05);

  if (!oneHanded) {
    out.nonHitHand.lerp(out.hitHand, 0.78);
    out.nonHitWrist.lerp(out.hitWrist, 0.7);
    out.nonHitElbow.lerp(out.hitElbow, 0.3);
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
