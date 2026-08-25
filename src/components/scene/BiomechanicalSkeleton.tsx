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
const _swing = new THREE.Quaternion();
const _rollQ = new THREE.Quaternion();
const _yAxis = new THREE.Vector3(0, 1, 0);
const _prevY = new THREE.Vector3();
const _xAxis = new THREE.Vector3();
const _zAxis = new THREE.Vector3();
const _basis = new THREE.Matrix4();
const _faceStable = new THREE.Vector3(0, 0, -1);

function placeAt(mesh: THREE.Mesh | null, p: THREE.Vector3) {
  if (!mesh) return;
  mesh.position.copy(p);
}

/** Shared low-poly geometries — created once (capsules read more human than cylinders) */
const geo = {
  limb: new THREE.CapsuleGeometry(1, 1, 4, 8),
  joint: new THREE.SphereGeometry(1, 12, 12),
  head: new THREE.SphereGeometry(1, 14, 14),
  foot: new THREE.BoxGeometry(0.1, 0.05, 0.22),
  handle: new THREE.CylinderGeometry(0.018, 0.022, 1, 8),
  throat: new THREE.CylinderGeometry(0.012, 0.016, 1, 6),
  hoop: new THREE.TorusGeometry(0.14, 0.012, 6, 16),
  strings: new THREE.CircleGeometry(0.12, 16),
};

/**
 * Place a capsule between two joints. Small inset so limbs read as continuous
 * through the bend — joint spheres cover the meeting point.
 */
