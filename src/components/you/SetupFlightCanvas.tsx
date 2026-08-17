"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import type { FlightMetrics } from "@/lib/equipment/setupSynthesis";
import {
  BALL_RADIUS_M,
  BASELINE_TO_NET_M,
  computeBallTrajectory,
  formatFt,
  NET_HEIGHT_M,
} from "@/lib/equipment/ballFlight";
import type { ThemeColors } from "@/lib/theme/colors";
import { useTheme } from "@/components/theme/ThemeProvider";

/** Compress court depth so the baseline-to-net slice fits the camera; heights stay in meters. */
const SCENE_BASELINE_Z = 2.55;
const XZ = SCENE_BASELINE_Z / BASELINE_TO_NET_M;

function courtZ(fromBaselineM: number) {
  return SCENE_BASELINE_Z - fromBaselineM * XZ;
}

function CourtDiorama({ colors }: { colors: ThemeColors }) {
  const netH = NET_HEIGHT_M;
  return (
    <group>
      {/* Outer apron */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[10, 16]} />
        <meshLambertMaterial color={colors.bgScene} />
      </mesh>
      {/* Playing surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0.35]}>
        <planeGeometry args={[8.23, 11]} />
        <meshLambertMaterial color={colors.court} />
      </mesh>
      {/* Texture-ish service boxes via subtle overlays */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, courtZ(6.4) / 2]}>
        <planeGeometry args={[8.23, 0.02]} />
        <meshBasicMaterial color="#f4f1ea" transparent opacity={0.55} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, SCENE_BASELINE_Z]}>
        <planeGeometry args={[8.23, 0.055]} />
        <meshBasicMaterial color="#f7f7f2" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, courtZ(6.4)]}>
        <planeGeometry args={[8.23, 0.04]} />
        <meshBasicMaterial color="#f4f1ea" />
      </mesh>
      {/* Center service line stub */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.007, courtZ(3.2)]}>
        <planeGeometry args={[0.04, 6.4 * XZ]} />
        <meshBasicMaterial color="#f4f1ea" transparent opacity={0.7} />
      </mesh>
      {/* Net */}
      <mesh position={[0, netH / 2, 0]}>
        <boxGeometry args={[8.8, netH, 0.035]} />
        <meshLambertMaterial color="#eceae4" transparent opacity={0.28} />
      </mesh>
      <mesh position={[0, netH, 0]}>
        <boxGeometry args={[9.0, 0.028, 0.032]} />
        <meshBasicMaterial color="#f7f7f2" />
      </mesh>
      <mesh position={[4.4, netH / 2, 0]}>
        <cylinderGeometry args={[0.035, 0.035, netH, 8]} />
        <meshLambertMaterial color="#2a2a2a" />
      </mesh>
      <mesh position={[-4.4, netH / 2, 0]}>
        <cylinderGeometry args={[0.035, 0.035, netH, 8]} />
        <meshLambertMaterial color="#2a2a2a" />
      </mesh>
    </group>
  );
}

/** Optional silhouette billboard at baseline */
function StanceBillboard({ colors }: { colors: ThemeColors }) {
  return (
    <group position={[0, 0.85, SCENE_BASELINE_Z + 0.05]}>
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[0.55, 1.55]} />
        <meshBasicMaterial color={colors.silhouette} transparent opacity={0.55} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[-0.14, -0.78, 0.02]}>
        <boxGeometry args={[0.1, 0.05, 0.24]} />
        <meshLambertMaterial color={colors.silhouetteRim} />
      </mesh>
      <mesh position={[0.14, -0.78, -0.02]}>
        <boxGeometry args={[0.1, 0.05, 0.24]} />
        <meshLambertMaterial color={colors.silhouetteRim} />
      </mesh>
    </group>
  );
}

function LaunchWedge({
  contactY,
  contactZ,
  launchDeg,
  accent,
}: {
  contactY: number;
  contactZ: number;
  launchDeg: number;
  accent: string;
}) {
  const len = 0.85;
  const rad = THREE.MathUtils.degToRad(launchDeg);
  const horiz = new THREE.Vector3(0, contactY, contactZ - len);
  const leave = new THREE.Vector3(0, contactY + Math.sin(rad) * len, contactZ - Math.cos(rad) * len);
  const origin = new THREE.Vector3(0, contactY, contactZ);
  const arc: THREE.Vector3[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = (rad * i) / 10;
    const r = 0.42;
    arc.push(new THREE.Vector3(0, contactY + Math.sin(t) * r, contactZ - Math.cos(t) * r));
  }
  return (
    <group>
      <Line points={[origin, horiz]} color="#8aa396" lineWidth={1} dashed dashSize={0.05} gapSize={0.04} />
      <Line points={[origin, leave]} color={accent} lineWidth={2} />
      <Line points={arc} color={accent} lineWidth={1.4} />
      <mesh position={[0, contactY, contactZ]}>
        <sphereGeometry args={[0.028, 12, 12]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.25} />
      </mesh>
    </group>
  );
}

