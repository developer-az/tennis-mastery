"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { useCoachStore } from "@/store/coachStore";
import { getPlayer } from "@/data/players";
import { sampleStroke } from "@/lib/kinematics";
import { BiomechanicalSkeleton } from "./BiomechanicalSkeleton";
import { AngleOverlays } from "./AngleOverlays";
import { RacketPathTrail } from "./RacketPathTrail";
import { TennisCourt } from "./TennisCourt";

function PlaybackDriver() {
  const playing = useCoachStore((s) => s.playing);
  const speed = useCoachStore((s) => s.speed);
  const setT = useCoachStore((s) => s.setT);
  const t = useCoachStore((s) => s.t);

  useFrame((_, delta) => {
    if (!playing) return;
    const next = (t + delta * speed) % 1;
    setT(next);
  });

  return null;
}

const PLAYER_Z = 11.5;
const LOOK_AT: [number, number, number] = [0, 1.1, PLAYER_Z];

function CameraRig() {
  const mode = useCoachStore((s) => s.cameraMode);
  const { camera } = useThree();
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null);

  useEffect(() => {
    const positions: Record<typeof mode, [number, number, number]> = {
      orbit: [3.2, 2.1, PLAYER_Z + 4.2],
      side: [5.5, 1.6, PLAYER_Z + 0.2],
      behind: [0.3, 1.8, PLAYER_Z + 5.5],
      front: [0.2, 1.7, PLAYER_Z - 4.8],
    };
    const p = positions[mode];
    camera.position.set(...p);
    controls.current?.target.set(...LOOK_AT);
    controls.current?.update();
  }, [mode, camera]);

  return (
    <OrbitControls
      ref={controls}
      target={LOOK_AT}
      maxPolarAngle={Math.PI * 0.49}
      minDistance={1.5}
      maxDistance={14}
      enablePan
    />
  );
}

function GroundForce({ visible, peakN, kneeFlex }: { visible: boolean; peakN: number; kneeFlex: number }) {
  if (!visible) return null;
  const intensity = Math.min(1, (peakN / 2200) * (kneeFlex / 80));
  const r = 0.35 + intensity * 0.55;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0.15]}>
      <ringGeometry args={[r * 0.4, r, 48]} />
      <meshBasicMaterial color="#f4a261" transparent opacity={0.25 + intensity * 0.45} side={THREE.DoubleSide} />
    </mesh>
  );
}

function SceneContent() {
  const playerId = useCoachStore((s) => s.playerId);
  const strokeType = useCoachStore((s) => s.stroke);
  const t = useCoachStore((s) => s.t);
  const showAngles = useCoachStore((s) => s.showAngles);
  const showRacketPath = useCoachStore((s) => s.showRacketPath);
  const showGroundForce = useCoachStore((s) => s.showGroundForce);

  const player = getPlayer(playerId)!;
  const stroke = player.strokes[strokeType];
  const pose = useMemo(() => sampleStroke(stroke, t), [stroke, t]);

  return (
    <>
      <PlaybackDriver />
      <CameraRig />
      <color attach="background" args={["#0b1a14"]} />
      <fog attach="fog" args={["#0b1a14", 12, 38]} />

      <ambientLight intensity={0.35} />
      <directionalLight
        castShadow
        position={[6, 10, 4]}
        intensity={1.35}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={30}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      <hemisphereLight args={["#b8d4c8", "#1a3328", 0.45]} />

      <TennisCourt />
      <group position={[0, 0, PLAYER_Z]}>
        <BiomechanicalSkeleton
          joints={pose.joints}
          handedness={stroke.handedness}
          oneHanded={stroke.oneHanded}
          anthropometrics={player.anthropometrics}
          color={player.color}
          accent={player.accent}
          racketSpeedMs={pose.racketSpeedMs}
        />
        <AngleOverlays
          joints={pose.joints}
          visible={showAngles}
          accent={player.accent}
          handedness={stroke.handedness}
        />
        <RacketPathTrail
          stroke={stroke}
          visible={showRacketPath}
          accent={player.accent}
          currentT={t}
        />
        <GroundForce
          visible={showGroundForce}
          peakN={stroke.metrics.kineticChain.peakGrfN}
          kneeFlex={pose.joints.leadKneeFlexion}
        />
      </group>

      <ContactShadows position={[0, 0.01, PLAYER_Z]} opacity={0.45} scale={8} blur={2.5} far={4} />
      <Environment preset="park" environmentIntensity={0.35} />
    </>
  );
}

export function FormCanvas() {
  return (
    <div className="relative h-full w-full min-h-[420px]">
      <Canvas shadows dpr={[1, 2]} gl={{ antialias: true, alpha: false }}>
        <PerspectiveCamera makeDefault position={[3.2, 2.1, PLAYER_Z + 4.2]} fov={42} />
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0b1a14]/90 to-transparent" />
    </div>
  );
}
