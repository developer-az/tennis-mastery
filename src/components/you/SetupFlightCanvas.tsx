"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import type { LeadTapePiece } from "@/types/equipment";
import type { FlightMetrics } from "@/lib/equipment/setupSynthesis";
import {
  BALL_RADIUS_M,
  BASELINE_TO_NET_M,
  computeBallTrajectory,
  NET_HEIGHT_M,
} from "@/lib/equipment/ballFlight";
import { RacketFrame3D } from "@/components/gear/RacketFrame3D";

/** Compress court depth so the baseline-to-net slice fits the camera; heights stay in meters. */
const SCENE_BASELINE_Z = 2.55;
const XZ = SCENE_BASELINE_Z / BASELINE_TO_NET_M;
/** Hoop center in RacketFrame3D local space. */
const HOOP_Y = 0.495;
/** Ball sits this far in front of the string plane (tube + ball radius). */
const STRING_LEAVE_M = 0.045;

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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0.4]}>
        <planeGeometry args={[10.97, 11.88]} />
        <meshLambertMaterial color="#40916c" transparent opacity={0.35} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, SCENE_BASELINE_Z]}>
        <planeGeometry args={[8.23, 0.04]} />
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

function GroundstrokeRacket({
  pieces,
  contactY,
  contactZ,
  closedDeg,
}: {
  pieces: LeadTapePiece[];
  contactY: number;
  contactZ: number;
  closedDeg: number;
}) {
  const closed = THREE.MathUtils.degToRad(closedDeg);
  return (
    <group position={[0, contactY, contactZ]}>
      {/* Strings face the net (−Z). Closed: top of the hoop leans toward the opponent. */}
      <group rotation={[0, Math.PI, 0]}>
        <group rotation={[closed, 0, 0]}>
          <group position={[0, -HOOP_Y, 0]}>
            <RacketFrame3D pieces={pieces} />
          </group>
        </group>
      </group>
    </group>
  );
}

function BallFlight({
  points,
  leaveZ,
}: {
  points: THREE.Vector3[];
  leaveZ: number;
}) {
  const ball = useRef<THREE.Mesh>(null);
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points, false, "catmullrom", 0), [points]);

  useFrame(({ clock }) => {
    if (!ball.current) return;
    const t = (clock.getElapsedTime() * 0.18) % 1;
    const p = curve.getPoint(t);
    ball.current.position.copy(p);
    if (t < 0.02) ball.current.position.z = leaveZ;
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
  pieces,
  contactHeightM,
  outFrontM,
  faceClosedDeg = 8,
}: {
  launchDeg: number;
  pathDeg: number;
  flight: FlightMetrics;
  pieces: LeadTapePiece[];
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
  const leaveZ = contactZ - STRING_LEAVE_M;

  const points = useMemo(() => {
    return traj.points.map((p, i) => {
      const z = courtZ(outFrontM + p.x) - (i === 0 ? STRING_LEAVE_M : 0);
      return new THREE.Vector3(0, p.y, z);
    });
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
        <PerspectiveCamera makeDefault position={[3.4, 1.45, 3.8]} fov={36} />
        <Suspense fallback={null}>
          <color attach="background" args={["#07140f"]} />
          <fog attach="fog" args={["#07140f", 8, 18]} />
          <ambientLight intensity={0.5} />
          <hemisphereLight args={["#d5ead8", "#1a3328", 0.5]} />
          <directionalLight position={[4, 8, 3]} intensity={1.2} />
          <CourtSlice />
          <GroundstrokeRacket
            pieces={pieces}
            contactY={contactHeightM}
            contactZ={contactZ}
            closedDeg={faceClosedDeg}
          />
          <BallFlight points={points} leaveZ={leaveZ} />
          <OrbitControls
            enablePan={false}
            target={[0, 0.85, 0.55]}
            minDistance={3.2}
            maxDistance={8}
            maxPolarAngle={1.35}
            enableDamping
          />
        </Suspense>
      </Canvas>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#07140f] via-[#07140f]/70 to-transparent px-3 pb-2.5 pt-10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
          Clean-hit flight — off the strings
        </p>
        <p className="mt-0.5 text-xs tabular-nums text-[var(--muted)]">
          {launchDeg.toFixed(1)}° leave · face {faceClosedDeg.toFixed(1)}° closed · path {pathDeg.toFixed(0)}° · +
          {traj.netClearIn.toFixed(1)}″ over 0.914 m tape · depth {flight.depth}
        </p>
      </div>
    </div>
  );
}
