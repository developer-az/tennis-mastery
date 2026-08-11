"use client";

import { useMemo, useRef, useState, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import type { StrokeProfile } from "@/types/biomechanics";
import { sampleStroke } from "@/lib/kinematics";

/** Sample racket tip positions across the stroke for path visualization */
export function RacketPathTrail({
  stroke,
  visible,
  accent,
  tRef,
}: {
  stroke: StrokeProfile;
  visible: boolean;
  accent: string;
  tRef: RefObject<number>;
}) {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const steps = 32;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const pose = sampleStroke(stroke, t);
      const j = pose.joints;
      const mirror = stroke.handedness === "left" ? -1 : 1;
      const x =
        0.35 * mirror +
        Math.sin((j.hipYaw + j.spineTwist) * mirror * 0.017) * 0.4 +
        j.shoulderAbduction * 0.004 * mirror +
        j.wristExtension * 0.001 * mirror;
      const y =
        1.1 +
        j.shoulderFlexion * 0.008 +
        j.racketPathElevation * 0.01 -
        j.elbowFlexion * 0.003 -
        j.wristExtension * 0.002;
      const z =
        0.2 +
        Math.cos((j.hipYaw + j.spineTwist) * 0.017) * 0.35 +
        j.shoulderFlexion * 0.005;
      pts.push(new THREE.Vector3(x, Math.max(0.2, y), z));
    }
    return pts;
  }, [stroke]);

  const lastCount = useRef(-1);
  const [fadeCount, setFadeCount] = useState(2);

  useFrame(() => {
    if (!visible) return;
    const t = tRef.current ?? 0;
    const next = Math.max(2, Math.floor(t * points.length));
    if (next !== lastCount.current) {
      lastCount.current = next;
      setFadeCount(next);
    }
  });

  if (!visible) return null;

  const active = points.slice(0, fadeCount);

  return (
    <group>
      <Line points={points} color={accent} lineWidth={1} transparent opacity={0.22} dashed dashSize={0.08} gapSize={0.05} />
      {active.length > 1 && (
        <Line points={active} color={accent} lineWidth={2.5} transparent opacity={0.85} />
      )}
    </group>
  );
}
