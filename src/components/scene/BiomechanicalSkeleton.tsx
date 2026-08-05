"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Anthropometrics, JointAngles } from "@/types/biomechanics";
import { computeSkeletonPose } from "@/lib/skeletonPose";

interface LimbProps {
  start: THREE.Vector3;
  end: THREE.Vector3;
  radius?: number;
  color: string;
}

function Limb({ start, end, radius = 0.045, color }: LimbProps) {
  const { position, quaternion, length } = useMemo(() => {
    const dir = new THREE.Vector3().subVectors(end, start);
    const length = dir.length();
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    const quat = new THREE.Quaternion();
    if (length > 1e-6) {
      quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    }
    return { position: mid, quaternion: quat, length };
  }, [start, end]);

  return (
    <mesh position={position} quaternion={quaternion} castShadow>
      <capsuleGeometry args={[radius, Math.max(0.01, length - radius * 2), 6, 12]} />
      <meshStandardMaterial color={color} roughness={0.45} metalness={0.15} />
    </mesh>
  );
}

function Joint({
  position,
  color,
  radius = 0.055,
}: {
  position: THREE.Vector3;
  color: string;
  radius?: number;
}) {
  return (
    <mesh position={position} castShadow>
      <sphereGeometry args={[radius, 16, 16]} />
      <meshStandardMaterial color={color} roughness={0.35} metalness={0.2} />
    </mesh>
  );
}

export interface SkeletonPose {
  joints: JointAngles;
  handedness: "right" | "left";
  oneHanded: boolean;
  anthropometrics: Anthropometrics;
  color: string;
  accent: string;
  racketSpeedMs: number;
}

/** Side-aware biomechanical skeleton from joint angles + anthropometrics */
export function BiomechanicalSkeleton({
  joints,
  handedness,
  oneHanded,
  anthropometrics,
  color,
  accent,
  racketSpeedMs,
}: SkeletonPose) {
  const group = useRef<THREE.Group>(null);

  const points = useMemo(
    () => computeSkeletonPose(joints, anthropometrics, handedness, oneHanded),
    [joints, anthropometrics, handedness, oneHanded],
  );

  useFrame((_, dt) => {
    if (!group.current) return;
    if (racketSpeedMs < 3) {
      group.current.position.y = Math.sin(performance.now() * 0.002) * 0.008;
    } else {
      group.current.position.y = THREE.MathUtils.damp(group.current.position.y, 0, 8, dt);
    }
  });

  const skin = color;
  const jointColor = accent;
  const mirror = handedness === "left" ? -1 : 1;

  // Feet point face-forward (+Z local); slight yaw from hip so stance reads clearly.
  const footYaw = joints.hipYaw * mirror * 0.4;

  return (
    <group ref={group} position={[0, 0.02, 0]}>
      <Limb start={points.pelvis} end={points.chest} radius={0.08} color={skin} />
      <Limb start={points.chest} end={points.head} radius={0.04} color={skin} />
      <Joint position={points.head} color={skin} radius={0.11} />
      <Joint position={points.pelvis} color={jointColor} radius={0.06} />
      <Joint position={points.chest} color={jointColor} radius={0.055} />

      <Limb start={points.leadHip} end={points.leadKnee} radius={0.055} color={skin} />
      <Limb start={points.leadKnee} end={points.leadAnkle} radius={0.045} color={skin} />
      <Limb start={points.trailHip} end={points.trailKnee} radius={0.055} color={skin} />
      <Limb start={points.trailKnee} end={points.trailAnkle} radius={0.045} color={skin} />
      <Joint position={points.leadKnee} color={jointColor} radius={0.05} />
      <Joint position={points.trailKnee} color={jointColor} radius={0.05} />
      <Joint position={points.leadAnkle} color={skin} radius={0.04} />
      <Joint position={points.trailAnkle} color={skin} radius={0.04} />

      <mesh
        position={[points.leadAnkle.x, 0.03, points.leadAnkle.z]}
        rotation={[0, (footYaw * Math.PI) / 180, 0]}
        castShadow
      >
        <boxGeometry args={[0.1, 0.05, 0.22]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh
        position={[points.trailAnkle.x, 0.03, points.trailAnkle.z]}
        rotation={[0, (footYaw * Math.PI) / 180, 0]}
        castShadow
      >
        <boxGeometry args={[0.1, 0.05, 0.22]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      <Limb start={points.hitShoulder} end={points.hitElbow} radius={0.042} color={skin} />
      <Limb start={points.hitElbow} end={points.hitWrist} radius={0.038} color={skin} />
      <Limb start={points.nonHitShoulder} end={points.nonHitElbow} radius={0.042} color={skin} />
      <Limb start={points.nonHitElbow} end={points.nonHitWrist} radius={0.038} color={skin} />
      <Joint position={points.hitShoulder} color={jointColor} radius={0.05} />
      <Joint position={points.hitElbow} color={jointColor} radius={0.045} />
      <Joint position={points.hitWrist} color={jointColor} radius={0.04} />
      <Joint position={points.nonHitShoulder} color={jointColor} radius={0.05} />

      <Racket handle={points.hitWrist} tip={points.racketTip} accent={accent} speed={racketSpeedMs} />
    </group>
  );
}

function Racket({
  handle,
  tip,
  accent,
  speed,
}: {
  handle: THREE.Vector3;
  tip: THREE.Vector3;
  accent: string;
  speed: number;
}) {
  const { mid, quat, len } = useMemo(() => {
    const dir = new THREE.Vector3().subVectors(tip, handle);
    const len = Math.max(0.35, dir.length());
    const mid = new THREE.Vector3().addVectors(handle, tip).multiplyScalar(0.5);
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.clone().normalize(),
    );
    return { mid, quat, len };
  }, [handle, tip]);

  const glow = Math.min(1, speed / 40);

  return (
    <group position={mid} quaternion={quat}>
      <mesh position={[0, -len * 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.018, 0.022, len * 0.35, 10]} />
        <meshStandardMaterial color="#2c1810" roughness={0.7} />
      </mesh>
      <mesh position={[0, -len * 0.05, 0]}>
        <cylinderGeometry args={[0.012, 0.016, len * 0.2, 8]} />
        <meshStandardMaterial color="#222" metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh position={[0, len * 0.22, 0]} castShadow>
        <torusGeometry args={[0.14, 0.012, 8, 24]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={0.15 + glow * 0.55}
          metalness={0.4}
          roughness={0.25}
        />
      </mesh>
      <mesh position={[0, len * 0.22, 0]}>
        <circleGeometry args={[0.12, 24]} />
        <meshStandardMaterial color="#f5f5f0" transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
