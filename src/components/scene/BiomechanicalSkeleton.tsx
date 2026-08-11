"use client";

import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Anthropometrics, JointAngles } from "@/types/biomechanics";
import { createSkeletonPose, solveSkeletonFk } from "@/lib/skeletonFk";

/** Mutable pose feed — updated from the animation loop without React re-renders */
export interface SkeletonDriver {
  joints: JointAngles;
  racketSpeedMs: number;
  handedness: "right" | "left";
  oneHanded: boolean;
}

type MeshRef = THREE.Mesh | null;

const _dir = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _yAxis = new THREE.Vector3(0, 1, 0);

function placeLimb(
  mesh: THREE.Mesh | null,
  start: THREE.Vector3,
  end: THREE.Vector3,
  scaleLength: boolean,
) {
  if (!mesh) return;
  _dir.subVectors(end, start);
  const length = _dir.length();
  _mid.addVectors(start, end).multiplyScalar(0.5);
  mesh.position.copy(_mid);
  if (length > 1e-6) {
    _quat.setFromUnitVectors(_yAxis, _dir.normalize());
    mesh.quaternion.copy(_quat);
  }
  if (scaleLength) {
    mesh.scale.set(1, Math.max(0.05, length), 1);
  }
}

function placeAt(mesh: THREE.Mesh | null, p: THREE.Vector3) {
  if (!mesh) return;
  mesh.position.copy(p);
}

/** Shared low-poly geometries — created once */
const geo = {
  limb: new THREE.CylinderGeometry(1, 1, 1, 6),
  joint: new THREE.SphereGeometry(1, 10, 10),
  head: new THREE.SphereGeometry(1, 12, 12),
  foot: new THREE.BoxGeometry(0.1, 0.05, 0.22),
  handle: new THREE.CylinderGeometry(0.018, 0.022, 1, 8),
  throat: new THREE.CylinderGeometry(0.012, 0.016, 1, 6),
  hoop: new THREE.TorusGeometry(0.14, 0.012, 6, 16),
  strings: new THREE.CircleGeometry(0.12, 16),
};

/**
 * Imperative biomechanical skeleton.
 * Pose is driven each frame via `driverRef` — no React state per frame.
 * Joint → world mapping lives in `skeletonFk` (anatomical tennis conventions).
 */
