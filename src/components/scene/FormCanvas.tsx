"use client";

import { Suspense, useEffect, useRef, useState, type ComponentRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { useCoachStore } from "@/store/coachStore";
import { getPlayer } from "@/data/players";
import { sampleMotion } from "@/lib/motion/sample";
import { createMotionContinuity } from "@/lib/motion/types";
import { createSkeletonPose } from "@/lib/motion/pose";
import { getMotionClip } from "@/data/motion";
import { BiomechanicalSkeleton, type SkeletonDriver } from "./BiomechanicalSkeleton";
import { AngleOverlays } from "./AngleOverlays";
import { RacketPathTrail } from "./RacketPathTrail";
import { TennisCourt } from "./TennisCourt";
import { getThemeColors } from "@/lib/theme/colors";
import { useTheme } from "@/components/theme/ThemeProvider";

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

function CameraRig({
  allowZoom,
  allowRotate,
}: {
  allowZoom: boolean;
  allowRotate: boolean;
}) {
  const mode = useCoachStore((s) => s.cameraMode);
  const { camera, size } = useThree();
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const narrow = size.width < 1024;

  useEffect(() => {
    const zPull = narrow ? 1.4 : 0;
    const positions: Record<typeof mode, [number, number, number]> = {
      orbit: [3.2, 2.1, PLAYER_Z + 4.2 + zPull],
      side: [5.5 + (narrow ? 1.2 : 0), 1.6, PLAYER_Z + 0.2],
      behind: [0.3, 1.8, PLAYER_Z + 5.5 + zPull],
      front: [0.2, 1.7, PLAYER_Z - 4.8 - zPull],
      firstPerson: [0.55, 1.55, PLAYER_Z + 0.35],
    };
    const targets: Record<typeof mode, [number, number, number]> = {
      orbit: LOOK_AT,
      side: LOOK_AT,
      behind: LOOK_AT,
      front: LOOK_AT,
      firstPerson: [0.15, 1.35, PLAYER_Z - 1.2],
    };
    camera.position.set(...positions[mode]);
    controls.current?.target.set(...targets[mode]);
    controls.current?.update();
  }, [mode, camera, narrow]);

  return (
    <>
      <PerspectiveCamera makeDefault fov={narrow ? 50 : 42} position={[3.2, 2.1, PLAYER_Z + 4.2]} />
      <OrbitControls
        ref={controls}
        target={LOOK_AT}
        maxPolarAngle={Math.PI * 0.49}
        minDistance={mode === "firstPerson" ? 0.4 : 1.5}
        maxDistance={mode === "firstPerson" ? 4 : 16}
        enablePan={allowRotate && !narrow}
        enableZoom={allowZoom}
        enableRotate={allowRotate}
        enableDamping={allowRotate}
        dampingFactor={0.12}
        rotateSpeed={narrow ? 0.9 : 0.7}
        // Never let wheel/pinch steal page scroll on embedded heroes
        zoomSpeed={allowZoom ? 1 : 0}
        touches={{
          ONE: THREE.TOUCH.ROTATE,
          TWO: allowZoom ? THREE.TOUCH.DOLLY_PAN : THREE.TOUCH.ROTATE,
        }}
      />
    </>
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
      <meshBasicMaterial ref={mat} color="#c4843a" transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} />
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

  const clip =
    getMotionClip(stroke.clipId ?? `${playerId}/${strokeType}`) ??
    getMotionClip("federer/forehand")!;
  const [solvedPose] = useState(() => createSkeletonPose());
  const continuity = useRef(createMotionContinuity());
  const driverRef = useRef<SkeletonDriver>({
    pose: solvedPose,
    racketSpeedMs: 0,
    handedness: stroke.handedness,
    oneHanded: stroke.oneHanded,
  });
  const poseRef = useRef(solvedPose);
  const kneeRef = useRef(25);
  const tRef = useRef(0);
  const gfVisible = useRef(showGroundForce);

  useEffect(() => {
    continuity.current = createMotionContinuity();
  }, [clip.id]);

  useFrame(() => {
    if (typeof document !== "undefined" && document.hidden) return;
    gfVisible.current = showGroundForce;
    driverRef.current.handedness = stroke.handedness;
    driverRef.current.oneHanded = stroke.oneHanded;
    const play = sampleMotion(clip, stroke, player.anthropometrics, playbackT, continuity.current, solvedPose);
    driverRef.current.pose = play.pose;
    driverRef.current.racketSpeedMs = play.racketSpeedMs;
    poseRef.current = play.pose;
    kneeRef.current = play.angles.leadKneeFlexion;
    tRef.current = playbackT;
  });

  return (
    <group position={[0, 0, PLAYER_Z]}>
      <BiomechanicalSkeleton
        key={`${playerId}-${strokeType}`}
        driverRef={driverRef}
        anthropometrics={player.anthropometrics}
        color={player.color}
        accent={player.accent}
      />
      <AngleOverlays poseRef={poseRef} visible={showAngles} />
      <RacketPathTrail
        clip={clip}
        stroke={stroke}
        anthropometrics={player.anthropometrics}
        visible={showRacketPath}
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

function SceneContent({
  bg,
  allowZoom,
  allowRotate,
}: {
  bg: string;
  allowZoom: boolean;
  allowRotate: boolean;
}) {
  return (
    <>
      <PlaybackDriver />
      <AdaptiveDpr />
      <CameraRig allowZoom={allowZoom} allowRotate={allowRotate} />
      <color attach="background" args={[bg]} />
      <fog attach="fog" args={[bg, 14, 36]} />

      {/* Lean lighting: no shadow maps */}
      <ambientLight intensity={0.55} />
      <directionalLight position={[6, 10, 4]} intensity={1.15} />
      <hemisphereLight args={["#e8e6e1", "#2a2c2b", 0.4]} />

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

export type FormCanvasProps = {
  /**
   * `lab` — full orbit/zoom (Form Lab).
   * `hero` — no wheel/pinch zoom so page scroll wins; rotate only on pointer drag (desktop).
   */
  variant?: "lab" | "hero";
};

export function FormCanvas({ variant = "lab" }: FormCanvasProps) {
  const { colors } = useTheme();
  const bg = colors.bgScene;
  const isHero = variant === "hero";
  const rootRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(!isHero);
  const [isNarrow, setIsNarrow] = useState(false);

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

  useEffect(() => {
    if (!isHero) return;
    const mq = window.matchMedia("(max-width: 1023px)");
    const sync = () => setIsNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [isHero]);

  // Pause the WebGL loop when the hero leaves the viewport so scroll stays smooth
  useEffect(() => {
    if (!isHero) return;
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => {
        const on = entry.isIntersecting && entry.intersectionRatio > 0.12;
        setActive(on);
        const store = useCoachStore.getState();
        if (!on) {
          store.setPlaying(false);
        } else if (!store.playing) {
          store.setPlaying(true);
        }
      },
      { threshold: [0, 0.12, 0.35], rootMargin: "0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [isHero]);

  const allowZoom = !isHero;
  // On hero mobile, leave touch free for page scroll — orbit stays a desktop affordance
  const allowRotate = !isHero || !isNarrow;

  return (
    <div
      ref={rootRef}
      className={`relative h-full min-h-[240px] w-full lg:min-h-[420px] ${
        isHero ? "touch-pan-y" : "touch-none"
      }`}
      style={{ background: bg }}
    >
      <Canvas
        className={`!absolute inset-0 ${isHero ? "touch-pan-y" : "touch-none"}`}
        dpr={[1, isHero ? 1.25 : 1.5]}
        frameloop={isHero && !active ? "never" : "always"}
        gl={{
          antialias: false,
          alpha: false,
          powerPreference: "high-performance",
          stencil: false,
          depth: true,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color(getThemeColors().bgScene));
          gl.setPixelRatio(Math.min(window.devicePixelRatio, isHero ? 1.25 : 1.5));
        }}
      >
        <Suspense fallback={null}>
          <SceneContent bg={bg} allowZoom={allowZoom} allowRotate={allowRotate} />
        </Suspense>
      </Canvas>
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
        style={{
          background: `linear-gradient(to top, color-mix(in srgb, ${bg} 90%, transparent), transparent)`,
        }}
      />
    </div>
  );
}
