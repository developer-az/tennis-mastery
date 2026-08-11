"use client";

import { Suspense, useEffect, useRef, type ComponentRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { useCoachStore } from "@/store/coachStore";
import { getPlayer } from "@/data/players";
import { sampleStroke } from "@/lib/kinematics";
import { BiomechanicalSkeleton, type SkeletonDriver } from "./BiomechanicalSkeleton";
import { AngleOverlays } from "./AngleOverlays";
import { RacketPathTrail } from "./RacketPathTrail";
import { TennisCourt } from "./TennisCourt";
import type { JointAngles } from "@/types/biomechanics";

const PLAYER_Z = 11.5;
const LOOK_AT: [number, number, number] = [0, 1.1, PLAYER_Z];

/** High-resolution playback clock shared with the 3D scene (avoids 60fps React). */
export let playbackT = 0;

function PlaybackDriver() {
  const uiAccum = useRef(0);

  useFrame((_, delta) => {
    // Pause simulation work when the tab is hidden
    if (typeof document !== "undefined" && document.hidden) return;

    const state = useCoachStore.getState();
    if (state.playing) {
      playbackT = (playbackT + delta * state.speed) % 1;
    } else {
      playbackT = state.t;
    }

    // Throttle Zustand UI sync to ~12fps — metrics/scrubber only
    uiAccum.current += delta;
    if (uiAccum.current >= 1 / 12) {
      uiAccum.current = 0;
      if (Math.abs(state.t - playbackT) > 0.001) {
        state.setT(playbackT);
      }
    }
  });

  return null;
}

function CameraRig() {
  const mode = useCoachStore((s) => s.cameraMode);
  const { camera } = useThree();
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);

  useEffect(() => {
    const positions: Record<typeof mode, [number, number, number]> = {
      orbit: [3.2, 2.1, PLAYER_Z + 4.2],
      side: [5.5, 1.6, PLAYER_Z + 0.2],
      behind: [0.3, 1.8, PLAYER_Z + 5.5],
      front: [0.2, 1.7, PLAYER_Z - 4.8],
    };
    camera.position.set(...positions[mode]);
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
      // Cheaper orbit interaction
      enableDamping
      dampingFactor={0.12}
      rotateSpeed={0.7}
    />
  );
}

function GroundForce({
  visibleRef,
  peakN,
  kneeRef,
}: {
  visibleRef: RefObject<boolean>;
  peakN: number;
  kneeRef: RefObject<number>;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(() => {
    if (!mesh.current || !mat.current) return;
    const on = visibleRef.current;
    mesh.current.visible = !!on;
    if (!on) return;
    const kneeFlex = kneeRef.current;
    const intensity = Math.min(1, (peakN / 2200) * (kneeFlex / 80));
    const r = 0.35 + intensity * 0.55;
    mesh.current.scale.setScalar(r);
    mat.current.opacity = 0.25 + intensity * 0.45;
  });

  return (
    <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0.15]} visible={false}>
      <ringGeometry args={[0.4, 1, 24]} />
      <meshBasicMaterial ref={mat} color="#f4a261" transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

function AnimatedAthlete() {
  const playerId = useCoachStore((s) => s.playerId);
  const strokeType = useCoachStore((s) => s.stroke);
  const showAngles = useCoachStore((s) => s.showAngles);
  const showRacketPath = useCoachStore((s) => s.showRacketPath);
  const showGroundForce = useCoachStore((s) => s.showGroundForce);

  const player = getPlayer(playerId)!;
  const stroke = player.strokes[strokeType];

  const driverRef = useRef<SkeletonDriver>({
    joints: sampleStroke(stroke, 0).joints,
    racketSpeedMs: 0,
    handedness: stroke.handedness,
    oneHanded: stroke.oneHanded,
  });
  const jointsRef = useRef<JointAngles>(driverRef.current.joints);
  const kneeRef = useRef(25);
  const tRef = useRef(0);
  const gfVisible = useRef(showGroundForce);
  gfVisible.current = showGroundForce;

  // Keep stroke identity on the driver without re-rendering the mesh tree
  driverRef.current.handedness = stroke.handedness;
  driverRef.current.oneHanded = stroke.oneHanded;

  useFrame(() => {
    if (typeof document !== "undefined" && document.hidden) return;
    const pose = sampleStroke(stroke, playbackT);
    driverRef.current.joints = pose.joints;
    driverRef.current.racketSpeedMs = pose.racketSpeedMs;
    jointsRef.current = pose.joints;
    kneeRef.current = pose.joints.leadKneeFlexion;
    tRef.current = playbackT;
  });

  return (
    <group position={[0, 0, PLAYER_Z]}>
      <BiomechanicalSkeleton
        key={playerId}
        driverRef={driverRef}
        anthropometrics={player.anthropometrics}
        color={player.color}
        accent={player.accent}
      />
      <AngleOverlays
        jointsRef={jointsRef}
        visible={showAngles}
        accent={player.accent}
        handedness={stroke.handedness}
      />
      <RacketPathTrail
        stroke={stroke}
        visible={showRacketPath}
        accent={player.accent}
        tRef={tRef}
      />
      <GroundForce
        visibleRef={gfVisible}
        peakN={stroke.metrics.kineticChain.peakGrfN}
        kneeRef={kneeRef}
      />
    </group>
  );
}

function AdaptiveDpr() {
  const { gl } = useThree();
  const frames = useRef({ n: 0, sum: 0, cool: 0 });

  useFrame((_, delta) => {
    const f = frames.current;
    f.n += 1;
    f.sum += delta;
    if (f.n < 45) return;
    const avg = f.sum / f.n;
    f.n = 0;
    f.sum = 0;
    if (f.cool > 0) {
      f.cool -= 1;
      return;
    }
    const fps = 1 / Math.max(1e-4, avg);
    const current = gl.getPixelRatio();
    if (fps < 40 && current > 1) {
      gl.setPixelRatio(Math.max(1, current - 0.25));
      f.cool = 3;
    } else if (fps > 55 && current < 1.5) {
      gl.setPixelRatio(Math.min(1.5, current + 0.15));
      f.cool = 3;
    }
  });

  return null;
}

function SceneContent() {
  return (
    <>
      <PlaybackDriver />
      <AdaptiveDpr />
      <CameraRig />
      <color attach="background" args={["#0b1a14"]} />
      <fog attach="fog" args={["#0b1a14", 14, 36]} />

      {/* Lean lighting: no shadow maps */}
      <ambientLight intensity={0.55} />
      <directionalLight position={[6, 10, 4]} intensity={1.15} />
      <hemisphereLight args={["#c8e6d0", "#1a3328", 0.45]} />

      <TennisCourt />
      <AnimatedAthlete />

      {/* Soft blob shadow — far cheaper than ContactShadows / shadow maps */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, PLAYER_Z + 0.1]}>
        <circleGeometry args={[0.55, 20]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.28} depthWrite={false} />
      </mesh>
    </>
  );
}

export function FormCanvas() {
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
        dpr={[1, 1.5]}
        frameloop="always"
        gl={{
          antialias: false,
          alpha: false,
          powerPreference: "high-performance",
          stencil: false,
          depth: true,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color("#0b1a14"));
          gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        }}
      >
        <PerspectiveCamera makeDefault position={[3.2, 2.1, PLAYER_Z + 4.2]} fov={42} />
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0b1a14]/90 to-transparent" />
    </div>
  );
}
