"use client";

import { useMemo, useRef, useState, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import type { Anthropometrics, StrokeProfile } from "@/types/biomechanics";
import type { MotionClip } from "@/lib/motion/types";
import { sampleMotion } from "@/lib/motion/sample";
import { createSkeletonPose } from "@/lib/motion/pose";

/** Sample racket tip positions from the same clip sampler as the lab / hero. */
export function RacketPathTrail({
  clip,
  stroke,
  anthropometrics,
  visible,
  tRef,
}: {
  clip: MotionClip;
  stroke: StrokeProfile;
  anthropometrics: Anthropometrics;
  visible: boolean;
  tRef: RefObject<number>;
}) {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const scratch = createSkeletonPose();
    const steps = 48;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const play = sampleMotion(clip, stroke, anthropometrics, t, undefined, scratch);
      pts.push(play.pose.racketTip.clone());
    }
    return pts;
  }, [clip, stroke, anthropometrics]);

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
      <Line points={points} color="#c4843a" lineWidth={1} transparent opacity={0.22} dashed dashSize={0.08} gapSize={0.05} />
      {active.length > 1 && (
        <Line points={active} color="#c4843a" lineWidth={2.5} transparent opacity={0.9} />
      )}
    </group>
  );
}
