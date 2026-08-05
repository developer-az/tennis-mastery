"use client";

import { useMemo } from "react";
import { Line, Text } from "@react-three/drei";
import * as THREE from "three";
import type { Anthropometrics, JointAngles } from "@/types/biomechanics";
import { deg } from "@/lib/kinematics";
import { computeSkeletonPose } from "@/lib/skeletonPose";

interface AngleArcProps {
  joints: JointAngles;
  anthropometrics: Anthropometrics;
  visible: boolean;
  accent: string;
  handedness: "right" | "left";
  oneHanded: boolean;
}

function makeArc(
  origin: THREE.Vector3,
  axis: THREE.Vector3,
  fromDir: THREE.Vector3,
  angleDeg: number,
  radius: number,
): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  const n = Math.max(2, Math.abs(Math.round(angleDeg / 4)));
  const q = new THREE.Quaternion();
  const a = axis.clone().normalize();
  const base = fromDir.clone().normalize();
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * deg(angleDeg);
    q.setFromAxisAngle(a, t);
    pts.push(origin.clone().add(base.clone().multiplyScalar(radius).applyQuaternion(q)));
  }
  return pts;
}

export function AngleOverlays({
  joints,
  anthropometrics,
  visible,
  accent,
  handedness,
  oneHanded,
}: AngleArcProps) {
  const overlays = useMemo(() => {
    if (!visible) return [];

    const pose = computeSkeletonPose(joints, anthropometrics, handedness, oneHanded);
    const mirror = handedness === "left" ? -1 : 1;

    const elbowOrigin = pose.hitElbow;
    const upper = new THREE.Vector3().subVectors(pose.hitShoulder, pose.hitElbow).normalize();
    const fore = new THREE.Vector3().subVectors(pose.hitWrist, pose.hitElbow).normalize();
    let elbowAxis = new THREE.Vector3().crossVectors(upper, fore);
    if (elbowAxis.lengthSq() < 1e-5) elbowAxis = new THREE.Vector3(mirror, 0, 0);
    elbowAxis.normalize();

    const kneeOrigin = pose.leadKnee;
    const thigh = new THREE.Vector3().subVectors(pose.leadHip, pose.leadKnee).normalize();
    const shank = new THREE.Vector3().subVectors(pose.leadAnkle, pose.leadKnee).normalize();
    let kneeAxis = new THREE.Vector3().crossVectors(thigh, shank);
    if (kneeAxis.lengthSq() < 1e-5) kneeAxis = new THREE.Vector3(1, 0, 0);
    kneeAxis.normalize();

    return [
      {
        id: "elbow",
        label: `Elbow ${Math.round(joints.elbowFlexion)}°`,
        points: makeArc(elbowOrigin, elbowAxis, upper, Math.max(8, joints.elbowFlexion), 0.2),
        labelPos: pose.hitElbow.clone().add(new THREE.Vector3(0.15 * mirror, 0.08, 0.1)),
      },
      {
        id: "knee",
        label: `Lead knee ${Math.round(joints.leadKneeFlexion)}°`,
        points: makeArc(kneeOrigin, kneeAxis, thigh, Math.max(8, joints.leadKneeFlexion), 0.18),
        labelPos: pose.leadKnee.clone().add(new THREE.Vector3(-0.2 * mirror, 0.05, 0.1)),
      },
      {
        id: "shoulder",
        label: `Shoulder IR ${Math.round(joints.shoulderInternalRotation)}°`,
        points: makeArc(
          pose.hitShoulder,
          new THREE.Vector3(0, 1, 0),
          new THREE.Vector3(0, 0, 1),
          joints.shoulderInternalRotation,
          0.22,
        ),
        labelPos: pose.hitShoulder.clone().add(new THREE.Vector3(0.12 * mirror, 0.18, 0.08)),
      },
      {
        id: "xfactor",
        label: `Trunk ${Math.round(Math.abs(joints.spineTwist))}°`,
        points: makeArc(
          pose.pelvis,
          new THREE.Vector3(0, 1, 0),
          new THREE.Vector3(0, 0, 1),
          joints.spineTwist * mirror,
          0.32,
        ),
        labelPos: pose.pelvis.clone().add(new THREE.Vector3(0, 0.32, 0.28)),
      },
    ];
  }, [joints, anthropometrics, visible, handedness, oneHanded]);

  if (!visible) return null;

  return (
    <group>
      {overlays.map((o) => (
        <group key={o.id}>
          <Line points={o.points} color={accent} lineWidth={2} transparent opacity={0.85} />
          <Text
            position={o.labelPos}
            fontSize={0.07}
            color={accent}
            anchorX="left"
            anchorY="middle"
            outlineWidth={0.008}
            outlineColor="#0a0f0c"
          >
            {o.label}
          </Text>
        </group>
      ))}
    </group>
  );
}