function BallFlight({ points, accent }: { points: THREE.Vector3[]; accent: string }) {
  const ball = useRef<THREE.Mesh>(null);
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points, false, "catmullrom", 0), [points]);

  useFrame(({ clock }) => {
    if (!ball.current) return;
    const t = (clock.getElapsedTime() * 0.18) % 1;
    ball.current.position.copy(curve.getPoint(t));
  });

  return (
    <group>
      <Line points={points} color={accent} lineWidth={1.8} transparent opacity={0.9} />
      <mesh ref={ball} position={points[0]}>
        <sphereGeometry args={[BALL_RADIUS_M, 16, 16]} />
        <meshStandardMaterial
          color="#d4e054"
          roughness={0.45}
          metalness={0.05}
          emissive="#5a6a10"
          emissiveIntensity={0.15}
        />
      </mesh>
    </group>
  );
}

function ThemeClear({ colors }: { colors: ThemeColors }) {
  return (
    <>
      <color attach="background" args={[colors.bgScene]} />
      <fog attach="fog" args={[colors.bgScene, 8, 18]} />
    </>
  );
}

export function SetupFlightCanvas({
  launchDeg,
  pathDeg,
  flight,
  contactHeightM,
  outFrontM,
  faceClosedDeg = 8,
}: {
  launchDeg: number;
  pathDeg: number;
  flight: FlightMetrics;
  contactHeightM: number;
  outFrontM: number;
  faceClosedDeg?: number;
}) {
  const { colors: sceneColors } = useTheme();

  const traj = useMemo(
    () =>
      computeBallTrajectory({
        launchDeg,
        netClearIn: flight.netClearIn,
        contactHeightM,
        outFrontM,
        topspin: flight.topspin,
      }),
    [launchDeg, flight.netClearIn, flight.topspin, contactHeightM, outFrontM],
  );

  // Path/face used for caption coaching language (physics path from launch only).
  const pathNote = pathDeg >= 28 ? "steep low→high" : pathDeg >= 18 ? "modern drive path" : "flatter path";
  const faceNote = faceClosedDeg >= 12 ? "face closed past vertical" : "face near vertical";

  const contactZ = courtZ(outFrontM);

  const points = useMemo(() => {
    return traj.points.map((p) => new THREE.Vector3(0, p.y, courtZ(outFrontM + p.x)));
  }, [traj.points, outFrontM]);

  const accent = sceneColors.accent;

  return (
    <div
      className="relative h-[280px] w-full overflow-hidden rounded-md md:h-[340px]"
      style={{ background: sceneColors.bgScene }}
    >
      <Canvas
        dpr={[1, 1.6]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
          stencil: false,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color(sceneColors.bgScene));
          gl.toneMapping = THREE.ACESFilmicToneMapping;
        }}
      >
        <PerspectiveCamera makeDefault position={[4.6, 1.25, 1.15]} fov={34} />
        <Suspense fallback={null}>
          <ThemeClear colors={sceneColors} />
          <ambientLight intensity={0.55} />
          <hemisphereLight args={["#d5ead8", "#1a3328", 0.5]} />
          <directionalLight position={[4, 8, 3]} intensity={1.15} />
          <CourtDiorama colors={sceneColors} />
          <StanceBillboard colors={sceneColors} />
          <LaunchWedge
            contactY={contactHeightM}
            contactZ={contactZ}
            launchDeg={launchDeg}
            accent={accent}
          />
          <BallFlight points={points} accent={accent} />
          <OrbitControls
            enablePan={false}
            target={[0, 0.85, 0.9]}
            minDistance={3.2}
            maxDistance={8}
            maxPolarAngle={1.35}
            enableDamping
          />
        </Suspense>
      </Canvas>
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 px-3 pb-2.5 pt-10"
        style={{
          background: `linear-gradient(to top, ${sceneColors.bgScene}, color-mix(in srgb, ${sceneColors.bgScene} 70%, transparent), transparent)`,
        }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
          Court view — clean hit
        </p>
        <p className="mt-0.5 text-xs tabular-nums text-[var(--muted)]">
          Baseline → contact {formatFt(outFrontM)} out · {launchDeg.toFixed(1)}° leave · +{traj.netClearIn.toFixed(1)}″
          over 3.0 ft tape · {pathNote} · {faceNote}
        </p>
      </div>
    </div>
  );
}
