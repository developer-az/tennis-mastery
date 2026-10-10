import * as THREE from "three";
import type { QuatTuple, Vec3Tuple } from "./types";

export function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}

export function clamp01(t: number): number {
  return clamp(t, 0, 1);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstep(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

export function deg(d: number): number {
  return (d * Math.PI) / 180;
}

export function radToDeg(r: number): number {
  return (r * 180) / Math.PI;
}

const _qa = new THREE.Quaternion();
const _qb = new THREE.Quaternion();
const _qc = new THREE.Quaternion();

export function packQuat(q: THREE.Quaternion): QuatTuple {
  if (q.w < 0) return [-q.x, -q.y, -q.z, -q.w];
  return [q.x, q.y, q.z, q.w];
}

export function unpackQuat(t: QuatTuple, out = new THREE.Quaternion()): THREE.Quaternion {
  return out.set(t[0], t[1], t[2], t[3]).normalize();
}

export function slerpQuat(a: QuatTuple, b: QuatTuple, t: number, out: QuatTuple): QuatTuple {
  _qa.set(a[0], a[1], a[2], a[3]);
  _qb.set(b[0], b[1], b[2], b[3]);
  if (_qa.dot(_qb) < 0) _qb.set(-_qb.x, -_qb.y, -_qb.z, -_qb.w);
  _qc.slerpQuaternions(_qa, _qb, t);
  const p = packQuat(_qc);
  out[0] = p[0];
  out[1] = p[1];
  out[2] = p[2];
  out[3] = p[3];
  return out;
}

export function lerpVec3(a: Vec3Tuple, b: Vec3Tuple, t: number, out: Vec3Tuple): Vec3Tuple {
  out[0] = lerp(a[0], b[0], t);
  out[1] = lerp(a[1], b[1], t);
  out[2] = lerp(a[2], b[2], t);
  return out;
}

/** Mirror a rotation across the YZ plane (X → −X). */
export function mirrorQuatYZ(q: QuatTuple, out: QuatTuple = [0, 0, 0, 1]): QuatTuple {
  out[0] = q[0];
  out[1] = -q[1];
  out[2] = -q[2];
  out[3] = q[3];
  return out;
}

export function jointAngleDeg(a: THREE.Vector3, vertex: THREE.Vector3, c: THREE.Vector3): number {
  const u = a.clone().sub(vertex);
  const v = c.clone().sub(vertex);
  if (u.lengthSq() < 1e-10 || v.lengthSq() < 1e-10) return 0;
  u.normalize();
  v.normalize();
  return radToDeg(Math.acos(clamp(u.dot(v), -1, 1)));
}

/** Interior flexion (0 = straight) from three joints. */
export function flexionDeg(proximal: THREE.Vector3, joint: THREE.Vector3, distal: THREE.Vector3): number {
  return Math.max(0, 180 - jointAngleDeg(proximal, joint, distal));
}

export function yawBasis(yawRad: number, forward: THREE.Vector3, right: THREE.Vector3) {
  const c = Math.cos(yawRad);
  const s = Math.sin(yawRad);
  forward.set(-s, 0, -c);
  right.set(c, 0, -s);
}

export function twoBoneIk(
  hip: THREE.Vector3,
  ankle: THREE.Vector3,
  thighLen: number,
  shankLen: number,
  pole: THREE.Vector3,
  outKnee: THREE.Vector3,
): THREE.Vector3 {
  const to = ankle.clone().sub(hip);
  const maxR = thighLen + shankLen - 0.012;
  const minR = Math.abs(thighLen - shankLen) + 0.012;
  const dist = clamp(to.length(), minR, maxR);
  if (to.lengthSq() < 1e-10) {
    outKnee.copy(hip).add(new THREE.Vector3(0, -thighLen, 0.04));
    return outKnee;
  }
  to.setLength(dist);
  const d = dist;
  const cosHip = clamp((thighLen * thighLen + d * d - shankLen * shankLen) / (2 * thighLen * d), -1, 1);
  const hipAngle = Math.acos(cosHip);
  const dir = to.clone().multiplyScalar(1 / d);
  const poleDir = pole.clone().sub(hip);
  poleDir.addScaledVector(dir, -poleDir.dot(dir));
  if (poleDir.lengthSq() < 1e-8) poleDir.set(0, 0, 1);
  poleDir.normalize();
  const axis = new THREE.Vector3().crossVectors(dir, poleDir);
  if (axis.lengthSq() < 1e-8) axis.set(1, 0, 0);
  else axis.normalize();
  const thighDir = dir.clone().applyAxisAngle(axis, -hipAngle);
  outKnee.copy(hip).addScaledVector(thighDir, thighLen);
  return outKnee;
}
