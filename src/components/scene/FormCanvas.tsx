"use client";

import { Suspense, useEffect, useReducer, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { useCoachStore } from "@/store/coachStore";
import { getPlayer } from "@/data/players";
import { sampleStroke } from "@/lib/kinematics";
import { BiomechanicalSkeleton } from "./BiomechanicalSkeleton";
import { AngleOverlays } from "./AngleOverlays";
import { RacketPathTrail } from "./RacketPathTrail";
import { TennisCourt } from "./TennisCourt";

const PLAYER_Z = -11.5; // −Z baseline; local +Z (face-forward) points at the net
const LOOK_AT: [number, number, number] = [0, 1.1, PLAYER_Z];

/** High-resolution playback clock shared with the 3D scene (avoids 60fps React). */
export let playbackT = 0;

function PlaybackDriver() {
  const uiAccum = useRef(0);

  useFrame((_, delta) => {
    const state = useCoachStore.getState();
    if (state.playing) {
      playbackT = (playbackT + delta * state.speed) % 1;
    } else {
      playbackT = state.t;
    }

    uiAccum.current += delta;
    if (uiAccum.current >= 1 / 20) {
      uiAccum.current = 0;
      if (Math.abs(state.t - playbackT) > 0.0005) {
        state.setT(playbackT);
      }
    }
  });

  return null;
}

function CameraRig() {
  const mode = useCoachStore((s) => s.cameraMode);
  const { camera, gl } = useThree();
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null);

  useEffect(() => {
    const positions: Record<typeof mode, [number, number, number]> = {
      // Player faces +Z (toward net). Behind = further from net; front = toward net.
      orbit: [3.2, 2.1, PLAYER_Z - 4.2],
      side: [5.5, 1.6, PLAYER_Z + 0.2],
      behind: [0.3, 1.8, PLAYER_Z - 5.5],
      front: [0.2, 1.7, PLAYER_Z + 4.8],
    };
    camera.position.set(...positions[mode]);
    controls.current?.target.set(...LOOK_AT);
    controls.current?.update();
  }, [mode, camera]);

  useEffect(() => {
    const resize = () => {
      const parent = gl.domElement.parentElement;
      if (parent) gl.setSize(parent.clientWidth, parent.clientHeight, false);
    };
    const id = requestAnimationFrame(resize);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", resize);
    };
  }, [gl]);

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

function AnimatedAthlete() {
  const playerId = useCoachStore((s) => s.playerId);
  const strokeType = useCoachStore((s) => s.stroke);
  const showAngles = useCoachStore((s) => s.showAngles);
  const showRacketPath = useCoachStore((s) => s.showRacketPath);
  const showGroundForce = useCoachStore((s) => s.showGroundForce);
  // Subscribe so scrubbing while paused re-renders the skeleton immediately.
  const scrubT = useCoachStore((s) => s.t);
  const playing = useCoachStore((s) => s.playing);

  const player = getPlayer(playerId)!;
  const stroke = player.strokes[strokeType];

  const [, bump] = useReducer((n: number) => n + 1, 0);
  const frame = useRef(0);

  useFrame(() => {
    frame.current += 1;
    // Throttle React commits while playing; pose is sampled from the shared clock.
    if (playing && frame.current % 2 === 0) bump();
  });

  const p = sampleStroke(stroke, playing ? playbackT : scrubT);

  return (
    // Local +Z is face-forward. Standing on the −Z baseline aims the athlete at the net.
    <group position={[0, 0, PLAYER_Z]}>
      <BiomechanicalSkeleton
        key={playerId}
        joints={p.joints}
        handedness={stroke.handedness}
        oneHanded={stroke.oneHanded}
        anthropometrics={player.anthropometrics}
        color={player.color}
        accent={player.accent}
        racketSpeedMs={p.racketSpeedMs}
      />
      <AngleOverlays
        joints={p.joints}
        anthropometrics={player.anthropometrics}
        visible={showAngles}
        accent={player.accent}
        handedness={stroke.handedness}
        oneHanded={stroke.oneHanded}
      />
      <RacketPathTrail
        stroke={stroke}
        anthropometrics={player.anthropometrics}
        visible={showRacketPath}
        accent={player.accent}
        currentT={playbackT}
      />
      <GroundForce
        visible={showGroundForce}
        peakN={stroke.metrics.kineticChain.peakGrfN}
        kneeFlex={p.joints.leadKneeFlexion}
      />
    </group>
  );
}

function SceneContent() {
  return (
    <>
      <PlaybackDriver />
      <CameraRig />
      <color attach="background" args={["#0b1a14"]} />
      <fog attach="fog" args={["#0b1a14", 12, 38]} />

      <ambientLight intensity={0.45} />
      <directionalLight
        castShadow
        position={[6, 10, 4]}
        intensity={1.5}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={30}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      <directionalLight position={[-4, 6, -2]} intensity={0.35} color="#a8dadc" />
      <hemisphereLight args={["#c8e6d0", "#1a3328", 0.55]} />

      <TennisCourt />
      <AnimatedAthlete />

      <ContactShadows position={[0, 0.01, PLAYER_Z]} opacity={0.45} scale={8} blur={2.5} far={4} />
    </>
  );
}

export function FormCanvas() {
  // Keep module clock in sync when user scrubs the store
  useEffect(() => {
    return useCoachStore.subscribe((state, prev) => {
      if (!state.playing && state.t !== prev.t) {
        playbackT = state.t;
      }
      if (state.playerId !== prev.playerId || state.stroke !== prev.stroke) {
        playbackT = 0;
      }
    });
  }, []);

  return (
    <div className="relative h-full min-h-[420px] w-full">
      <Canvas
        className="!absolute inset-0"
        shadows
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color("#0b1a14"));
        }}
      >
        <PerspectiveCamera makeDefault position={[3.2, 2.1, PLAYER_Z - 4.2]} fov={42} />
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0b1a14]/90 to-transparent" />
    </div>
  );
}
