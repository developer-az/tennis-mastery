"use client";

export function TennisCourt() {
  const courtW = 10.97;
  const courtL = 23.77;
  const singlesW = 8.23;

  return (
    <group>
      {/* Ground plane beyond court */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[40, 50]} />
        <meshStandardMaterial color="#1a3328" roughness={0.95} />
      </mesh>

      {/* Hard court surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[courtW + 7, courtL + 8]} />
        <meshStandardMaterial color="#2d6a4f" roughness={0.85} />
      </mesh>

      {/* Inner court */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} receiveShadow>
        <planeGeometry args={[courtW, courtL]} />
        <meshStandardMaterial color="#40916c" roughness={0.8} />
      </mesh>

      {/* Lines */}
      <CourtLine w={courtW} d={0.05} z={courtL / 2} />
      <CourtLine w={courtW} d={0.05} z={-courtL / 2} />
      <CourtLine w={0.05} d={courtL} x={courtW / 2} />
      <CourtLine w={0.05} d={courtL} x={-courtW / 2} />
      <CourtLine w={singlesW} d={0.05} z={0} />
      <CourtLine w={0.05} d={courtL} x={singlesW / 2} />
      <CourtLine w={0.05} d={courtL} x={-singlesW / 2} />
      {/* Service boxes */}
      <CourtLine w={singlesW} d={0.05} z={6.4} />
      <CourtLine w={singlesW} d={0.05} z={-6.4} />
      <CourtLine w={0.05} d={12.8} x={0} />

      {/* Net */}
      <mesh position={[0, 0.53, 0]} castShadow>
        <boxGeometry args={[courtW + 0.6, 1.07, 0.04]} />
        <meshStandardMaterial color="#e8e6e0" transparent opacity={0.35} />
      </mesh>
      <mesh position={[0, 1.07, 0]}>
        <boxGeometry args={[courtW + 0.8, 0.03, 0.03]} />
        <meshStandardMaterial color="#f5f5f0" />
      </mesh>
      <mesh position={[courtW / 2 + 0.35, 0.55, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 1.1, 8]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      <mesh position={[-(courtW / 2 + 0.35), 0.55, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 1.1, 8]} />
        <meshStandardMaterial color="#333" />
      </mesh>

      {/* Ambient atmosphere lights bounce */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 12]}>
        <circleGeometry args={[2.2, 48]} />
        <meshStandardMaterial color="#52b788" transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

function CourtLine({
  w,
  d,
  x = 0,
  z = 0,
}: {
  w: number;
  d: number;
  x?: number;
  z?: number;
}) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.005, z]}>
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial color="#f8f7f2" roughness={0.6} />
    </mesh>
  );
}
