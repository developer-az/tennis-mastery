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
 * CapsuleGeometry(1,1) has total height ≈ 3 (cyl 1 + caps 2).
 * Scale XZ for radius and Y so the full capsule spans `length`.
 */
function placeCapsule(
  mesh: THREE.Mesh | null,
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  twistRad = 0,
) {
  if (!mesh) return;
  _dir.subVectors(end, start);
  const length = Math.max(0.06, _dir.length());
  _mid.addVectors(start, end).multiplyScalar(0.5);
  mesh.position.copy(_mid);
  if (length > 1e-6) {
    _quat.setFromUnitVectors(_yAxis, _dir.normalize());
    if (Math.abs(twistRad) > 1e-4) {
      _rollQ.setFromAxisAngle(_yAxis, twistRad);
      _quat.multiply(_rollQ);
    }
    mesh.quaternion.copy(_quat);
  }
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
    nonHitElbow: MeshRef;
    nonHitWrist: MeshRef;
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
    nonHitElbow: null,
    nonHitWrist: null,
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

    placeCapsule(m.torso, p.pelvis, p.chest, 0.07);
    placeCapsule(m.neck, p.chest, p.head, 0.035);

    placeAt(m.head, p.head);
    if (m.head) m.head.scale.setScalar(0.11);
    placeAt(m.pelvis, p.pelvis);
    if (m.pelvis) m.pelvis.scale.setScalar(0.065);
    placeAt(m.chest, p.chest);
    if (m.chest) m.chest.scale.setScalar(0.058);

    placeCapsule(m.leadThigh, p.leadHip, p.leadKnee, 0.052);
    placeCapsule(m.leadShank, p.leadKnee, p.leadAnkle, 0.042);
    placeCapsule(m.trailThigh, p.trailHip, p.trailKnee, 0.052);
    placeCapsule(m.trailShank, p.trailKnee, p.trailAnkle, 0.042);

    placeAt(m.leadKnee, p.leadKnee);
    if (m.leadKnee) m.leadKnee.scale.setScalar(0.048);
    placeAt(m.trailKnee, p.trailKnee);
    if (m.trailKnee) m.trailKnee.scale.setScalar(0.048);
    placeAt(m.leadAnkle, p.leadAnkle);
    if (m.leadAnkle) m.leadAnkle.scale.setScalar(0.038);
    placeAt(m.trailAnkle, p.trailAnkle);
    if (m.trailAnkle) m.trailAnkle.scale.setScalar(0.038);

    if (m.leadFoot) {
      m.leadFoot.position.set(p.leadAnkle.x, 0.03, p.leadAnkle.z - 0.04);
      m.leadFoot.rotation.set(0, driver.joints.hipYaw * (Math.PI / 180) * (driver.handedness === "left" ? -1 : 1) * 0.5, 0);
    }
    if (m.trailFoot) {
      m.trailFoot.position.set(p.trailAnkle.x, 0.03, p.trailAnkle.z - 0.02);
      m.trailFoot.rotation.set(0, driver.joints.hipYaw * (Math.PI / 180) * (driver.handedness === "left" ? -1 : 1) * 0.35, 0);
    }

    // Arms: twist mesh with humeral IR so takeback/pronation reads on the limb, not only the tip
    placeCapsule(m.hitUpper, p.hitShoulder, p.hitElbow, 0.04, p.hitUpperTwist);
    placeCapsule(m.hitFore, p.hitElbow, p.hitWrist, 0.034, p.hitUpperTwist * 0.55);
    placeCapsule(m.nonHitUpper, p.nonHitShoulder, p.nonHitElbow, 0.04, p.nonHitUpperTwist);
    placeCapsule(m.nonHitFore, p.nonHitElbow, p.nonHitWrist, 0.034, p.nonHitUpperTwist * 0.45);

    placeAt(m.hitShoulder, p.hitShoulder);
    if (m.hitShoulder) m.hitShoulder.scale.setScalar(0.048);
    placeAt(m.hitElbow, p.hitElbow);
    if (m.hitElbow) m.hitElbow.scale.setScalar(0.042);
    placeAt(m.hitWrist, p.hitWrist);
    if (m.hitWrist) m.hitWrist.scale.setScalar(0.036);
    placeAt(m.nonHitShoulder, p.nonHitShoulder);
    if (m.nonHitShoulder) m.nonHitShoulder.scale.setScalar(0.048);
    placeAt(m.nonHitElbow, p.nonHitElbow);
    if (m.nonHitElbow) m.nonHitElbow.scale.setScalar(0.04);
    placeAt(m.nonHitWrist, p.nonHitWrist);
    if (m.nonHitWrist) m.nonHitWrist.scale.setScalar(0.034);

    if (racketGroup.current) {
      // Minimum-twist shaft tracking + sign-stable face normal.
      // Avoids setFromUnitVectors pole flips and FK face-hemisphere chatter.
      _dir.subVectors(p.racketTip, p.hitWrist);
      const len = Math.max(0.35, _dir.length());
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
        // Large shaft jump (loop / scrub): re-seed instead of twisting through a singularity
        if (align < -0.5 && _prevY.distanceTo(_dir) > 1.2) {
          _quat.setFromUnitVectors(_yAxis, _dir);
          prevFace.current.copy(p.racketFaceNormal);
        } else if (align < -0.999) {
          _xAxis.set(Math.abs(_prevY.x) < 0.9 ? 1 : 0, 0, Math.abs(_prevY.x) < 0.9 ? 0 : 1);
          _zAxis.crossVectors(_prevY, _xAxis).normalize();
          _swing.setFromAxisAngle(_zAxis, Math.PI);
          _quat.copy(_swing).multiply(prevRacketQuat.current);
        } else if (align > 0.9999) {
          _quat.copy(prevRacketQuat.current);
        } else {
          _swing.setFromUnitVectors(_prevY, _dir);
          _quat.copy(_swing).multiply(prevRacketQuat.current);
        }
      }

      // Desired face: continuous roll scalar preferred; FK normal as direction hint
      _faceStable.copy(p.racketFaceNormal);
      _faceStable.addScaledVector(_dir, -_faceStable.dot(_dir));
      if (_faceStable.lengthSq() < 1e-6) {
        _zAxis.set(0, 0, 1).applyQuaternion(_quat);
        _zAxis.addScaledVector(_dir, -_zAxis.dot(_dir));
        if (_zAxis.lengthSq() < 1e-8) _zAxis.set(1, 0, 0);
        else _zAxis.normalize();
        _faceStable.copy(_zAxis);
        _rollQ.setFromAxisAngle(_dir, p.racketFaceRoll);
        _faceStable.applyQuaternion(_rollQ);
        _faceStable.addScaledVector(_dir, -_faceStable.dot(_dir));
      }
      _faceStable.normalize();
      // Temporal hemisphere lock (hysteresis): only flip when clearly opposite prev face
      if (_faceStable.dot(prevFace.current) < -0.05) _faceStable.negate();
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

      _mid.addVectors(p.hitWrist, p.racketTip).multiplyScalar(0.5);
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
