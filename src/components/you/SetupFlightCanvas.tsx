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

/** Compress court depth so the baseline-to-net slice fits the camera; heights stay in meters. */
const SCENE_BASELINE_Z = 2.55;
const XZ = SCENE_BASELINE_Z / BASELINE_TO_NET_M;

function courtZ(fromBaselineM: number) {
  return SCENE_BASELINE_Z - fromBaselineM * XZ;
}

function CourtSlice() {
  const netH = NET_HEIGHT_M;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[8, 14]} />
        <meshLambertMaterial color="#1a3328" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0.4]}>
        <planeGeometry args={[8.23, 10]} />
        <meshLambertMaterial color="#2d6a4f" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, SCENE_BASELINE_Z]}>
        <planeGeometry args={[8.23, 0.06]} />
        <meshBasicMaterial color="#f4f1ea" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, courtZ(6.4)]}>
        <planeGeometry args={[8.23, 0.04]} />
        <meshBasicMaterial color="#f4f1ea" />
      </mesh>
      <mesh position={[0, netH / 2, 0]}>
        <boxGeometry args={[8.8, netH, 0.035]} />
        <meshLambertMaterial color="#eceae4" transparent opacity={0.22} />
      </mesh>
      <mesh position={[0, netH, 0]}>
        <boxGeometry args={[9.0, 0.025, 0.03]} />
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

/** Stance at the baseline — feet only. Face/racket live in the 2D side view. */
function BaselineStance() {
  return (
    <group position={[0, 0, SCENE_BASELINE_Z]}>
      <mesh position={[-0.12, 0.04, 0.04]}>
        <boxGeometry args={[0.08, 0.04, 0.22]} />
        <meshLambertMaterial color="#1e3329" />
      </mesh>
      <mesh position={[0.12, 0.04, -0.02]}>
        <boxGeometry args={[0.08, 0.04, 0.22]} />
        <meshLambertMaterial color="#1e3329" />
      </mesh>
    </group>
  );
}

function LaunchWedge({
  contactY,
  contactZ,
  launchDeg,
}: {
  contactY: number;
  contactZ: number;
  launchDeg: number;
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
      <Line points={[origin, leave]} color="#c8f560" lineWidth={2} />
      <Line points={arc} color="#c8f560" lineWidth={1.4} />
      <mesh position={[0, contactY, contactZ]}>
        <sphereGeometry args={[0.028, 12, 12]} />
        <meshStandardMaterial color="#c8f560" emissive="#5a6a10" emissiveIntensity={0.35} />
      </mesh>
    </group>
  );
}

function BallFlight({ points }: { points: THREE.Vector3[] }) {
  const ball = useRef<THREE.Mesh>(null);
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points, false, "catmullrom", 0), [points]);

  useFrame(({ clock }) => {
    if (!ball.current) return;
    const t = (clock.getElapsedTime() * 0.18) % 1;
    ball.current.position.copy(curve.getPoint(t));
  });

  return (
    <group>
      <Line points={points} color="#c8f560" lineWidth={1.8} transparent opacity={0.9} />
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

  const contactZ = courtZ(outFrontM);

  const points = useMemo(() => {
    return traj.points.map((p) => new THREE.Vector3(0, p.y, courtZ(outFrontM + p.x)));
  }, [traj.points, outFrontM]);

  return (
    <div className="relative h-[280px] w-full overflow-hidden rounded-md bg-[#07140f] md:h-[340px]">
      <Canvas
        dpr={[1, 1.6]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
          stencil: false,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color("#07140f"));
          gl.toneMapping = THREE.ACESFilmicToneMapping;
        }}
      >
        <PerspectiveCamera makeDefault position={[4.6, 1.25, 1.15]} fov={34} />
        <Suspense fallback={null}>
          <color attach="background" args={["#07140f"]} />
          <fog attach="fog" args={["#07140f", 8, 18]} />
          <ambientLight intensity={0.5} />
          <hemisphereLight args={["#d5ead8", "#1a3328", 0.5]} />
          <directionalLight position={[4, 8, 3]} intensity={1.2} />
          <CourtSlice />
          <BaselineStance />
          <LaunchWedge contactY={contactHeightM} contactZ={contactZ} launchDeg={launchDeg} />
          <BallFlight points={points} />
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
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#07140f] via-[#07140f]/70 to-transparent px-3 pb-2.5 pt-10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
          Clean-hit flight — from the baseline
        </p>
        <p className="mt-0.5 text-xs tabular-nums text-[var(--muted)]">
          Hit {formatFt(outFrontM)} in front of the baseline · {launchDeg.toFixed(1)}° leave · face{" "}
          {faceClosedDeg.toFixed(1)}° closed (see side view) · path {pathDeg.toFixed(0)}° · +
          {traj.netClearIn.toFixed(1)}″ over a 3.0 ft net
        </p>
      </div>
    </div>
  );
}
