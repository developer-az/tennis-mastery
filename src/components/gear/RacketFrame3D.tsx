"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { LeadTapePiece, LeadTapeZone } from "@/types/equipment";
import { LEAD_TAPE_ZONES } from "@/lib/equipment/leadTape";

/** Map the 2D lab diagram (0–1) onto the 3D frame. Y-up, strings face +Z. */
export function zoneWorldPosition(zone: LeadTapeZone): [number, number, number] {
  const z = LEAD_TAPE_ZONES[zone];
  const x = (z.x - 0.5) * 0.255;
  const y = 0.69 - z.y * 0.69;
  const depth = zone === "handle" ? 0.017 : zone === "throat" ? 0.012 : 0.014;
  return [x, y, depth];
}

export const ZONE_ORDER: LeadTapeZone[] = ["tip", "twelve", "three", "nine", "throat", "handle"];

function Strings() {
  const geom = useMemo(() => {
    const positions: number[] = [];
    const rx = 0.098;
    const ry = 0.112;
    const cy = 0.495;
    const mains = 16;
    const crosses = 19;
    for (let i = 0; i < mains; i++) {
      const t = (i + 0.5) / mains;
      const x = -rx + t * 2 * rx;
      const half = ry * Math.sqrt(Math.max(0, 1 - (x / rx) ** 2));
      positions.push(x, cy - half, 0.001, x, cy + half, 0.001);
    }
    for (let j = 0; j < crosses; j++) {
      const t = (j + 0.5) / crosses;
      const y = cy - ry + t * 2 * ry;
      const half = rx * Math.sqrt(Math.max(0, 1 - ((y - cy) / ry) ** 2));
      positions.push(-half, y, 0.001, half, y, 0.001);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return g;
  }, []);

  return (
    <lineSegments geometry={geom}>
      <lineBasicMaterial color="#cfcfc8" transparent opacity={0.55} />
    </lineSegments>
  );
}

export function RacketFrame3D({
  pieces = [],
  selectedZone = null,
  hoverZone = null,
  interactive = false,
  onZoneClick,
  onZoneHover,
}: {
  pieces?: LeadTapePiece[];
  selectedZone?: LeadTapeZone | null;
  hoverZone?: LeadTapeZone | null;
  interactive?: boolean;
  onZoneClick?: (zone: LeadTapeZone) => void;
  onZoneHover?: (zone: LeadTapeZone | null) => void;
}) {
  const massByZone = useMemo(() => {
    const map: Partial<Record<LeadTapeZone, number>> = {};
    for (const p of pieces) {
      map[p.zone] = (map[p.zone] ?? 0) + p.massG;
    }
    return map;
  }, [pieces]);

  const countByZone = useMemo(() => {
    const map: Partial<Record<LeadTapeZone, number>> = {};
    for (const p of pieces) {
      map[p.zone] = (map[p.zone] ?? 0) + 1;
    }
    return map;
  }, [pieces]);

  return (
    <group>
      {/* Hoop */}
      <mesh position={[0, 0.495, 0]} rotation={[0, 0, 0]} castShadow>
        <torusGeometry args={[0.108, 0.011, 20, 64]} />
        <meshStandardMaterial
          color="#1c1c1c"
          metalness={0.62}
          roughness={0.28}
          envMapIntensity={0.9}
        />
      </mesh>
      {/* Inner hoop lip */}
      <mesh position={[0, 0.495, 0]}>
        <torusGeometry args={[0.097, 0.0035, 12, 48]} />
        <meshStandardMaterial color="#2a4a3a" metalness={0.35} roughness={0.45} />
      </mesh>

      <Strings />

      {/* Open throat pillars into the neck */}
      <mesh position={[-0.028, 0.355, 0]} rotation={[0, 0, 0.38]}>
        <cylinderGeometry args={[0.007, 0.009, 0.09, 12]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.55} roughness={0.32} />
      </mesh>
      <mesh position={[0.028, 0.355, 0]} rotation={[0, 0, -0.38]}>
        <cylinderGeometry args={[0.007, 0.009, 0.09, 12]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.55} roughness={0.32} />
      </mesh>
      <mesh position={[0, 0.318, 0]}>
        <boxGeometry args={[0.034, 0.018, 0.014]} />
        <meshStandardMaterial color="#141414" metalness={0.5} roughness={0.35} />
      </mesh>

      {/* Shaft */}
      <mesh position={[0, 0.24, 0]}>
        <cylinderGeometry args={[0.008, 0.01, 0.12, 12]} />
        <meshStandardMaterial color="#161616" metalness={0.5} roughness={0.34} />
      </mesh>

      {/* Grip */}
      <mesh position={[0, 0.105, 0]}>
        <cylinderGeometry args={[0.0135, 0.0125, 0.155, 8]} />
        <meshStandardMaterial color="#3a271c" roughness={0.88} metalness={0.04} />
      </mesh>
      {/* Butt cap */}
      <mesh position={[0, 0.022, 0]}>
        <cylinderGeometry args={[0.016, 0.015, 0.02, 16]} />
        <meshStandardMaterial color="#111" metalness={0.4} roughness={0.4} />
      </mesh>

      {ZONE_ORDER.map((zone) => {
        const [x, y, z] = zoneWorldPosition(zone);
        const mass = massByZone[zone] ?? 0;
        const strips = countByZone[zone] ?? 0;
        const active = selectedZone === zone || hoverZone === zone;
        return (
          <group key={zone} position={[x, y, z]}>
            {interactive ? (
              <mesh
                onClick={(e) => {
                  e.stopPropagation();
                  onZoneClick?.(zone);
                }}
                onPointerOver={(e) => {
                  e.stopPropagation();
                  onZoneHover?.(zone);
                  document.body.style.cursor = "pointer";
                }}
                onPointerOut={() => {
                  onZoneHover?.(null);
                  document.body.style.cursor = "";
                }}
              >
                <sphereGeometry args={[0.03, 16, 16]} />
                <meshStandardMaterial
                  color={active ? "var(--chart-control)" : mass > 0 ? "#8fb84a" : "var(--chart-control)"}
                  transparent
                  opacity={active ? 0.28 : mass > 0 ? 0.16 : 0.07}
                  roughness={0.4}
                  depthWrite={false}
                />
              </mesh>
            ) : null}

            {Array.from({ length: Math.max(strips, mass > 0 ? 1 : 0) }).map((_, i) => (
              <mesh key={i} position={[0, 0, 0.004 + i * 0.0035]} rotation={[0.12, 0, zone === "three" || zone === "nine" ? Math.PI / 2 : 0]}>
                <boxGeometry args={[zone === "handle" ? 0.022 : 0.032, 0.007, 0.0028]} />
                <meshStandardMaterial
                  color="#0d0d0d"
                  metalness={0.75}
                  roughness={0.22}
                  emissive={active ? "#3d5a12" : "#000"}
                  emissiveIntensity={active ? 0.25 : 0}
                />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}
