"use client";

import { useMemo } from "react";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import type { Anthropometrics, StrokeProfile } from "@/types/biomechanics";
import { sampleStroke } from "@/lib/kinematics";
import { computeSkeletonPose } from "@/lib/skeletonPose";

/** Sample racket tip positions across the stroke using the same FK as the skeleton */
export function RacketPathTrail({
  stroke,
  anthropometrics,
  visible,
  accent,
  currentT,
}: {
  stroke: StrokeProfile;
  anthropometrics: Anthropometrics;
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
      const skeleton = computeSkeletonPose(
        pose.joints,
        anthropometrics,
        stroke.handedness,
        stroke.oneHanded,
      );
      pts.push(skeleton.racketTip.clone());
    }
    return pts;
  }, [stroke, anthropometrics]);

  if (!visible) return null;

  const fadeCount = Math.max(2, Math.floor(currentT * points.length));
  const active = points.slice(0, fadeCount);

  return (
    <group>
      <Line
        points={points}
        color={accent}
        lineWidth={1}
        transparent
        opacity={0.25}
        dashed
        dashSize={0.08}
        gapSize={0.05}
      />
      {active.length > 1 && (
        <Line points={active} color={accent} lineWidth={3} transparent opacity={0.9} />
      )}
    </group>
  );
}