export function BiomechanicalSkeleton({
  driverRef,
  anthropometrics,
  color,
  accent,
}: {
  driverRef: RefObject<SkeletonDriver>;
  anthropometrics: Anthropometrics;
  color: string;
  accent: string;
}) {
  const root = useRef<THREE.Group>(null);
  const racketGroup = useRef<THREE.Group>(null);
  const pose = useMemo(() => createSkeletonPose(), []);

  const meshes = useRef<{
    torso: MeshRef;
    neck: MeshRef;
    head: MeshRef;
    pelvis: MeshRef;
    chest: MeshRef;
    leadThigh: MeshRef;
    leadShank: MeshRef;
    trailThigh: MeshRef;
    trailShank: MeshRef;
    leadKnee: MeshRef;
    trailKnee: MeshRef;
    leadAnkle: MeshRef;
    trailAnkle: MeshRef;
    leadFoot: MeshRef;
    trailFoot: MeshRef;
    hitUpper: MeshRef;
    hitFore: MeshRef;
    nonHitUpper: MeshRef;
    nonHitFore: MeshRef;
    hitShoulder: MeshRef;
    hitElbow: MeshRef;
    hitWrist: MeshRef;
    nonHitShoulder: MeshRef;
    handle: MeshRef;
    throat: MeshRef;
    hoop: MeshRef;
    strings: MeshRef;
  }>({
    torso: null,
    neck: null,
    head: null,
    pelvis: null,
    chest: null,
    leadThigh: null,
    leadShank: null,
    trailThigh: null,
    trailShank: null,
    leadKnee: null,
    trailKnee: null,
    leadAnkle: null,
    trailAnkle: null,
    leadFoot: null,
    trailFoot: null,
    hitUpper: null,
    hitFore: null,
    nonHitUpper: null,
    nonHitFore: null,
    hitShoulder: null,
    hitElbow: null,
    hitWrist: null,
    nonHitShoulder: null,
    handle: null,
    throat: null,
    hoop: null,
    strings: null,
  });

  const skinMat = useMemo(
    () => new THREE.MeshLambertMaterial({ color }),
    [color],
  );
  const jointMat = useMemo(
    () => new THREE.MeshLambertMaterial({ color: accent }),
    [accent],
  );
  const darkMat = useMemo(
    () => new THREE.MeshLambertMaterial({ color: "#1a1a1a" }),
    [],
  );
  const handleMat = useMemo(
    () => new THREE.MeshLambertMaterial({ color: "#2c1810" }),
    [],
  );
  const throatMat = useMemo(
    () => new THREE.MeshLambertMaterial({ color: "#222222" }),
    [],
  );
  const stringMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#f5f5f0",
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [],
  );
  const hoopMat = useMemo(
    () =>
      new THREE.MeshLambertMaterial({
        color: accent,
        emissive: accent,
        emissiveIntensity: 0.12,
      }),
    [accent],
  );

  useLayoutEffect(() => {
    return () => {
      skinMat.dispose();
      jointMat.dispose();
      darkMat.dispose();
      handleMat.dispose();
      throatMat.dispose();
      stringMat.dispose();
      hoopMat.dispose();
    };
  }, [skinMat, jointMat, darkMat, handleMat, throatMat, stringMat, hoopMat]);

  useFrame((_, dt) => {
    const driver = driverRef.current;
    if (!driver || !root.current) return;

    solveSkeletonFk(
      pose,
      driver.joints,
      anthropometrics,
      driver.handedness,
      driver.oneHanded,
    );

    const m = meshes.current;
    const p = pose;

    placeLimb(m.torso, p.pelvis, p.chest, true);
    if (m.torso) m.torso.scale.set(0.08, m.torso.scale.y, 0.08);
    placeLimb(m.neck, p.chest, p.head, true);
    if (m.neck) m.neck.scale.set(0.04, m.neck.scale.y, 0.04);

    placeAt(m.head, p.head);
    if (m.head) m.head.scale.setScalar(0.11);
    placeAt(m.pelvis, p.pelvis);
    if (m.pelvis) m.pelvis.scale.setScalar(0.06);
    placeAt(m.chest, p.chest);
    if (m.chest) m.chest.scale.setScalar(0.055);

    placeLimb(m.leadThigh, p.leadHip, p.leadKnee, true);
    if (m.leadThigh) m.leadThigh.scale.set(0.055, m.leadThigh.scale.y, 0.055);
    placeLimb(m.leadShank, p.leadKnee, p.leadAnkle, true);
    if (m.leadShank) m.leadShank.scale.set(0.045, m.leadShank.scale.y, 0.045);
    placeLimb(m.trailThigh, p.trailHip, p.trailKnee, true);
    if (m.trailThigh) m.trailThigh.scale.set(0.055, m.trailThigh.scale.y, 0.055);
    placeLimb(m.trailShank, p.trailKnee, p.trailAnkle, true);
    if (m.trailShank) m.trailShank.scale.set(0.045, m.trailShank.scale.y, 0.045);

    placeAt(m.leadKnee, p.leadKnee);
    if (m.leadKnee) m.leadKnee.scale.setScalar(0.05);
    placeAt(m.trailKnee, p.trailKnee);
    if (m.trailKnee) m.trailKnee.scale.setScalar(0.05);
    placeAt(m.leadAnkle, p.leadAnkle);
    if (m.leadAnkle) m.leadAnkle.scale.setScalar(0.04);
    placeAt(m.trailAnkle, p.trailAnkle);
    if (m.trailAnkle) m.trailAnkle.scale.setScalar(0.04);

    if (m.leadFoot) {
      m.leadFoot.position.set(p.leadAnkle.x, 0.03, p.leadAnkle.z - 0.04);
      m.leadFoot.rotation.set(0, driver.joints.hipYaw * (Math.PI / 180) * (driver.handedness === "left" ? -1 : 1) * 0.5, 0);
    }
    if (m.trailFoot) {
      m.trailFoot.position.set(p.trailAnkle.x, 0.03, p.trailAnkle.z - 0.02);
      m.trailFoot.rotation.set(0, driver.joints.hipYaw * (Math.PI / 180) * (driver.handedness === "left" ? -1 : 1) * 0.35, 0);
    }

    placeLimb(m.hitUpper, p.hitShoulder, p.hitElbow, true);
    if (m.hitUpper) m.hitUpper.scale.set(0.042, m.hitUpper.scale.y, 0.042);
    placeLimb(m.hitFore, p.hitElbow, p.hitWrist, true);
    if (m.hitFore) m.hitFore.scale.set(0.038, m.hitFore.scale.y, 0.038);
    placeLimb(m.nonHitUpper, p.nonHitShoulder, p.nonHitElbow, true);
    if (m.nonHitUpper) m.nonHitUpper.scale.set(0.042, m.nonHitUpper.scale.y, 0.042);
    placeLimb(m.nonHitFore, p.nonHitElbow, p.nonHitWrist, true);
    if (m.nonHitFore) m.nonHitFore.scale.set(0.038, m.nonHitFore.scale.y, 0.038);

    placeAt(m.hitShoulder, p.hitShoulder);
    if (m.hitShoulder) m.hitShoulder.scale.setScalar(0.05);
    placeAt(m.hitElbow, p.hitElbow);
    if (m.hitElbow) m.hitElbow.scale.setScalar(0.045);
    placeAt(m.hitWrist, p.hitWrist);
    if (m.hitWrist) m.hitWrist.scale.setScalar(0.04);
    placeAt(m.nonHitShoulder, p.nonHitShoulder);
    if (m.nonHitShoulder) m.nonHitShoulder.scale.setScalar(0.05);

    if (racketGroup.current) {
      _dir.subVectors(p.racketTip, p.hitWrist);
      const len = Math.max(0.35, _dir.length());
      _mid.addVectors(p.hitWrist, p.racketTip).multiplyScalar(0.5);
      _quat.setFromUnitVectors(_yAxis, _dir.normalize());
      racketGroup.current.position.copy(_mid);
      racketGroup.current.quaternion.copy(_quat);

      if (m.handle) {
        m.handle.position.set(0, -len * 0.28, 0);
        m.handle.scale.set(1, len * 0.35, 1);
      }
      if (m.throat) {
        m.throat.position.set(0, -len * 0.05, 0);
        m.throat.scale.set(1, len * 0.2, 1);
      }
      if (m.hoop) m.hoop.position.set(0, len * 0.22, 0);
      if (m.strings) m.strings.position.set(0, len * 0.22, 0);

      const glow = Math.min(1, driver.racketSpeedMs / 40);
      hoopMat.emissiveIntensity = 0.08 + glow * 0.35;
    }

    if (driver.racketSpeedMs < 3) {
      root.current.position.y = 0.02 + Math.sin(performance.now() * 0.002) * 0.006;
    } else {
      root.current.position.y = THREE.MathUtils.damp(root.current.position.y, 0.02, 8, dt);
    }
  });

  const bind = (key: keyof typeof meshes.current) => (node: THREE.Mesh | null) => {
    meshes.current[key] = node;
  };

  return (
    <group ref={root} position={[0, 0.02, 0]}>
      <mesh ref={bind("torso")} geometry={geo.limb} material={skinMat} />
      <mesh ref={bind("neck")} geometry={geo.limb} material={skinMat} />
      <mesh ref={bind("head")} geometry={geo.head} material={skinMat} />
      <mesh ref={bind("pelvis")} geometry={geo.joint} material={jointMat} />
      <mesh ref={bind("chest")} geometry={geo.joint} material={jointMat} />

      <mesh ref={bind("leadThigh")} geometry={geo.limb} material={skinMat} />
      <mesh ref={bind("leadShank")} geometry={geo.limb} material={skinMat} />
      <mesh ref={bind("trailThigh")} geometry={geo.limb} material={skinMat} />
      <mesh ref={bind("trailShank")} geometry={geo.limb} material={skinMat} />
      <mesh ref={bind("leadKnee")} geometry={geo.joint} material={jointMat} />
      <mesh ref={bind("trailKnee")} geometry={geo.joint} material={jointMat} />
      <mesh ref={bind("leadAnkle")} geometry={geo.joint} material={skinMat} />
      <mesh ref={bind("trailAnkle")} geometry={geo.joint} material={skinMat} />
      <mesh ref={bind("leadFoot")} geometry={geo.foot} material={darkMat} />
      <mesh ref={bind("trailFoot")} geometry={geo.foot} material={darkMat} />

      <mesh ref={bind("hitUpper")} geometry={geo.limb} material={skinMat} />
      <mesh ref={bind("hitFore")} geometry={geo.limb} material={skinMat} />
      <mesh ref={bind("nonHitUpper")} geometry={geo.limb} material={skinMat} />
      <mesh ref={bind("nonHitFore")} geometry={geo.limb} material={skinMat} />
      <mesh ref={bind("hitShoulder")} geometry={geo.joint} material={jointMat} />
      <mesh ref={bind("hitElbow")} geometry={geo.joint} material={jointMat} />
      <mesh ref={bind("hitWrist")} geometry={geo.joint} material={jointMat} />
      <mesh ref={bind("nonHitShoulder")} geometry={geo.joint} material={jointMat} />

      <group ref={racketGroup}>
        <mesh ref={bind("handle")} geometry={geo.handle} material={handleMat} />
        <mesh ref={bind("throat")} geometry={geo.throat} material={throatMat} />
        <mesh ref={bind("hoop")} geometry={geo.hoop} material={hoopMat} />
        <mesh ref={bind("strings")} geometry={geo.strings} material={stringMat} />
      </group>
    </group>
  );
}