function placeCapsule(
  mesh: THREE.Mesh | null,
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  twistRad = 0,
  inset = 0.014,
) {
  if (!mesh) return;
  _dir.subVectors(end, start);
  const full = _dir.length();
  if (full < 1e-5) return;
  _dir.multiplyScalar(1 / full);
  const pad = Math.min(inset, full * 0.18);
  const length = Math.max(0.04, full - pad * 2);
  _mid.copy(start).addScaledVector(_dir, pad + length * 0.5);
  mesh.position.copy(_mid);
  _quat.setFromUnitVectors(_yAxis, _dir);
  if (Math.abs(twistRad) > 1e-4) {
    _rollQ.setFromAxisAngle(_yAxis, twistRad);
    _quat.multiply(_rollQ);
  }
  mesh.quaternion.copy(_quat);
  // CapsuleGeometry(1,1) total height ≈ 3 → scale Y by length/3
  mesh.scale.set(radius, length / 3, radius);
}

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
  /** Previous racket orientation — enables minimum-twist shaft tracking (no face chatter). */
  const prevRacketQuat = useRef(new THREE.Quaternion());
  const prevFace = useRef(new THREE.Vector3(0, 0, -1));
  const hasPrevRacket = useRef(false);

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
    leadHip: MeshRef;
    trailHip: MeshRef;
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
    hitHand: MeshRef;
    nonHitShoulder: MeshRef;
    nonHitElbow: MeshRef;
    nonHitWrist: MeshRef;
    nonHitHand: MeshRef;
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
    leadHip: null,
    trailHip: null,
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
    hitHand: null,
    nonHitShoulder: null,
    nonHitElbow: null,
    nonHitWrist: null,
    nonHitHand: null,
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

    placeCapsule(m.torso, p.pelvis, p.chest, 0.068, 0, 0.02);
    placeCapsule(m.neck, p.chest, p.head, 0.032, 0, 0.018);

    placeAt(m.head, p.head);
    if (m.head) m.head.scale.setScalar(0.105);
    placeAt(m.pelvis, p.pelvis);
    if (m.pelvis) m.pelvis.scale.setScalar(0.07);
    placeAt(m.chest, p.chest);
    if (m.chest) m.chest.scale.setScalar(0.06);

    // Legs: thigh→knee→shank meet inside joint spheres (human plantigrade chain)
    placeCapsule(m.leadThigh, p.leadHip, p.leadKnee, 0.05, 0, 0.012);
    placeCapsule(m.leadShank, p.leadKnee, p.leadAnkle, 0.04, 0, 0.012);
    placeCapsule(m.trailThigh, p.trailHip, p.trailKnee, 0.05, 0, 0.012);
    placeCapsule(m.trailShank, p.trailKnee, p.trailAnkle, 0.04, 0, 0.012);

    placeAt(m.leadHip, p.leadHip);
    if (m.leadHip) m.leadHip.scale.setScalar(0.052);
    placeAt(m.trailHip, p.trailHip);
    if (m.trailHip) m.trailHip.scale.setScalar(0.052);
    placeAt(m.leadKnee, p.leadKnee);
    if (m.leadKnee) m.leadKnee.scale.setScalar(0.054);
    placeAt(m.trailKnee, p.trailKnee);
    if (m.trailKnee) m.trailKnee.scale.setScalar(0.054);
    placeAt(m.leadAnkle, p.leadAnkle);
    if (m.leadAnkle) m.leadAnkle.scale.setScalar(0.04);
    placeAt(m.trailAnkle, p.trailAnkle);
    if (m.trailAnkle) m.trailAnkle.scale.setScalar(0.04);

    if (m.leadFoot) {
      // Toes along FK plantigrade stance forward
      _dir.copy(p.leadFootFwd);
      _dir.y = 0;
      if (_dir.lengthSq() < 1e-5) _dir.set(0, 0, -1);
      else _dir.normalize();
      m.leadFoot.position.set(
        p.leadAnkle.x + _dir.x * 0.06,
        0.022,
        p.leadAnkle.z + _dir.z * 0.06,
      );
      m.leadFoot.rotation.set(0, Math.atan2(_dir.x, _dir.z), 0);
      m.leadFoot.scale.set(0.85, 0.5, 1.55);
    }
    if (m.trailFoot) {
      _dir.copy(p.trailFootFwd);
      _dir.y = 0;
      if (_dir.lengthSq() < 1e-5) _dir.set(0, 0, -1);
      else _dir.normalize();
      m.trailFoot.position.set(
        p.trailAnkle.x + _dir.x * 0.05,
        0.022,
        p.trailAnkle.z + _dir.z * 0.05,
      );
      m.trailFoot.rotation.set(0, Math.atan2(_dir.x, _dir.z), 0);
      m.trailFoot.scale.set(0.8, 0.5, 1.45);
    }

    // Arms: continuous through elbow / wrist — joint spheres cover the fold
    placeCapsule(m.hitUpper, p.hitShoulder, p.hitElbow, 0.038, p.hitUpperTwist, 0.012);
    placeCapsule(m.hitFore, p.hitElbow, p.hitWrist, 0.032, p.hitUpperTwist * 0.55, 0.012);
    placeCapsule(m.hitHand, p.hitWrist, p.hitHand, 0.028, p.hitUpperTwist * 0.4, 0.008);
    placeCapsule(m.nonHitUpper, p.nonHitShoulder, p.nonHitElbow, 0.038, p.nonHitUpperTwist, 0.012);
    placeCapsule(m.nonHitFore, p.nonHitElbow, p.nonHitWrist, 0.032, p.nonHitUpperTwist * 0.45, 0.012);
    placeCapsule(m.nonHitHand, p.nonHitWrist, p.nonHitHand, 0.026, p.nonHitUpperTwist * 0.3, 0.008);

    placeAt(m.hitShoulder, p.hitShoulder);
    if (m.hitShoulder) m.hitShoulder.scale.setScalar(0.052);
    placeAt(m.hitElbow, p.hitElbow);
    if (m.hitElbow) m.hitElbow.scale.setScalar(0.048);
    placeAt(m.hitWrist, p.hitWrist);
    if (m.hitWrist) m.hitWrist.scale.setScalar(0.034);
    placeAt(m.nonHitShoulder, p.nonHitShoulder);
    if (m.nonHitShoulder) m.nonHitShoulder.scale.setScalar(0.05);
    placeAt(m.nonHitElbow, p.nonHitElbow);
    if (m.nonHitElbow) m.nonHitElbow.scale.setScalar(0.044);
    placeAt(m.nonHitWrist, p.nonHitWrist);
    if (m.nonHitWrist) m.nonHitWrist.scale.setScalar(0.032);

    if (racketGroup.current) {
      // Racket owned by the HAND — group origin = palm; local +Y toward tip
      _dir.subVectors(p.racketTip, p.hitHand);
      const len = Math.max(0.4, _dir.length());
      _dir.normalize();

      if (!hasPrevRacket.current) {
        _quat.setFromUnitVectors(_yAxis, _dir);
        hasPrevRacket.current = true;
        prevFace.current.copy(p.racketFaceNormal);
      } else {
        _prevY.set(0, 1, 0).applyQuaternion(prevRacketQuat.current);
        if (_prevY.lengthSq() < 1e-8) _prevY.copy(_yAxis);
        else _prevY.normalize();
        const align = _prevY.dot(_dir);
        // Prefer continuous tracking — only hard re-seed on near-180° flips
        if (align < -0.85) {
          _quat.setFromUnitVectors(_yAxis, _dir);
          prevFace.current.copy(p.racketFaceNormal);
        } else if (align > 0.9995) {
          _quat.copy(prevRacketQuat.current);
        } else {
          _swing.setFromUnitVectors(_prevY, _dir);
          _quat.copy(_swing).multiply(prevRacketQuat.current);
        }
      }

      _faceStable.copy(p.racketFaceNormal);
      _faceStable.addScaledVector(_dir, -_faceStable.dot(_dir));
      if (_faceStable.lengthSq() < 1e-6) {
        _zAxis.set(0, 0, 1).applyQuaternion(_quat);
        _zAxis.addScaledVector(_dir, -_zAxis.dot(_dir));
        if (_zAxis.lengthSq() < 1e-8) _zAxis.set(1, 0, 0);
        else _zAxis.normalize();
        _faceStable.copy(_zAxis);
      }
      _faceStable.normalize();
      // Stronger hysteresis so face doesn't chatter / teleport through the swing
      if (_faceStable.dot(prevFace.current) < -0.2) _faceStable.negate();
      // Soft blend toward previous face to kill frame-to-frame pops
      _faceStable.multiplyScalar(0.65).addScaledVector(prevFace.current, 0.35);
      _faceStable.addScaledVector(_dir, -_faceStable.dot(_dir));
      if (_faceStable.lengthSq() > 1e-8) _faceStable.normalize();
      else _faceStable.copy(prevFace.current);
      prevFace.current.copy(_faceStable);

      _xAxis.crossVectors(_dir, _faceStable);
      if (_xAxis.lengthSq() < 1e-8) {
        _xAxis.set(1, 0, 0).applyQuaternion(_quat);
        _xAxis.addScaledVector(_dir, -_xAxis.dot(_dir)).normalize();
      } else {
        _xAxis.normalize();
      }
      _faceStable.crossVectors(_xAxis, _dir).normalize();
      _basis.makeBasis(_xAxis, _dir, _faceStable);
      _quat.setFromRotationMatrix(_basis);
      if (_quat.dot(prevRacketQuat.current) < 0) {
        _quat.x *= -1;
        _quat.y *= -1;
        _quat.z *= -1;
        _quat.w *= -1;
      }
      prevRacketQuat.current.copy(_quat);

      // Palm at the butt — meshes sit along +Y toward the tip
      racketGroup.current.position.copy(p.hitHand);
      racketGroup.current.quaternion.copy(_quat);

      const handleLen = len * 0.3;
      const throatLen = len * 0.16;
      if (m.handle) {
        m.handle.position.set(0, handleLen * 0.5, 0);
        m.handle.scale.set(1, handleLen, 1);
      }
      if (m.throat) {
        m.throat.position.set(0, handleLen + throatLen * 0.5, 0);
        m.throat.scale.set(1, throatLen, 1);
      }
      const hoopY = handleLen + throatLen + len * 0.22;
      if (m.hoop) m.hoop.position.set(0, hoopY, 0);
      if (m.strings) m.strings.position.set(0, hoopY, 0);

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
      <mesh ref={bind("leadHip")} geometry={geo.joint} material={jointMat} />
      <mesh ref={bind("trailHip")} geometry={geo.joint} material={jointMat} />
      <mesh ref={bind("leadKnee")} geometry={geo.joint} material={jointMat} />
      <mesh ref={bind("trailKnee")} geometry={geo.joint} material={jointMat} />
      <mesh ref={bind("leadAnkle")} geometry={geo.joint} material={skinMat} />
      <mesh ref={bind("trailAnkle")} geometry={geo.joint} material={skinMat} />
      <mesh ref={bind("leadFoot")} geometry={geo.foot} material={darkMat} />
      <mesh ref={bind("trailFoot")} geometry={geo.foot} material={darkMat} />

      <mesh ref={bind("hitUpper")} geometry={geo.limb} material={skinMat} />
      <mesh ref={bind("hitFore")} geometry={geo.limb} material={skinMat} />
      <mesh ref={bind("hitHand")} geometry={geo.limb} material={skinMat} />
      <mesh ref={bind("nonHitUpper")} geometry={geo.limb} material={skinMat} />
      <mesh ref={bind("nonHitFore")} geometry={geo.limb} material={skinMat} />
      <mesh ref={bind("nonHitHand")} geometry={geo.limb} material={skinMat} />
      <mesh ref={bind("hitShoulder")} geometry={geo.joint} material={jointMat} />
      <mesh ref={bind("hitElbow")} geometry={geo.joint} material={jointMat} />
      <mesh ref={bind("hitWrist")} geometry={geo.joint} material={jointMat} />
      <mesh ref={bind("nonHitShoulder")} geometry={geo.joint} material={jointMat} />
      <mesh ref={bind("nonHitElbow")} geometry={geo.joint} material={jointMat} />
      <mesh ref={bind("nonHitWrist")} geometry={geo.joint} material={jointMat} />

      <group ref={racketGroup}>
        <mesh ref={bind("handle")} geometry={geo.handle} material={handleMat} />
        <mesh ref={bind("throat")} geometry={geo.throat} material={throatMat} />
        <mesh ref={bind("hoop")} geometry={geo.hoop} material={hoopMat} />
        <mesh ref={bind("strings")} geometry={geo.strings} material={stringMat} />
      </group>
    </group>
  );
}
