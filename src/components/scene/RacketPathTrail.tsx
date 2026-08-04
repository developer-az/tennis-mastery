"use client";

import { useMemo } from "react";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import type { StrokeProfile } from "@/types/biomechanics";
import { sampleStroke } from "@/lib/kinematics";

/** Sample racket tip positions across the stroke for path visualization */
export function RacketPathTrail({
  stroke,
  visible,
  accent,
  currentT,
}: {
  stroke: StrokeProfile;
  visible: boolean;
  accent: string;
  currentT: number;
}) {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const steps = 48;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const pose = sampleStroke(stroke, t);
      const j = pose.joints;
      const mirror = stroke.handedness === "left" ? -1 : 1;
      // Approximate tip in world space (matches skeleton mapping roughly)
      const x =
        0.35 * mirror +
        Math.sin((j.hipYaw + j.spineTwist) * mirror * 0.017) * 0.4 +
        j.shoulderAbduction * 0.004 * mirror;
      const y =
        1.1 +
        j.shoulderFlexion * 0.008 +
        j.racketPathElevation * 0.01 -
        j.elbowFlexion * 0.003;
      const z =
        0.2 +
        Math.cos((j.hipYaw + j.spineTwist) * 0.017) * 0.35 +
        j.shoulderFlexion * 0.005;
      pts.push(new THREE.Vector3(x, Math.max(0.15, y), z));
    }
    return pts;
  }, [stroke]);

  if (!visible) return null;

  const fadeCount = Math.max(2, Math.floor(currentT * points.length));
  const active = points.slice(0, fadeCount);

  return (
    <group>
      <Line points={points} color={accent} lineWidth={1} transparent opacity={0.25} dashed dashSize={0.08} gapSize={0.05} />
      {active.length > 1 && (
        <Line points={active} color={accent} lineWidth={3} transparent opacity={0.9} />
      )}
    </group>
  );
}
