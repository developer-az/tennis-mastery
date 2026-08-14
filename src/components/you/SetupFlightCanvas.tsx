"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import type { LeadTapePiece } from "@/types/equipment";
import type { FlightMetrics } from "@/lib/equipment/setupSynthesis";
import { RacketFrame3D } from "@/components/gear/RacketFrame3D";

function CourtSlice() {
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
      {/* Baseline / service hints */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 2.55]}>
        <planeGeometry args={[8.23, 0.04]} />
        <meshBasicMaterial color="#f4f1ea" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, -2.15]}>
        <planeGeometry args={[8.23, 0.04]} />
        <meshBasicMaterial color="#f4f1ea" />
      </mesh>
      <mesh position={[0, 0.535, 0]}>
        <boxGeometry args={[8.8, 1.07, 0.035]} />
        <meshLambertMaterial color="#eceae4" transparent opacity={0.22} />
      </mesh>
      <mesh position={[0, 1.07, 0]}>
        <boxGeometry args={[9.0, 0.025, 0.03]} />
        <meshBasicMaterial color="#f7f7f2" />
      </mesh>
      <mesh position={[4.4, 0.55, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 1.1, 8]} />
        <meshLambertMaterial color="#2a2a2a" />
      </mesh>
      <mesh position={[-4.4, 0.55, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 1.1, 8]} />
        <meshLambertMaterial color="#2a2a2a" />
      </mesh>
    </group>
  );
}

function flightCurve(input: {
  launchDeg: number;
  netClearIn: number;
  depth: number;
  pathDeg: number;
}): THREE.QuadraticBezierCurve3 {
  const start = new THREE.Vector3(0.15, 0.92, 2.55);
  const netY = 1.07 + input.netClearIn * 0.0254;
  const mid = new THREE.Vector3(0.05, netY + 0.08 + input.launchDeg * 0.012, 0);
  const landZ = -1.05 - (input.depth / 100) * 2.35;
  const end = new THREE.Vector3(-0.05, 0.034, landZ);
  void input.pathDeg;
  return new THREE.QuadraticBezierCurve3(start, mid, end);
}

function BallFlight({
  launchDeg,
  netClearIn,
  depth,
  pathDeg,
}: {
  launchDeg: number;
  netClearIn: number;
  depth: number;
  pathDeg: number;
}) {
  const ball = useRef<THREE.Mesh>(null);
  const curve = useMemo(
    () => flightCurve({ launchDeg, netClearIn, depth, pathDeg }),
    [launchDeg, netClearIn, depth, pathDeg],
  );
  const pts = useMemo(() => curve.getPoints(48), [curve]);

  useFrame(({ clock }) => {
    if (!ball.current) return;
    const t = (clock.getElapsedTime() * 0.22) % 1;
    const p = curve.getPoint(t);
    ball.current.position.copy(p);
  });

  return (
    <group>
      <Line points={pts} color="#c8f560" lineWidth={1.8} transparent opacity={0.88} />
      <mesh ref={ball}>
        <sphereGeometry args={[0.033, 16, 16]} />
        <meshStandardMaterial color="#d4e054" roughness={0.45} metalness={0.05} emissive="#5a6a10" emissiveIntensity={0.15} />
      </mesh>
    </group>
  );
}

export function SetupFlightCanvas({
  launchDeg,
  pathDeg,
  flight,
  pieces,
}: {
  launchDeg: number;
  pathDeg: number;
  flight: FlightMetrics;
  pieces: LeadTapePiece[];
}) {
          const racketTilt = useMemo(() => {
    const path = THREE.MathUtils.clamp(pathDeg, 6, 40);
    const launch = THREE.MathUtils.clamp(launchDeg, 2, 14);
    return {
      x: -0.55 + (path / 40) * 0.45,
      y: 0.55,
      z: -0.12 + (launch / 14) * 0.2,
    };
  }, [pathDeg, launchDeg]);

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
        <PerspectiveCamera makeDefault position={[3.6, 1.55, 4.2]} fov={38} />
        <Suspense fallback={null}>
          <color attach="background" args={["#07140f"]} />
          <fog attach="fog" args={["#07140f", 8, 18]} />
          <ambientLight intensity={0.5} />
          <hemisphereLight args={["#d5ead8", "#1a3328", 0.5]} />
          <directionalLight position={[4, 8, 3]} intensity={1.2} />
          <CourtSlice />
          <group position={[0.18, 0.52, 2.55]} rotation={[racketTilt.x, racketTilt.y, racketTilt.z]} scale={1.05}>
            <RacketFrame3D pieces={pieces} />
          </group>
          <BallFlight
            launchDeg={launchDeg}
            netClearIn={flight.netClearIn}
            depth={flight.depth}
            pathDeg={pathDeg}
          />
          <OrbitControls
            enablePan={false}
            target={[0, 0.7, 0.4]}
            minDistance={3.2}
            maxDistance={8}
            maxPolarAngle={1.35}
            enableDamping
          />
        </Suspense>
      </Canvas>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#07140f] via-[#07140f]/70 to-transparent px-3 pb-2.5 pt-10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
          Clean-hit flight — this bag
        </p>
        <p className="mt-0.5 text-xs tabular-nums text-[var(--muted)]">
          {launchDeg.toFixed(1)}° leave · path {pathDeg.toFixed(0)}° · +{flight.netClearIn.toFixed(0)}″ net ·
          depth {flight.depth} · fly {flight.flyRisk}
        </p>
      </div>
    </div>
  );
}
