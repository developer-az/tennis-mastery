"use client";

import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Anthropometrics, JointAngles } from "@/types/biomechanics";
import { deg } from "@/lib/kinematics";

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
const _hipE = new THREE.Euler();
const _spineE = new THREE.Euler();
const _legE = new THREE.Euler();
const _hitArmE = new THREE.Euler();
const _forearmE = new THREE.Euler();
const _wristE = new THREE.Euler();
const _nonHitE = new THREE.Euler();
const _nonHitForeE = new THREE.Euler();
const _offset = new THREE.Vector3();
const _tmp = new THREE.Vector3();

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

  const H = anthropometrics.heightM;
  const torsoLen = H * anthropometrics.torsoRatio;
  const upperArm = H * anthropometrics.upperArmRatio;
  const forearm = H * anthropometrics.forearmRatio;
  const thigh = H * anthropometrics.thighRatio;
  const shank = H * anthropometrics.shankRatio;
  const hipWidth = 0.28;
  const shoulderWidth = 0.38;

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

  // Scratch vectors for FK (stable across frames)
  const pts = useMemo(
    () => ({
      pelvis: new THREE.Vector3(),
      chest: new THREE.Vector3(),
      head: new THREE.Vector3(),
      leadHip: new THREE.Vector3(),
      leadKnee: new THREE.Vector3(),
      leadAnkle: new THREE.Vector3(),
      trailHip: new THREE.Vector3(),
      trailKnee: new THREE.Vector3(),
      trailAnkle: new THREE.Vector3(),
      hitShoulder: new THREE.Vector3(),
      hitElbow: new THREE.Vector3(),
      hitWrist: new THREE.Vector3(),
      racketTip: new THREE.Vector3(),
      nonHitShoulder: new THREE.Vector3(),
      nonHitElbow: new THREE.Vector3(),
      nonHitWrist: new THREE.Vector3(),
    }),
    [],
  );

  useFrame((_, dt) => {
    const driver = driverRef.current;
    if (!driver || !root.current) return;

    const j = driver.joints;
    const mirror = driver.handedness === "left" ? -1 : 1;
    const oneHanded = driver.oneHanded;

    pts.pelvis.set(0, shank + thigh * 0.15, 0);

    _hipE.set(deg(j.hipPitch), deg(j.hipYaw * mirror), 0, "YXZ");
    _spineE.set(deg(j.spineLean), deg(j.spineTwist * mirror), 0, "YXZ");

    _offset.set(0, torsoLen, 0).applyEuler(_hipE).applyEuler(_spineE);
    pts.chest.copy(pts.pelvis).add(_offset);

    _offset.set(0, 0.28, 0).applyEuler(_spineE);
    pts.head.copy(pts.chest).add(_offset);

    pts.leadHip.copy(pts.pelvis).add(_tmp.set(-hipWidth * 0.5 * mirror, 0, 0.02));
    pts.trailHip.copy(pts.pelvis).add(_tmp.set(hipWidth * 0.5 * mirror, 0, -0.02));

    _legE.set(
      deg(j.leadHipFlexion),
      deg(j.hipYaw * mirror * 0.3),
      deg(-j.leadKneeFlexion * 0.15),
      "YXZ",
    );
    _offset.set(0, -thigh, 0.08).applyEuler(_legE);
    pts.leadKnee.copy(pts.leadHip).add(_offset);

    _legE.set(deg(j.leadKneeFlexion * 0.35 + j.ankleDorsiflexion * 0.2), 0, 0);
    _offset.set(0, -shank, 0).applyEuler(_legE);
    pts.leadAnkle.copy(pts.leadKnee).add(_offset);

    _legE.set(
      deg(j.trailHipFlexion),
      deg(j.hipYaw * mirror * 0.2),
      deg(j.trailKneeFlexion * 0.1),
      "YXZ",
    );
    _offset.set(0, -thigh, -0.05).applyEuler(_legE);
    pts.trailKnee.copy(pts.trailHip).add(_offset);

    _legE.set(deg(j.trailKneeFlexion * 0.35), 0, 0);
    _offset.set(0, -shank, 0).applyEuler(_legE);
    pts.trailAnkle.copy(pts.trailKnee).add(_offset);

    _offset.set(shoulderWidth * 0.5 * mirror, 0.05, 0).applyEuler(_spineE);
    pts.hitShoulder.copy(pts.chest).add(_offset);
    _offset.set(-shoulderWidth * 0.5 * mirror, 0.05, 0).applyEuler(_spineE);
    pts.nonHitShoulder.copy(pts.chest).add(_offset);

    // Hitting arm — abduction/IR push the arm across the hitting plane
    _hitArmE.set(
      deg(-j.shoulderFlexion),
      deg(j.shoulderAbduction * mirror * 0.35 + j.spineTwist * mirror * 0.15),
      deg(j.shoulderInternalRotation * mirror * 0.55 + j.shoulderAbduction * mirror * 0.35),
      "YXZ",
    );

    _offset.set(0, -upperArm * 0.12, upperArm * 0.88).applyEuler(_hitArmE).applyEuler(_spineE);
    pts.hitElbow.copy(pts.hitShoulder).add(_offset);

    // Forearm hinge; wrist lag applied separately to the racket
    _forearmE.set(
      deg(-j.elbowFlexion * 0.65),
      deg(mirror * 8),
      deg(j.shoulderInternalRotation * mirror * 0.12),
      "YXZ",
    );

    _offset
      .set(0, -forearm * 0.18, forearm * 0.82)
      .applyEuler(_forearmE)
      .applyEuler(_hitArmE)
      .applyEuler(_spineE);
    pts.hitWrist.copy(pts.hitElbow).add(_offset);

    // Wrist DOF on racket: lag (extension → tip behind), ulnar deviation, open/closed face
    _wristE.set(
      deg(-j.wristExtension * 0.9 - j.racketPathElevation * 0.15),
      deg(j.wristUlnarDeviation * 0.55 * mirror),
      deg(j.racketFaceAngle * 0.65 * mirror),
      "YXZ",
    );

    const tipLen = 0.58;
    _offset
      .set(
        j.racketFaceAngle * 0.002 * mirror,
        0.02 + j.racketPathElevation * 0.004,
        tipLen,
      )
      .applyEuler(_wristE)
      .applyEuler(_forearmE)
      .applyEuler(_hitArmE)
      .applyEuler(_spineE);
    pts.racketTip.copy(pts.hitWrist).add(_offset);

    _nonHitE.set(
      deg(-j.nonHittingShoulderFlexion),
      deg(-22 * mirror),
      deg(-12 * mirror),
      "YXZ",
    );
    _offset.set(0, -upperArm * 0.18, upperArm * 0.72).applyEuler(_nonHitE).applyEuler(_spineE);
    pts.nonHitElbow.copy(pts.nonHitShoulder).add(_offset);

    _nonHitForeE.set(deg(-j.nonHittingElbowFlexion * 0.5), 0, 0);
    _offset
      .set(0, -forearm * 0.22, forearm * 0.72)
      .applyEuler(_nonHitForeE)
      .applyEuler(_nonHitE)
      .applyEuler(_spineE);
    pts.nonHitWrist.copy(pts.nonHitElbow).add(_offset);

    if (!oneHanded) {
      pts.nonHitWrist.lerp(pts.hitWrist, 0.62);
      pts.nonHitElbow.lerp(pts.hitElbow, 0.4);
    }

    const m = meshes.current;
    placeLimb(m.torso, pts.pelvis, pts.chest, true);
    if (m.torso) m.torso.scale.set(0.08, m.torso.scale.y, 0.08);
    placeLimb(m.neck, pts.chest, pts.head, true);
    if (m.neck) m.neck.scale.set(0.04, m.neck.scale.y, 0.04);

    placeAt(m.head, pts.head);
    if (m.head) m.head.scale.setScalar(0.11);
    placeAt(m.pelvis, pts.pelvis);
    if (m.pelvis) m.pelvis.scale.setScalar(0.06);
    placeAt(m.chest, pts.chest);
    if (m.chest) m.chest.scale.setScalar(0.055);

    placeLimb(m.leadThigh, pts.leadHip, pts.leadKnee, true);
    if (m.leadThigh) m.leadThigh.scale.set(0.055, m.leadThigh.scale.y, 0.055);
    placeLimb(m.leadShank, pts.leadKnee, pts.leadAnkle, true);
    if (m.leadShank) m.leadShank.scale.set(0.045, m.leadShank.scale.y, 0.045);
    placeLimb(m.trailThigh, pts.trailHip, pts.trailKnee, true);
    if (m.trailThigh) m.trailThigh.scale.set(0.055, m.trailThigh.scale.y, 0.055);
    placeLimb(m.trailShank, pts.trailKnee, pts.trailAnkle, true);
    if (m.trailShank) m.trailShank.scale.set(0.045, m.trailShank.scale.y, 0.045);

    placeAt(m.leadKnee, pts.leadKnee);
    if (m.leadKnee) m.leadKnee.scale.setScalar(0.05);
    placeAt(m.trailKnee, pts.trailKnee);
    if (m.trailKnee) m.trailKnee.scale.setScalar(0.05);
    placeAt(m.leadAnkle, pts.leadAnkle);
    if (m.leadAnkle) m.leadAnkle.scale.setScalar(0.04);
    placeAt(m.trailAnkle, pts.trailAnkle);
    if (m.trailAnkle) m.trailAnkle.scale.setScalar(0.04);

    if (m.leadFoot) {
      m.leadFoot.position.set(pts.leadAnkle.x, 0.03, pts.leadAnkle.z + 0.06);
    }
    if (m.trailFoot) {
      m.trailFoot.position.set(pts.trailAnkle.x, 0.03, pts.trailAnkle.z + 0.06);
    }

    placeLimb(m.hitUpper, pts.hitShoulder, pts.hitElbow, true);
    if (m.hitUpper) m.hitUpper.scale.set(0.042, m.hitUpper.scale.y, 0.042);
    placeLimb(m.hitFore, pts.hitElbow, pts.hitWrist, true);
    if (m.hitFore) m.hitFore.scale.set(0.038, m.hitFore.scale.y, 0.038);
    placeLimb(m.nonHitUpper, pts.nonHitShoulder, pts.nonHitElbow, true);
    if (m.nonHitUpper) m.nonHitUpper.scale.set(0.042, m.nonHitUpper.scale.y, 0.042);
    placeLimb(m.nonHitFore, pts.nonHitElbow, pts.nonHitWrist, true);
    if (m.nonHitFore) m.nonHitFore.scale.set(0.038, m.nonHitFore.scale.y, 0.038);

    placeAt(m.hitShoulder, pts.hitShoulder);
    if (m.hitShoulder) m.hitShoulder.scale.setScalar(0.05);
    placeAt(m.hitElbow, pts.hitElbow);
    if (m.hitElbow) m.hitElbow.scale.setScalar(0.045);
    placeAt(m.hitWrist, pts.hitWrist);
    if (m.hitWrist) m.hitWrist.scale.setScalar(0.04);
    placeAt(m.nonHitShoulder, pts.nonHitShoulder);
    if (m.nonHitShoulder) m.nonHitShoulder.scale.setScalar(0.05);

    // Racket
    if (racketGroup.current) {
      _dir.subVectors(pts.racketTip, pts.hitWrist);
      const len = Math.max(0.35, _dir.length());
      _mid.addVectors(pts.hitWrist, pts.racketTip).multiplyScalar(0.5);
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

    // Idle breath only when nearly still (paused / ready)
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
