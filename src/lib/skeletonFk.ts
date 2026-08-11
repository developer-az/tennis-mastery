import * as THREE from "three";
import type { Anthropometrics, JointAngles } from "@/types/biomechanics";
import { deg } from "@/lib/kinematics";

/**
 * Stick-figure FK for tennis Form Lab.
 *
 * World frame (hipYaw = 0, facing the net):
 *   +X = player's right   +Y = up   -Z = toward net (forward)
 *
 * Joint semantics (right-handed; lefty mirrors X / yaw / twist / IR):
 *   hipYaw                 — pelvis yaw. − = FH unit turn (hitting shoulder back), + = BH turn
 *   spineTwist             — shoulders vs hips, same sign (X-factor separation)
 *   spineLean              — + forward (toward net), − arch (serve trophy)
 *   shoulderFlexion        — 0 hang down, 90 forward horizontal, 180 overhead
 *   shoulderAbduction      — signed: + toward FH side, − across body (BH wing)
 *   shoulderInternalRotation — + IR / pronation, − ER (trophy cocking / racket drop)
 *   elbowFlexion           — 0 straight
 *   wristExtension         — + lag (tip behind hand), − snap / flexion through contact
 *   wristUlnarDeviation    — windshield-wiper
 *   racketFaceAngle        — + open face (slice), − closed
 *   racketPathElevation    — tip pitch vs forearm: + tip up, − tip down (scratch-back)
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
const _tmp2 = new THREE.Vector3();

function yawBasis(yaw: number, forward: THREE.Vector3, right: THREE.Vector3) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  // forward (−Z) rotated by yaw about Y
  forward.set(-s, 0, -c);
  right.set(c, 0, -s);
}

/** Rotate vector `v` around unit axis `axis` by `angle` radians (Rodrigues). */
function rotateAround(v: THREE.Vector3, axis: THREE.Vector3, angle: number) {
  _tmp2.copy(v).applyAxisAngle(axis, angle);
  v.copy(_tmp2);
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
  const shoulderWidth = 0.4;

  const yaw = deg(j.hipYaw * mirror);
  const twist = deg(j.spineTwist * mirror);
  const lean = deg(j.spineLean);

  yawBasis(yaw, _fwd, _right);

  // --- Pelvis / torso / head ---
  out.pelvis.set(0, shank + thigh * 0.12, 0);

  // Lean in the sagittal plane (about player's right axis), then place on pelvis
  _dir
    .copy(_up)
    .multiplyScalar(Math.cos(lean) * torsoLen)
    .addScaledVector(_fwd, Math.sin(lean) * torsoLen);
  out.chest.copy(out.pelvis).add(_dir);

  out.head.copy(out.chest).addScaledVector(_up, 0.28).addScaledVector(_fwd, lean * 0.05);

  // --- Legs (yawed stance; lead = net-side / front foot) ---
  // Lead hip is contralateral to hitting side for open athletic base
  out.leadHip
    .copy(out.pelvis)
    .addScaledVector(_right, -hipWidth * 0.5 * mirror)
    .addScaledVector(_fwd, 0.04);
  out.trailHip
    .copy(out.pelvis)
    .addScaledVector(_right, hipWidth * 0.5 * mirror)
    .addScaledVector(_fwd, -0.03);

  const leadKneeBend = deg(j.leadKneeFlexion);
  const trailKneeBend = deg(j.trailKneeFlexion);
  const leadHipF = deg(j.leadHipFlexion);
  const trailHipF = deg(j.trailHipFlexion);

  // Thighs: down + slight forward from hip flexion, flared by stance yaw
  _dir
    .copy(_up)
    .multiplyScalar(-Math.cos(leadHipF * 0.55) * thigh)
    .addScaledVector(_fwd, Math.sin(leadHipF * 0.55) * thigh * 0.85)
    .addScaledVector(_right, -mirror * Math.sin(leadKneeBend) * thigh * 0.08);
  out.leadKnee.copy(out.leadHip).add(_dir);

  _dir
    .copy(_up)
    .multiplyScalar(-Math.cos(trailHipF * 0.55) * thigh)
    .addScaledVector(_fwd, Math.sin(trailHipF * 0.35) * thigh * 0.5)
    .addScaledVector(_right, mirror * Math.sin(trailKneeBend) * thigh * 0.06);
  out.trailKnee.copy(out.trailHip).add(_dir);

  // Shanks down with residual knee flex (feet toward ground)
  const leadAnklePitch = leadKneeBend * 0.45 + deg(j.ankleDorsiflexion) * 0.25;
  _dir
    .copy(_up)
    .multiplyScalar(-Math.cos(leadAnklePitch * 0.5) * shank)
    .addScaledVector(_fwd, Math.sin(leadAnklePitch * 0.35) * shank * 0.25);
  out.leadAnkle.copy(out.leadKnee).add(_dir);
  out.leadAnkle.y = Math.max(0.02, out.leadAnkle.y);

  _dir
    .copy(_up)
    .multiplyScalar(-Math.cos(trailKneeBend * 0.45 * 0.5) * shank)
    .addScaledVector(_fwd, -Math.sin(trailKneeBend * 0.2) * shank * 0.15);
  out.trailAnkle.copy(out.trailKnee).add(_dir);
  out.trailAnkle.y = Math.max(0.02, out.trailAnkle.y);

  // --- Shoulders ---
  // Arm basis follows hips + a LITTLE extra twist. Full twist is expressed as
  // shoulder-line separation (X-factor): hitting shoulder back, off shoulder forward.
  // Adding 100% of spineTwist into yaw previously spun FH prep onto the BH side.
  const shYaw = yaw + twist * 0.28;
  yawBasis(yaw, _fwd, _right); // hip-facing basis for shoulder line offsets
  const xFactorShift = Math.sin(twist) * 0.16;

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

  // Arm spherical coords use moderated shoulder yaw
  yawBasis(shYaw, _fwd, _right);

  // --- Hitting arm: anatomical spherical coords in shoulder frame ---
  // flex 0 / abd 0 → hang down; flex→forward (−Z body); abd + → FH side
  const flex = deg(j.shoulderFlexion);
  const abd = deg(j.shoulderAbduction);
  const ir = deg(j.shoulderInternalRotation * mirror);

  // Shoulder basis at shYaw: flexion → forward, signed abduction → FH (+) / BH (−) side
  _dir
    .set(0, 0, 0)
    .addScaledVector(_right, mirror * Math.sin(abd))
    .addScaledVector(_up, -Math.cos(abd) * Math.cos(flex))
    .addScaledVector(_fwd, Math.cos(abd) * Math.sin(flex))
    .normalize();

  out.hitElbow.copy(out.hitShoulder).addScaledVector(_dir, upperArm);

  // Forearm: elbow flexion; overhead uses a stable axis so trophy/drop don't collapse
  _fdir.copy(_dir);
  const elbow = deg(j.elbowFlexion);
  const overhead = Math.abs(_dir.dot(_up)) > 0.65;

  if (overhead) {
    // Fold forearm behind the head / down the back (serve trophy → racket drop)
    _axis.copy(_right).multiplyScalar(mirror).normalize();
    rotateAround(_fdir, _axis, -elbow * 0.9);
    _back.set(_fwd.x, 0, _fwd.z);
    if (_back.lengthSq() > 0.04) {
      _back.normalize().multiplyScalar(-1);
      _fdir.addScaledVector(_back, 0.2 * Math.sin(elbow));
    }
  } else {
    _axis.crossVectors(_dir, _up);
    if (_axis.lengthSq() < 0.05) _axis.copy(_right).multiplyScalar(mirror);
    else _axis.normalize();
    rotateAround(_fdir, _axis, -elbow * 0.95);
    _fdir.addScaledVector(_fwd, 0.12 * Math.sin(elbow));
    _fdir.addScaledVector(_up, 0.08 * Math.sin(elbow));
  }
  // IR / ER around upper-arm axis (ER loads drop; IR = pronation at contact)
  rotateAround(_fdir, _dir, ir * 0.9);
  _fdir.normalize();

  out.hitWrist.copy(out.hitElbow).addScaledVector(_fdir, forearm);

  // --- Racket: elevation is absolute tip pitch from horizontal (stable coaching poses) ---
  // 0° = tip level with hand, +90° = tip straight up, −90° = tip straight down (scratch-back)
  const elevRad = deg(Math.max(-95, Math.min(95, j.racketPathElevation)));
  const face = (j.racketFaceAngle * mirror) / 45;
  const ulnar = (j.wristUlnarDeviation * mirror) / 40;
  const lag = j.wristExtension / 70;

  // Horizontal aim: forearm's ground projection, fallback along shoulder forward
  _rdir.set(_fdir.x, 0, _fdir.z);
  if (_rdir.lengthSq() < 0.04) {
    _rdir.copy(_fwd);
  }
  _rdir.normalize();
  _rdir.multiplyScalar(Math.cos(elevRad));
  _rdir.y = Math.sin(elevRad);

  // Wrist lag: tip lays back (more up + slightly opposite the forearm horizontal)
  // Avoid using −fwd while sideways — that used to yank FH prep onto the BH side.
  if (lag > 0) {
    _tmp2.set(_fdir.x, 0, _fdir.z);
    if (_tmp2.lengthSq() > 0.04) {
      _tmp2.normalize();
      _rdir.addScaledVector(_tmp2, -lag * 0.28);
    }
    _rdir.addScaledVector(_up, lag * 0.22);
  } else if (lag < 0) {
    // Snap / release: tip pulls through toward the net
    _rdir.addScaledVector(_fwd, -lag * 0.5);
  }

  // Face open/closed + ulnar wipe (lateral tip bias)
  _rdir.addScaledVector(_right, face * 0.28 - ulnar * 0.35);
  _rdir.addScaledVector(_up, Math.max(0, j.racketFaceAngle) * 0.003 + ulnar * 0.1);
  _rdir.normalize();

  const tipLen = 0.62;
  out.racketTip.copy(out.hitWrist).addScaledVector(_rdir, tipLen);

  // --- Non-hitting arm ---
  const nhFlex = deg(j.nonHittingShoulderFlexion);
  const nhAbd = deg(28);
  _dir
    .set(0, 0, 0)
    .addScaledVector(_right, -mirror * Math.sin(nhAbd))
    .addScaledVector(_up, -Math.cos(nhAbd) * Math.cos(nhFlex))
    .addScaledVector(_fwd, Math.cos(nhAbd) * Math.sin(nhFlex))
    .normalize();
  out.nonHitElbow.copy(out.nonHitShoulder).addScaledVector(_dir, upperArm * 0.95);

  _fdir.copy(_dir);
  _axis.crossVectors(_dir, _up);
  if (_axis.lengthSq() < 0.05) _axis.copy(_right).multiplyScalar(-mirror);
  else _axis.normalize();
  rotateAround(_fdir, _axis, -deg(j.nonHittingElbowFlexion) * 0.9);
  _fdir.normalize();
  out.nonHitWrist.copy(out.nonHitElbow).addScaledVector(_fdir, forearm * 0.95);

  if (!oneHanded) {
    // Two-handed: both hands on the handle
    out.nonHitWrist.lerp(out.hitWrist, 0.72);
    out.nonHitElbow.lerp(out.hitElbow, 0.45);
  }
}

/** Approximate racket tip for path trails (no full pose alloc). */
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
