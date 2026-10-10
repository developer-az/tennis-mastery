"use client";

import { useMemo, useRef, useState, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Line, Text } from "@react-three/drei";
import * as THREE from "three";
import type { SkeletonPose } from "@/lib/motion/pose";
import { poseAngles } from "@/lib/motion/solve";
import { deg } from "@/lib/kinematics";

function makeArc(
  origin: THREE.Vector3,
  axis: THREE.Vector3,
  fromDir: THREE.Vector3,
  angleDeg: number,
  radius: number,
): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  const n = Math.max(2, Math.min(16, Math.abs(Math.round(angleDeg / 6))));
  const q = new THREE.Quaternion();
  const a = axis.clone().normalize();
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * deg(angleDeg);
    q.setFromAxisAngle(a, t);
    pts.push(origin.clone().add(fromDir.clone().normalize().multiplyScalar(radius).applyQuaternion(q)));
  }
  return pts;
}

/** Angle HUD — reads the same solved clip pose as the armature. */
export function AngleOverlays({
  poseRef,
  visible,
}: {
  poseRef: RefObject<SkeletonPose>;
  visible: boolean;
}) {
  const accum = useRef(0);
  const prev = useRef({ elbow: -999, knee: -999, shoulder: -999, trunk: -999 });
  const [snap, setSnap] = useState({
    elbow: 0,
    knee: 0,
    shoulder: 0,
    trunk: 0,
    twist: 0,
    elbowPos: new THREE.Vector3(0.25, 1.2, 0.2),
    kneePos: new THREE.Vector3(-0.12, 0.55, 0.05),
    shoulderPos: new THREE.Vector3(0.2, 1.45, 0),
    hipPos: new THREE.Vector3(0, 0.95, 0),
  });

  useFrame((_, dt) => {
    if (!visible) return;
    accum.current += dt;
    if (accum.current < 0.1) return;
    accum.current = 0;
    const p = poseRef.current;
    if (!p) return;
    const a = poseAngles(p);
    const next = {
      elbow: Math.round(a.elbowFlexion),
      knee: Math.round(a.leadKneeFlexion),
      shoulder: Math.round(a.shoulderInternalRotation),
      trunk: Math.round(Math.abs(a.spineTwist)),
      twist: a.spineTwist,
      elbowPos: p.hitElbow.clone(),
      kneePos: p.leadKnee.clone(),
      shoulderPos: p.hitShoulder.clone(),
      hipPos: p.pelvis.clone(),
    };
    const pr = prev.current;
    if (
      next.elbow === pr.elbow &&
      next.knee === pr.knee &&
      next.shoulder === pr.shoulder &&
      next.trunk === pr.trunk
    ) {
      return;
    }
    prev.current = next;
    setSnap(next);
  });

  const overlays = useMemo(() => {
    if (!visible) return [];
    return [
      {
        id: "elbow",
        label: `Elbow ${snap.elbow}°`,
        points: makeArc(snap.elbowPos, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, -1, 0.2), snap.elbow, 0.22),
        labelPos: snap.elbowPos.clone().add(new THREE.Vector3(0.16, 0.06, 0.12)),
      },
      {
        id: "knee",
        label: `Lead knee ${snap.knee}°`,
        points: makeArc(snap.kneePos, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, -1, 0), snap.knee, 0.2),
        labelPos: snap.kneePos.clone().add(new THREE.Vector3(-0.22, 0.04, 0.1)),
      },
      {
        id: "shoulder",
        label: `Shoulder IR ${snap.shoulder}°`,
        points: makeArc(snap.shoulderPos, new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), snap.shoulder, 0.22),
        labelPos: snap.shoulderPos.clone().add(new THREE.Vector3(0.14, 0.18, 0.08)),
      },
      {
        id: "xfactor",
        label: `Trunk ${snap.trunk}°`,
        points: makeArc(snap.hipPos, new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), snap.twist, 0.32),
        labelPos: snap.hipPos.clone().add(new THREE.Vector3(0, 0.32, 0.24)),
      },
    ];
  }, [visible, snap]);

  if (!visible) return null;

  return (
    <group>
      {overlays.map((o) => (
        <group key={o.id}>
          <Line points={o.points} color="#0b8fa8" lineWidth={2} transparent opacity={0.85} />
          <Text
            position={o.labelPos}
            fontSize={0.07}
            color="#0b8fa8"
            anchorX="left"
            anchorY="middle"
            outlineWidth={0.008}
            outlineColor="#1a1c1b"
          >
            {o.label}
          </Text>
        </group>
      ))}
    </group>
  );
}
