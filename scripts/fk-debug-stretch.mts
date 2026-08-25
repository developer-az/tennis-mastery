/**
 * Diagnose leg stretch/shoot-up and elbow facing-up through swings.
 */
import { createSkeletonPose, solveSkeletonFk } from "../src/lib/skeletonFk";
import { sampleStroke } from "../src/lib/kinematics";
import {
  federerForehand,
  nadalForehand,
  djokovicBackhand,
  serenaServe,
} from "../src/data/strokes";
import type { StrokeProfile } from "../src/types/biomechanics";
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
const thigh = anthro.heightM * anthro.thighRatio;
const shank = anthro.heightM * anthro.shankRatio;

function scan(stroke: StrokeProfile) {
  console.log(`\n=== ${stroke.label} ===`);
  let prev: {
    kLy: number;
    kTy: number;
    pY: number;
    eY: number;
    wY: number;
  } | null = null;
  const kneeShots: string[] = [];
  const stretch: string[] = [];
  const elbowUp: string[] = [];
  let maxKneeDy = 0;
  let maxThighErr = 0;
  let maxShankErr = 0;
  let maxElbowUp = 0;

  for (let i = 0; i <= 200; i++) {
    const t = i / 200;
    const s = sampleStroke(stroke, t);
    solveSkeletonFk(pose, s.joints, anthro, stroke.handedness, stroke.oneHanded);

    const thighL = pose.leadHip.distanceTo(pose.leadKnee);
    const shankL = pose.leadKnee.distanceTo(pose.leadAnkle);
    const thighT = pose.trailHip.distanceTo(pose.trailKnee);
    const shankT = pose.trailKnee.distanceTo(pose.trailAnkle);
    maxThighErr = Math.max(
      maxThighErr,
      Math.abs(thighL - thigh),
      Math.abs(thighT - thigh),
    );
    maxShankErr = Math.max(
      maxShankErr,
      Math.abs(shankL - shank),
      Math.abs(shankT - shank),
    );

    if (thighL > thigh * 1.08 || shankL > shank * 1.08 || thighT > thigh * 1.08 || shankT > shank * 1.08) {
      stretch.push(
        `t=${t.toFixed(3)} ${s.phase} thighL=${thighL.toFixed(3)}/${thigh.toFixed(3)} shankL=${shankL.toFixed(3)} thighT=${thighT.toFixed(3)} shankT=${shankT.toFixed(3)} kneeLY=${pose.leadKnee.y.toFixed(2)} pelY=${pose.pelvis.y.toFixed(2)}`,
      );
    }

    if (prev) {
      const dLy = pose.leadKnee.y - prev.kLy;
      const dTy = pose.trailKnee.y - prev.kTy;
      const dPy = pose.pelvis.y - prev.pY;
      maxKneeDy = Math.max(maxKneeDy, Math.abs(dLy), Math.abs(dTy));
      if (dLy > 0.12 || dTy > 0.12) {
        kneeShots.push(
          `t=${t.toFixed(3)} ${s.phase} dLy=${dLy.toFixed(3)} dTy=${dTy.toFixed(3)} dPelY=${dPy.toFixed(3)} kL=${pose.leadKnee.y.toFixed(2)} kT=${pose.trailKnee.y.toFixed(2)} pel=${pose.pelvis.y.toFixed(2)} hipL=${pose.leadHip.y.toFixed(2)}`,
        );
      }
    }

    // Elbow "facing up": upper arm pointing up AND forearm fold reading as tip-up chicken wing
    const upper = new THREE.Vector3().subVectors(pose.hitElbow, pose.hitShoulder).normalize();
    const fore = new THREE.Vector3().subVectors(pose.hitWrist, pose.hitElbow).normalize();
    const elbowUpDot = upper.y; // +1 = elbow above shoulder along up
    const foreUp = fore.y;
    const fold = (Math.acos(Math.max(-1, Math.min(1, upper.dot(fore)))) * 180) / Math.PI;
    // Bad: elbow joint higher than shoulder with forearm continuing up (arm inverted)
    if (pose.hitElbow.y > pose.hitShoulder.y + 0.08 && foreUp > 0.35 && s.phase !== "trophy" && s.phase !== "contact" || 
        (s.phase === "acceleration" || s.phase === "backswing" || s.phase === "unitTurn") && elbowUpDot > 0.55 && fold > 50) {
      if (elbowUp.length < 8) {
        elbowUp.push(
          `t=${t.toFixed(3)} ${s.phase} elbY=${pose.hitElbow.y.toFixed(2)} shY=${pose.hitShoulder.y.toFixed(2)} upperY=${elbowUpDot.toFixed(2)} foreY=${foreUp.toFixed(2)} fold=${fold.toFixed(0)} wrY=${pose.hitWrist.y.toFixed(2)} tipY=${pose.racketTip.y.toFixed(2)} abd=${s.joints.shoulderAbduction.toFixed(0)} flex=${s.joints.shoulderFlexion.toFixed(0)} elb=${s.joints.elbowFlexion.toFixed(0)}`,
        );
      }
    }
    maxElbowUp = Math.max(maxElbowUp, elbowUpDot);

    prev = {
      kLy: pose.leadKnee.y,
      kTy: pose.trailKnee.y,
      pY: pose.pelvis.y,
      eY: pose.hitElbow.y,
      wY: pose.hitWrist.y,
    };
  }

  console.log(`maxKneeΔY=${maxKneeDy.toFixed(3)} maxThighErr=${maxThighErr.toFixed(4)} maxShankErr=${maxShankErr.toFixed(4)} maxUpperY=${maxElbowUp.toFixed(2)}`);
  console.log(`knee shoot-up events: ${kneeShots.length}`);
  for (const e of kneeShots.slice(0, 8)) console.log("  " + e);
  console.log(`stretch events: ${stretch.length}`);
  for (const e of stretch.slice(0, 6)) console.log("  " + e);
  console.log(`elbow-up flags: ${elbowUp.length}`);
  for (const e of elbowUp.slice(0, 8)) console.log("  " + e);
}

scan(federerForehand);
scan(nadalForehand);
scan(djokovicBackhand);
scan(serenaServe);
