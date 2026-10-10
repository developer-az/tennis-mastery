"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { useTheme } from "@/components/theme/ThemeProvider";

/** Court surface is the only green. Floor is epoxy / anodized; lines read as traces. */
export function TennisCourt() {
  const { theme, colors } = useTheme();
  const courtW = 10.97;
  const courtL = 23.77;
  const singlesW = 8.23;

  const mats = useMemo(() => {
    const floor = theme === "light" ? "#cfcbc2" : "#0e0f10";
    const outer = theme === "light" ? "#c4c0b6" : "#161718";
    const line = theme === "light" ? "#d5e4e8" : "#8aa8b0";
    return {
      ground: new THREE.MeshLambertMaterial({ color: floor }),
      outer: new THREE.MeshLambertMaterial({ color: outer }),
      inner: new THREE.MeshLambertMaterial({ color: colors.court }),
      line: new THREE.MeshBasicMaterial({ color: line }),
      net: new THREE.MeshLambertMaterial({
        color: theme === "light" ? "#d8d4cc" : "#2a2c2b",
        transparent: true,
        opacity: 0.4,
      }),
      tape: new THREE.MeshBasicMaterial({ color: "#e8e6e1" }),
      post: new THREE.MeshLambertMaterial({ color: "#3a3c3b" }),
    };
  }, [theme, colors.court]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} material={mats.ground}>
        <planeGeometry args={[40, 50]} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} material={mats.outer}>
        <planeGeometry args={[courtW + 7, courtL + 8]} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} material={mats.inner}>
        <planeGeometry args={[courtW, courtL]} />
      </mesh>

      <CourtLine w={courtW} d={0.04} z={courtL / 2} material={mats.line} />
      <CourtLine w={courtW} d={0.04} z={-courtL / 2} material={mats.line} />
      <CourtLine w={0.04} d={courtL} x={courtW / 2} material={mats.line} />
      <CourtLine w={0.04} d={courtL} x={-courtW / 2} material={mats.line} />
      <CourtLine w={singlesW} d={0.04} z={0} material={mats.line} />
      <CourtLine w={0.04} d={courtL} x={singlesW / 2} material={mats.line} />
      <CourtLine w={0.04} d={courtL} x={-singlesW / 2} material={mats.line} />
      <CourtLine w={singlesW} d={0.04} z={6.4} material={mats.line} />
      <CourtLine w={singlesW} d={0.04} z={-6.4} material={mats.line} />
      <CourtLine w={0.04} d={12.8} x={0} material={mats.line} />

      <mesh position={[0, 0.53, 0]} material={mats.net}>
        <boxGeometry args={[courtW + 0.6, 1.07, 0.04]} />
      </mesh>
      <mesh position={[0, 1.07, 0]} material={mats.tape}>
        <boxGeometry args={[courtW + 0.8, 0.03, 0.03]} />
      </mesh>
      <mesh position={[courtW / 2 + 0.35, 0.55, 0]} material={mats.post}>
        <cylinderGeometry args={[0.04, 0.04, 1.1, 6]} />
      </mesh>
      <mesh position={[-(courtW / 2 + 0.35), 0.55, 0]} material={mats.post}>
        <cylinderGeometry args={[0.04, 0.04, 1.1, 6]} />
      </mesh>
    </group>
  );
}

function CourtLine({
  w,
  d,
  x = 0,
  z = 0,
  material,
}: {
  w: number;
  d: number;
  x?: number;
  z?: number;
  material: THREE.Material;
}) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.005, z]} material={material}>
      <planeGeometry args={[w, d]} />
    </mesh>
  );
}
