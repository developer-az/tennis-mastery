"use client";

import { useMemo, useRef, useState, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import type { Anthropometrics, StrokeProfile } from "@/types/biomechanics";
import { sampleStroke } from "@/lib/kinematics";
import { createSkeletonPose, solveSkeletonFk } from "@/lib/skeletonFk";

/** Sample racket tip positions across the stroke for path visualization */
export function RacketPathTrail({
  stroke,
  anthropometrics,
  visible,
  accent,
  tRef,
}: {
  stroke: StrokeProfile;
  anthropometrics: Anthropometrics;
  visible: boolean;
  accent: string;
  tRef: RefObject<number>;
}) {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const scratch = createSkeletonPose();
    const steps = 36;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const pose = sampleStroke(stroke, t);
      solveSkeletonFk(
        scratch,
        pose.joints,
        anthropometrics,
        stroke.handedness,
        stroke.oneHanded,
      );
      pts.push(scratch.racketTip.clone());
    }
    return pts;
  }, [stroke, anthropometrics]);

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
