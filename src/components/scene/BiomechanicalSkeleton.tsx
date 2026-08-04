"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Anthropometrics, JointAngles } from "@/types/biomechanics";
import { deg } from "@/lib/kinematics";

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

function Joint({ position, color, radius = 0.055 }: { position: THREE.Vector3; color: string; radius?: number }) {
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

/** Build a side-aware biomechanical skeleton from joint angles + anthropometrics */
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
  const H = anthropometrics.heightM;
  const mirror = handedness === "left" ? -1 : 1;

  const torso = H * anthropometrics.torsoRatio;
  const upperArm = H * anthropometrics.upperArmRatio;
  const forearm = H * anthropometrics.forearmRatio;
  const thigh = H * anthropometrics.thighRatio;
  const shank = H * anthropometrics.shankRatio;
  const hipWidth = 0.28;
  const shoulderWidth = 0.38;

  const points = useMemo(() => {
    const j = joints;
    // Root at pelvis
    const pelvis = new THREE.Vector3(0, shank + thigh * 0.15, 0);

    const hipRot = new THREE.Euler(deg(j.hipPitch), deg(j.hipYaw * mirror), 0, "YXZ");
    const spineRot = new THREE.Euler(deg(j.spineLean), deg(j.spineTwist * mirror), 0, "YXZ");

    const chest = pelvis
      .clone()
      .add(new THREE.Vector3(0, torso, 0).applyEuler(hipRot).applyEuler(spineRot));

    const head = chest.clone().add(new THREE.Vector3(0, 0.28, 0).applyEuler(spineRot));

    // Legs — lead = front (toward +Z after rotation), trail = back
    const leadHip = pelvis.clone().add(new THREE.Vector3(-hipWidth * 0.5 * mirror, 0, 0.02));
    const trailHip = pelvis.clone().add(new THREE.Vector3(hipWidth * 0.5 * mirror, 0, -0.02));

    const leadKnee = leadHip
      .clone()
      .add(
        new THREE.Vector3(0, -thigh, 0.08).applyEuler(
          new THREE.Euler(deg(j.leadHipFlexion), deg(j.hipYaw * mirror * 0.3), deg(-j.leadKneeFlexion * 0.15), "YXZ"),
        ),
      );
    const leadAnkle = leadKnee
      .clone()
      .add(
        new THREE.Vector3(0, -shank, 0).applyEuler(
          new THREE.Euler(deg(j.leadKneeFlexion * 0.35 + j.ankleDorsiflexion * 0.2), 0, 0),
        ),
      );

    const trailKnee = trailHip
      .clone()
      .add(
        new THREE.Vector3(0, -thigh, -0.05).applyEuler(
          new THREE.Euler(deg(j.trailHipFlexion), deg(j.hipYaw * mirror * 0.2), deg(j.trailKneeFlexion * 0.1), "YXZ"),
        ),
      );
    const trailAnkle = trailKnee
      .clone()
      .add(
        new THREE.Vector3(0, -shank, 0).applyEuler(
          new THREE.Euler(deg(j.trailKneeFlexion * 0.35), 0, 0),
        ),
      );

    // Hitting shoulder
    const hitShoulder = chest
      .clone()
      .add(new THREE.Vector3(shoulderWidth * 0.5 * mirror, 0.05, 0).applyEuler(spineRot));
    const nonHitShoulder = chest
      .clone()
      .add(new THREE.Vector3(-shoulderWidth * 0.5 * mirror, 0.05, 0).applyEuler(spineRot));

    const hitArmEuler = new THREE.Euler(
      deg(-j.shoulderFlexion),
      deg(j.shoulderAbduction * mirror * 0.35 + j.spineTwist * mirror * 0.15),
      deg(j.shoulderInternalRotation * mirror * 0.5 + j.shoulderAbduction * mirror * 0.4),
      "YXZ",
    );

    const hitElbow = hitShoulder
      .clone()
      .add(new THREE.Vector3(0, -upperArm * 0.15, upperArm * 0.85).applyEuler(hitArmEuler).applyEuler(spineRot));

    const forearmEuler = new THREE.Euler(
      deg(-j.elbowFlexion * 0.6),
      deg(mirror * 10),
      deg(j.wristExtension * 0.3 * mirror),
      "YXZ",
    );

    const hitWrist = hitElbow
      .clone()
      .add(new THREE.Vector3(0, -forearm * 0.2, forearm * 0.8).applyEuler(forearmEuler).applyEuler(hitArmEuler).applyEuler(spineRot));

    const racketTip = hitWrist
      .clone()
      .add(
        new THREE.Vector3(
          j.racketFaceAngle * 0.004 * mirror,
          j.racketPathElevation * 0.006,
          0.55,
        )
          .applyEuler(forearmEuler)
          .applyEuler(hitArmEuler)
          .applyEuler(spineRot),
      );

    const nonHitEuler = new THREE.Euler(
      deg(-j.nonHittingShoulderFlexion),
      deg(-20 * mirror),
      deg(-15 * mirror),
      "YXZ",
    );
    const nonHitElbow = nonHitShoulder
      .clone()
      .add(new THREE.Vector3(0, -upperArm * 0.2, upperArm * 0.7).applyEuler(nonHitEuler).applyEuler(spineRot));
    const nonHitWrist = nonHitElbow
      .clone()
      .add(
        new THREE.Vector3(0, -forearm * 0.25, forearm * 0.7)
          .applyEuler(new THREE.Euler(deg(-j.nonHittingElbowFlexion * 0.5), 0, 0))
          .applyEuler(nonHitEuler)
          .applyEuler(spineRot),
      );

    // Two-handed: pull non-hitting wrist toward racket
    if (!oneHanded) {
      nonHitWrist.lerp(hitWrist, 0.55);
      nonHitElbow.lerp(hitElbow, 0.35);
    }

    return {
      pelvis,
      chest,
      head,
      leadHip,
      leadKnee,
      leadAnkle,
      trailHip,
      trailKnee,
      trailAnkle,
      hitShoulder,
      hitElbow,
      hitWrist,
      racketTip,
      nonHitShoulder,
      nonHitElbow,
      nonHitWrist,
    };
  }, [joints, mirror, torso, upperArm, forearm, thigh, shank, oneHanded, hipWidth, shoulderWidth]);

  useFrame((_, dt) => {
    if (!group.current) return;
    // Subtle breathing idle when nearly still
    if (racketSpeedMs < 3) {
      group.current.position.y = Math.sin(performance.now() * 0.002) * 0.008;
    } else {
      group.current.position.y = THREE.MathUtils.damp(group.current.position.y, 0, 8, dt);
    }
  });

  const skin = color;
  const jointColor = accent;

  return (
    <group ref={group} position={[0, 0.02, 0]}>
      {/* Torso */}
      <Limb start={points.pelvis} end={points.chest} radius={0.08} color={skin} />
      <Limb start={points.chest} end={points.head} radius={0.04} color={skin} />
      <Joint position={points.head} color={skin} radius={0.11} />
      <Joint position={points.pelvis} color={jointColor} radius={0.06} />
      <Joint position={points.chest} color={jointColor} radius={0.055} />

      {/* Legs */}
      <Limb start={points.leadHip} end={points.leadKnee} radius={0.055} color={skin} />
      <Limb start={points.leadKnee} end={points.leadAnkle} radius={0.045} color={skin} />
      <Limb start={points.trailHip} end={points.trailKnee} radius={0.055} color={skin} />
      <Limb start={points.trailKnee} end={points.trailAnkle} radius={0.045} color={skin} />
      <Joint position={points.leadKnee} color={jointColor} radius={0.05} />
      <Joint position={points.trailKnee} color={jointColor} radius={0.05} />
      <Joint position={points.leadAnkle} color={skin} radius={0.04} />
      <Joint position={points.trailAnkle} color={skin} radius={0.04} />

      {/* Feet */}
      <mesh position={[points.leadAnkle.x, 0.03, points.leadAnkle.z + 0.06]} castShadow>
        <boxGeometry args={[0.1, 0.05, 0.22]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[points.trailAnkle.x, 0.03, points.trailAnkle.z + 0.06]} castShadow>
        <boxGeometry args={[0.1, 0.05, 0.22]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* Arms */}
      <Limb start={points.hitShoulder} end={points.hitElbow} radius={0.042} color={skin} />
      <Limb start={points.hitElbow} end={points.hitWrist} radius={0.038} color={skin} />
      <Limb start={points.nonHitShoulder} end={points.nonHitElbow} radius={0.042} color={skin} />
      <Limb start={points.nonHitElbow} end={points.nonHitWrist} radius={0.038} color={skin} />
      <Joint position={points.hitShoulder} color={jointColor} radius={0.05} />
      <Joint position={points.hitElbow} color={jointColor} radius={0.045} />
      <Joint position={points.hitWrist} color={jointColor} radius={0.04} />
      <Joint position={points.nonHitShoulder} color={jointColor} radius={0.05} />

      {/* Racket */}
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
      {/* Handle */}
      <mesh position={[0, -len * 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.018, 0.022, len * 0.35, 10]} />
        <meshStandardMaterial color="#2c1810" roughness={0.7} />
      </mesh>
      {/* Throat */}
      <mesh position={[0, -len * 0.05, 0]}>
        <cylinderGeometry args={[0.012, 0.016, len * 0.2, 8]} />
        <meshStandardMaterial color="#222" metalness={0.5} roughness={0.3} />
      </mesh>
      {/* Head hoop */}
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
      {/* Strings plane */}
      <mesh position={[0, len * 0.22, 0]}>
        <circleGeometry args={[0.12, 24]} />
        <meshStandardMaterial color="#f5f5f0" transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
