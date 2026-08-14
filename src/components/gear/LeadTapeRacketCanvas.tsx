"use client";

import { Suspense, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import type { LeadTapePiece, LeadTapeZone } from "@/types/equipment";
import { LEAD_TAPE_ZONES } from "@/lib/equipment/leadTape";
import { RacketFrame3D, ZONE_ORDER } from "./RacketFrame3D";

function StudioLights() {
  return (
    <>
      <color attach="background" args={["#07140f"]} />
      <fog attach="fog" args={["#07140f", 2.4, 5.5]} />
      <ambientLight intensity={0.42} />
      <hemisphereLight args={["#d7e4d4", "#1a3328", 0.55]} />
      <directionalLight position={[1.6, 2.4, 2.2]} intensity={1.35} />
      <directionalLight position={[-1.8, 1.2, 0.6]} intensity={0.35} color="#8fb8a0" />
      <spotLight position={[0.4, 2.8, 1.8]} angle={0.45} penumbra={0.6} intensity={0.55} />
    </>
  );
}

export function LeadTapeRacketCanvas({
  pieces,
  selectedZone,
  interactive = true,
  onZoneClick,
  className,
}: {
  pieces: LeadTapePiece[];
  selectedZone?: LeadTapeZone | null;
  interactive?: boolean;
  onZoneClick?: (zone: LeadTapeZone) => void;
  className?: string;
}) {
  const [hover, setHover] = useState<LeadTapeZone | null>(null);
  const totalG = useMemo(
    () => pieces.reduce((n, p) => n + p.massG, 0),
    [pieces],
  );

  return (
    <div className={className ?? "relative aspect-[4/5] w-full overflow-hidden rounded-md bg-[#07140f]"}>
      <Canvas
        dpr={[1, 1.75]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
          stencil: false,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color("#07140f"));
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
      >
        <PerspectiveCamera makeDefault position={[0.38, 0.34, 0.72]} fov={36} />
        <Suspense fallback={null}>
          <StudioLights />
          <group rotation={[0.08, -0.35, 0.04]} position={[0, -0.02, 0]}>
            <RacketFrame3D
              pieces={pieces}
              selectedZone={selectedZone ?? hover}
              hoverZone={hover}
              interactive={interactive}
              onZoneClick={onZoneClick}
              onZoneHover={setHover}
            />
          </group>
          <ContactShadows
            position={[0, -0.01, 0]}
            opacity={0.45}
            scale={1.6}
            blur={2.2}
            far={1.2}
            color="#020805"
          />
          <OrbitControls
            enablePan={false}
            minDistance={0.55}
            maxDistance={1.35}
            minPolarAngle={0.7}
            maxPolarAngle={1.45}
            target={[0, 0.32, 0]}
            enableDamping
            dampingFactor={0.12}
          />
        </Suspense>
      </Canvas>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#07140f] to-transparent px-3 pb-2.5 pt-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
          {interactive ? "Drag to orbit · tap a zone to place" : "Your frame"}
        </p>
        <p className="mt-0.5 text-xs tabular-nums text-[var(--muted)]">
          {totalG > 0
            ? `${totalG.toFixed(1)} g lead · ${hover ? LEAD_TAPE_ZONES[hover].label : selectedZone ? LEAD_TAPE_ZONES[selectedZone].label : `${pieces.length} strip${pieces.length === 1 ? "" : "s"}`}`
            : hover
              ? LEAD_TAPE_ZONES[hover].label
              : interactive
                ? "Stock hoop — add tape at 12, 3/9, throat, or handle"
                : "No tape"}
        </p>
      </div>
    </div>
  );
}

export { ZONE_ORDER };
