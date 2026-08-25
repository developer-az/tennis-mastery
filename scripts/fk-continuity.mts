/**
 * Scan stroke timelines for large per-frame joint / tip / face jumps (FK discontinuities).
 *
 * Face normals from stateless FK may flip hemisphere; we apply the same temporal
 * sign-lock the renderer uses, and also check the continuous faceRoll scalar.
 */
import { createSkeletonPose, solveSkeletonFk } from "../src/lib/skeletonFk.ts";
import { sampleStroke } from "../src/lib/kinematics.ts";
import {
  alcarazVolley,
  djokovicBackhand,
  federerForehand,
  federerOneHandedBackhand,
  federerSlice,
  nadalForehand,
  serenaServe,
} from "../src/data/strokes.ts";
import type { StrokeProfile } from "../src/types/biomechanics.ts";
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
const _u = new THREE.Vector3();

function scan(stroke: StrokeProfile, steps = 250) {
  let prevE: THREE.Vector3 | null = null;
  let prevW: THREE.Vector3 | null = null;
  let prevTip: THREE.Vector3 | null = null;
  let prevFore: THREE.Vector3 | null = null;
  let prevFace: THREE.Vector3 | null = null;
  let prevRoll: number | null = null;

  let maxElbow = 0;
  let maxTip = 0;
  let maxFore = 0;
  let maxFace = 0;
  let maxRoll = 0;
  let maxElbowAt = 0;
  let maxTipAt = 0;
  let maxForeAt = 0;
  let maxFaceAt = 0;
  let maxRollAt = 0;
  const events: string[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const s = sampleStroke(stroke, t);
    solveSkeletonFk(pose, s.joints, anthro, stroke.handedness, stroke.oneHanded);

    const e = pose.hitElbow.clone();
    const w = pose.hitWrist.clone();
    const tip = pose.racketTip.clone();
    const faceN = pose.racketFaceNormal.clone();
    if (prevFace && faceN.dot(prevFace) < -0.2) faceN.negate();
    const roll = pose.racketFaceRoll;
    const fore = w.clone().sub(e).normalize();
    _u.copy(e).sub(pose.hitShoulder).normalize();
    const upDot = Math.abs(_u.y);

    if (prevE && prevW && prevTip && prevFore && prevFace && prevRoll !== null) {
      const de = e.distanceTo(prevE);
      const dt = tip.distanceTo(prevTip);
      const dFore = 1 - Math.max(-1, Math.min(1, fore.dot(prevFore)));
      const dFace = 1 - Math.max(-1, Math.min(1, faceN.dot(prevFace)));
      let dRoll = Math.abs(roll - prevRoll);
      // unwrap roll delta
      while (dRoll > Math.PI) dRoll = Math.abs(dRoll - Math.PI * 2);

      if (de > maxElbow) {
        maxElbow = de;
        maxElbowAt = t;
      }
      if (dt > maxTip) {
        maxTip = dt;
        maxTipAt = t;
      }
      if (dFore > maxFore) {
        maxFore = dFore;
        maxForeAt = t;
      }
      if (dFace > maxFace) {
        maxFace = dFace;
        maxFaceAt = t;
      }
      if (dRoll > maxRoll) {
        maxRoll = dRoll;
        maxRollAt = t;
      }

      if (de > 0.06 || dFore > 0.08 || dFace > 0.25 || dRoll > 0.35) {
        events.push(
          `  t=${t.toFixed(3)} ${s.phase.padEnd(14)} de=${de.toFixed(3)} dt=${dt.toFixed(3)} dFore=${dFore.toFixed(3)} dFace=${dFace.toFixed(3)} dRoll=${dRoll.toFixed(3)} upDot=${upDot.toFixed(2)}`,
        );
      }
    }

    prevE = e;
    prevW = w;
    prevTip = tip;
    prevFore = fore;
    prevFace = faceN;
    prevRoll = roll;
  }

  console.log(`\n=== ${stroke.label} ===`);
  console.log(
    `maxElbowΔ=${maxElbow.toFixed(3)} @${maxElbowAt.toFixed(3)}  maxTipΔ=${maxTip.toFixed(3)} @${maxTipAt.toFixed(3)}  maxFore≈${maxFore.toFixed(3)} @${maxForeAt.toFixed(3)}  maxFace≈${maxFace.toFixed(3)} @${maxFaceAt.toFixed(3)}  maxRoll≈${maxRoll.toFixed(3)} @${maxRollAt.toFixed(3)}`,
  );
  console.log(`flagged events: ${events.length}`);
  for (const ev of events.slice(0, 12)) console.log(ev);
  if (events.length > 12) console.log(`  ... +${events.length - 12} more`);

  return { maxElbow, maxTip, maxFore, maxFace, maxRoll };
}

const strokes = [
  federerForehand,
  nadalForehand,
  djokovicBackhand,
  federerOneHandedBackhand,
  serenaServe,
  federerSlice,
  alcarazVolley,
];

let fail = false;
for (const s of strokes) {
  const r = scan(s);
  // Singularity-scale: ~180° forearm flip (dFore~2) or huge roll jump
  if (r.maxFore > 0.35 || r.maxRoll > 0.7 || r.maxElbow > 0.08 || r.maxFace > 0.6) {
    console.log(
      `FAIL ${s.label}: fore=${r.maxFore.toFixed(3)} face=${r.maxFace.toFixed(3)} roll=${r.maxRoll.toFixed(3)} elbow=${r.maxElbow.toFixed(3)}`,
    );
    fail = true;
  }
}

if (fail) {
  console.log("\nContinuity check FAILED (singularity-scale jumps remain)");
  process.exitCode = 1;
} else {
  console.log("\nContinuity check OK (no singularity-scale elbow/face flips)");
}
