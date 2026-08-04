"use client";

import { useMemo } from "react";
import { Line, Text } from "@react-three/drei";
import * as THREE from "three";
import type { JointAngles } from "@/types/biomechanics";
import { deg } from "@/lib/kinematics";

interface AngleArcProps {
  joints: JointAngles;
  visible: boolean;
  accent: string;
  handedness: "right" | "left";
}

function makeArc(
  origin: THREE.Vector3,
  axis: THREE.Vector3,
  fromDir: THREE.Vector3,
  angleDeg: number,
  radius: number,
  segments = 24,
): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  const n = Math.max(2, Math.abs(Math.round(angleDeg / 4)));
  const q = new THREE.Quaternion();
  const a = axis.clone().normalize();
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * deg(angleDeg);
    q.setFromAxisAngle(a, t);
    pts.push(origin.clone().add(fromDir.clone().normalize().multiplyScalar(radius).applyQuaternion(q)));
  }
  // ensure we use segments param for lint
  void segments;
  return pts;
}

export function AngleOverlays({ joints, visible, accent, handedness }: AngleArcProps) {
  const mirror = handedness === "left" ? -1 : 1;

  const overlays = useMemo(() => {
    if (!visible) return [];

    const hip = new THREE.Vector3(0, 0.95, 0);
    const shoulder = new THREE.Vector3(0.2 * mirror, 1.45, 0);
    const elbow = new THREE.Vector3(0.25 * mirror, 1.2, 0.25);
    const knee = new THREE.Vector3(-0.12 * mirror, 0.55, 0.05);

    return [
      {
        id: "elbow",
        label: `Elbow ${Math.round(joints.elbowFlexion)}°`,
        points: makeArc(elbow, new THREE.Vector3(mirror, 0, 0), new THREE.Vector3(0, -1, 0.2), joints.elbowFlexion, 0.22),
        labelPos: elbow.clone().add(new THREE.Vector3(0.2 * mirror, 0.05, 0.15)),
      },
      {
        id: "knee",
        label: `Lead knee ${Math.round(joints.leadKneeFlexion)}°`,
        points: makeArc(knee, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, -1, 0), joints.leadKneeFlexion, 0.2),
        labelPos: knee.clone().add(new THREE.Vector3(-0.25 * mirror, 0, 0.1)),
      },
      {
        id: "shoulder",
        label: `Shoulder IR ${Math.round(joints.shoulderInternalRotation)}°`,
        points: makeArc(
          shoulder,
          new THREE.Vector3(0, 1, 0),
          new THREE.Vector3(0, 0, 1),
          joints.shoulderInternalRotation,
          0.25,
        ),
        labelPos: shoulder.clone().add(new THREE.Vector3(0.15 * mirror, 0.2, 0.1)),
      },
      {
        id: "xfactor",
        label: `Trunk ${Math.round(Math.abs(joints.spineTwist))}°`,
        points: makeArc(hip, new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), joints.spineTwist * mirror, 0.35),
        labelPos: hip.clone().add(new THREE.Vector3(0, 0.35, 0.3)),
      },
    ];
  }, [joints, visible, mirror]);

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
