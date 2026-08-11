"use client";

import { useMemo, useRef, useState, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Line, Text } from "@react-three/drei";
import * as THREE from "three";
import type { JointAngles } from "@/types/biomechanics";
import { deg } from "@/lib/kinematics";

interface AngleArcProps {
  jointsRef: RefObject<JointAngles>;
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

/** Angle HUD — samples joints from a ref at ~10fps to avoid Text/Line thrash */
export function AngleOverlays({ jointsRef, visible, accent, handedness }: AngleArcProps) {
  const mirror = handedness === "left" ? -1 : 1;
  const accum = useRef(0);
  const prev = useRef({ elbow: -999, knee: -999, shoulder: -999, trunk: -999 });
  const [snap, setSnap] = useState({ elbow: 0, knee: 0, shoulder: 0, trunk: 0, twist: 0 });

  useFrame((_, dt) => {
    if (!visible) return;
    accum.current += dt;
    if (accum.current < 0.1) return;
    accum.current = 0;

    const j = jointsRef.current;
    if (!j) return;

    const next = {
      elbow: Math.round(j.elbowFlexion),
      knee: Math.round(j.leadKneeFlexion),
      shoulder: Math.round(j.shoulderInternalRotation),
      trunk: Math.round(Math.abs(j.spineTwist)),
      twist: j.spineTwist,
    };
    const p = prev.current;
    if (
      next.elbow === p.elbow &&
      next.knee === p.knee &&
      next.shoulder === p.shoulder &&
      next.trunk === p.trunk
    ) {
      return;
    }
    prev.current = next;
    setSnap(next);
  });

  const overlays = useMemo(() => {
    if (!visible) return [];

    const hip = new THREE.Vector3(0, 0.95, 0);
    const shoulder = new THREE.Vector3(0.2 * mirror, 1.45, 0);
    const elbow = new THREE.Vector3(0.25 * mirror, 1.2, 0.25);
    const knee = new THREE.Vector3(-0.12 * mirror, 0.55, 0.05);

    return [
      {
        id: "elbow",
        label: `Elbow ${snap.elbow}°`,
        points: makeArc(elbow, new THREE.Vector3(mirror, 0, 0), new THREE.Vector3(0, -1, 0.2), snap.elbow, 0.22),
        labelPos: elbow.clone().add(new THREE.Vector3(0.2 * mirror, 0.05, 0.15)),
      },
      {
        id: "knee",
        label: `Lead knee ${snap.knee}°`,
        points: makeArc(knee, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, -1, 0), snap.knee, 0.2),
        labelPos: knee.clone().add(new THREE.Vector3(-0.25 * mirror, 0, 0.1)),
      },
      {
        id: "shoulder",
        label: `Shoulder IR ${snap.shoulder}°`,
        points: makeArc(
          shoulder,
          new THREE.Vector3(0, 1, 0),
          new THREE.Vector3(0, 0, 1),
          snap.shoulder,
          0.25,
        ),
        labelPos: shoulder.clone().add(new THREE.Vector3(0.15 * mirror, 0.2, 0.1)),
      },
      {
        id: "xfactor",
        label: `Trunk ${snap.trunk}°`,
        points: makeArc(
          hip,
          new THREE.Vector3(0, 1, 0),
          new THREE.Vector3(0, 0, 1),
          snap.twist * mirror,
          0.35,
        ),
        labelPos: hip.clone().add(new THREE.Vector3(0, 0.35, 0.3)),
      },
    ];
  }, [visible, mirror, snap]);

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
