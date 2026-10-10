import * as THREE from "three";
import type { Anthropometrics, StrokePhase, StrokeType } from "../../types/biomechanics";
import { MOTION_JOINTS, FOOT_Y, type MotionClip, type QuatTuple } from "./types";
import { clamp, deg, lerp, smoothstep, twoBoneIk, yawBasis } from "./math";
import { createSkeletonPose, type SkeletonPose } from "./pose";
import { extractLocalQuats } from "./solve";
import { segmentLens } from "./segments";

export type PlayerMotionId = "federer" | "nadal" | "djokovic" | "serena" | "alcaraz" | "sinner";

type ChainOverride = {
  elbow: [number, number, number];
  wrist: [number, number, number];
  hand?: [number, number, number];
  tip: [number, number, number];
  face?: [number, number, number];
};

type Anatomy = {
  t: number;
  phase: StrokePhase;
  rootX: number;
  rootZ: number;
  hipYaw: number;
  hipPitch: number;
  spineTwist: number;
  spineLean: number;
  leadKnee: number;
  trailKnee: number;
  leadPlant: [number, number];
  trailPlant: [number, number];
  trailLift: number;
  leadLift: number;
  hitFlex: number;
  hitAbd: number;
  hitIR: number;
  hitElbow: number;
  nonFlex: number;
  nonAbd: number;
  nonElbow: number;
  racketElev: number;
  racketFace: number;
  chain?: ChainOverride;
};

type PlayerMod = {
  sit: number;
  takeback: number;
  compact: number;
  ww: number;
  early: number;
  power: number;
  wide: number;
};

const MODS: Record<PlayerMotionId, PlayerMod> = {
  federer: { sit: 0.92, takeback: 0.88, compact: 1.08, ww: 0.85, early: 1.0, power: 0.9, wide: 0.92 },
  nadal: { sit: 1.12, takeback: 1.22, compact: 0.86, ww: 1.28, early: 0.94, power: 1.05, wide: 1.04 },
  djokovic: { sit: 1.06, takeback: 1.04, compact: 0.96, ww: 0.9, early: 1.02, power: 0.95, wide: 1.16 },
  serena: { sit: 0.98, takeback: 0.9, compact: 1.12, ww: 0.8, early: 1.06, power: 1.18, wide: 0.96 },
  alcaraz: { sit: 1.14, takeback: 1.12, compact: 0.9, ww: 1.18, early: 0.98, power: 1.1, wide: 1.02 },
  sinner: { sit: 0.9, takeback: 0.78, compact: 1.2, ww: 0.7, early: 1.16, power: 1.08, wide: 0.94 },
};

function armFromAnatomy(
  shoulder: THREE.Vector3,
  fwd: THREE.Vector3,
  right: THREE.Vector3,
  up: THREE.Vector3,
  side: 1 | -1,
  flexDeg: number,
  abdDeg: number,
  irDeg: number,
  elbowDeg: number,
  upper: number,
  fore: number,
  hand: number,
) {
  const upperDir = up.clone().negate();
  upperDir.applyAxisAngle(right, -deg(flexDeg));
  upperDir.applyAxisAngle(fwd, -deg(abdDeg) * side);
  const hinge = right.clone().multiplyScalar(side);
  hinge.addScaledVector(upperDir, -hinge.dot(upperDir));
  if (hinge.lengthSq() < 1e-8) hinge.copy(fwd);
  hinge.normalize();
  hinge.applyAxisAngle(upperDir, deg(irDeg) * side);

  const elbow = shoulder.clone().addScaledVector(upperDir, upper);
  const foreDir = upperDir.clone().applyAxisAngle(hinge, deg(elbowDeg));
  const wrist = elbow.clone().addScaledVector(foreDir, fore);
  const handPos = wrist.clone().addScaledVector(foreDir, hand);
  return { elbow, wrist, hand: handPos, upperDir, foreDir, hinge };
}

function constructPose(a: Anatomy, anthro: Anthropometrics, oneHanded: boolean, stroke: StrokeType): SkeletonPose {
  const L = segmentLens(anthro);
  const pose = createSkeletonPose();
  const fwd = new THREE.Vector3();
  const right = new THREE.Vector3();
  yawBasis(deg(a.hipYaw), fwd, right);
  const up = new THREE.Vector3(0, 1, 0);
  up.applyAxisAngle(right, -deg(a.hipPitch * 0.35 + a.spineLean * 0.15));
  up.normalize();

  const leadAnkle = new THREE.Vector3(a.leadPlant[0], FOOT_Y + a.leadLift, a.leadPlant[1]);
  const trailAnkle = new THREE.Vector3(a.trailPlant[0], FOOT_Y + a.trailLift, a.trailPlant[1]);

  const thigh = L.thigh;
  const shank = L.shank;
  const leadKneeOpen = deg(clamp(a.leadKnee, 8, 125));
  const trailKneeOpen = deg(clamp(a.trailKnee, 8, 125));
  const leadReach = Math.sqrt(
    Math.max(0.01, thigh * thigh + shank * shank - 2 * thigh * shank * Math.cos(Math.PI - leadKneeOpen)),
  );
  const trailReach = Math.sqrt(
    Math.max(0.01, thigh * thigh + shank * shank - 2 * thigh * shank * Math.cos(Math.PI - trailKneeOpen)),
  );

  const midX = (leadAnkle.x + trailAnkle.x) * 0.5;
  const midZ = (leadAnkle.z + trailAnkle.z) * 0.5;
  const hipOff = L.hipW / 2;
  const leadHipXZ = new THREE.Vector3(midX - right.x * hipOff + a.rootX * 0.15, 0, midZ - right.z * hipOff + a.rootZ);
  const trailHipXZ = new THREE.Vector3(midX + right.x * hipOff + a.rootX * 0.15, 0, midZ + right.z * hipOff + a.rootZ);

  const leadHoriz = Math.hypot(leadHipXZ.x - leadAnkle.x, leadHipXZ.z - leadAnkle.z);
  const trailHoriz = Math.hypot(trailHipXZ.x - trailAnkle.x, trailHipXZ.z - trailAnkle.z);
  const leadH = Math.sqrt(Math.max(0.04, leadReach * leadReach - leadHoriz * leadHoriz));
  const trailH = Math.sqrt(Math.max(0.04, trailReach * trailReach - trailHoriz * trailHoriz));
  const pelvisY = FOOT_Y + (leadH + trailH) * 0.5 * (1 - a.hipPitch / 280);

  pose.leadHip.set(leadHipXZ.x, pelvisY, leadHipXZ.z);
  pose.trailHip.set(trailHipXZ.x, pelvisY, trailHipXZ.z);
  pose.pelvis.set((pose.leadHip.x + pose.trailHip.x) * 0.5, pelvisY, (pose.leadHip.z + pose.trailHip.z) * 0.5);
  pose.leadAnkle.copy(leadAnkle);
  pose.trailAnkle.copy(trailAnkle);

  const leadPole = new THREE.Vector3(pose.leadHip.x - 0.14, pelvisY, pose.leadHip.z - 0.22);
  const trailPole = new THREE.Vector3(pose.trailHip.x + 0.14, pelvisY, pose.trailHip.z + 0.16);
  twoBoneIk(pose.leadHip, pose.leadAnkle, thigh, shank, leadPole, pose.leadKnee);
  twoBoneIk(pose.trailHip, pose.trailAnkle, thigh, shank, trailPole, pose.trailKnee);

  const twist = deg(a.spineTwist);
  const lean = deg(a.spineLean);
  const chestFwd = fwd.clone().applyAxisAngle(up, twist);
  const chestUp = up.clone().applyAxisAngle(right, -lean);
  pose.chest.copy(pose.pelvis).addScaledVector(chestUp, L.torso).addScaledVector(chestFwd, lean * 0.08);
  pose.head.copy(pose.chest).addScaledVector(chestUp, L.neck).addScaledVector(chestFwd, 0.03);

  const chestRight = new THREE.Vector3().crossVectors(chestFwd, chestUp).normalize();
  pose.hitShoulder.copy(pose.chest).addScaledVector(chestRight, L.shoulderW / 2).addScaledVector(chestUp, 0.04);
  pose.nonHitShoulder.copy(pose.chest).addScaledVector(chestRight, -L.shoulderW / 2).addScaledVector(chestUp, 0.04);

  const hit = armFromAnatomy(
    pose.hitShoulder,
    chestFwd,
    chestRight,
    chestUp,
    1,
    a.hitFlex,
    a.hitAbd,
    a.hitIR,
    a.hitElbow,
    L.upper,
    L.fore,
    L.hand,
  );
  pose.hitElbow.copy(hit.elbow);
  pose.hitWrist.copy(hit.wrist);
  pose.hitHand.copy(hit.hand);

  const racketDir = hit.foreDir.clone();
  const elevAxis = new THREE.Vector3().crossVectors(racketDir, chestUp);
  if (elevAxis.lengthSq() < 1e-8) elevAxis.copy(chestRight);
  elevAxis.normalize();
  racketDir.applyAxisAngle(elevAxis, deg(a.racketElev));
  pose.racketTip.copy(pose.hitHand).addScaledVector(racketDir, L.racket);

  const face = new THREE.Vector3().crossVectors(racketDir, chestRight).normalize();
  face.applyAxisAngle(racketDir, deg(a.racketFace));
  pose.racketFaceNormal.copy(face);

  if (a.chain) {
    pose.hitElbow.set(...a.chain.elbow);
    pose.hitWrist.set(...a.chain.wrist);
    if (a.chain.hand) pose.hitHand.set(...a.chain.hand);
    else {
      const d = new THREE.Vector3().subVectors(pose.hitWrist, pose.hitElbow).normalize();
      pose.hitHand.copy(pose.hitWrist).addScaledVector(d, L.hand);
    }
    pose.racketTip.set(...a.chain.tip);
    if (a.chain.face) pose.racketFaceNormal.set(...a.chain.face).normalize();
  }

  const non = armFromAnatomy(
    pose.nonHitShoulder,
    chestFwd,
    chestRight,
    chestUp,
    -1,
    a.nonFlex,
    a.nonAbd,
    0,
    a.nonElbow,
    L.upper,
    L.fore,
    L.hand,
  );
  pose.nonHitElbow.copy(non.elbow);
  pose.nonHitWrist.copy(non.wrist);
  pose.nonHitHand.copy(non.hand);

  if (!oneHanded && (stroke === "backhand" || stroke === "slice")) {
    pose.nonHitWrist.lerp(pose.hitWrist, 0.78);
    pose.nonHitHand.lerp(pose.hitHand, 0.7);
    const u = pose.nonHitWrist.clone().sub(pose.nonHitShoulder);
    if (u.length() > 0.08) {
      const mid = u.length() * 0.52;
      pose.nonHitElbow.copy(pose.nonHitShoulder).addScaledVector(u.normalize(), mid);
      pose.nonHitElbow.y += 0.04;
    }
  }

  pose.leadFootFwd.copy(fwd);
  pose.trailFootFwd.copy(fwd);
  pose.leadFootFwd.y = 0;
  pose.trailFootFwd.y = 0;
  pose.leadFootFwd.normalize();
  pose.trailFootFwd.normalize();
  pose.racketFaceRoll = 0;
  pose.hitUpperTwist = 0;
  pose.nonHitUpperTwist = 0;
  return pose;
}

const READY_CHAIN: ChainOverride = {
  elbow: [0.26, 1.14, -0.04],
  wrist: [0.28, 1.1, -0.2],
  tip: [0.26, 1.18, -0.55],
  face: [0.05, 0.15, -0.98],
};

function ready(partial: Partial<Anatomy> & { t: number; phase: StrokePhase }): Anatomy {
  return {
    rootX: 0,
    rootZ: 0,
    hipYaw: -12,
    hipPitch: 14,
    spineTwist: 0,
    spineLean: 6,
    leadKnee: 28,
    trailKnee: 28,
    leadPlant: [-0.16, 0.16],
    trailPlant: [0.2, -0.2],
    trailLift: 0,
    leadLift: 0,
    hitFlex: 48,
    hitAbd: 22,
    hitIR: 0,
    hitElbow: 52,
    nonFlex: 40,
    nonAbd: 28,
    nonElbow: 50,
    racketElev: 28,
    racketFace: 0,
    chain: READY_CHAIN,
    ...partial,
  };
}

function applyMod(list: Anatomy[], m: PlayerMod, stroke: StrokeType): Anatomy[] {
  return list.map((a) => {
    const take = stroke === "serve" ? 1 : m.takeback;
    return {
      ...a,
      hipPitch: a.hipPitch * m.sit,
      leadKnee: a.leadKnee * (0.65 + 0.35 * m.sit),
      trailKnee: a.trailKnee * (0.65 + 0.35 * m.sit),
      hitAbd: a.hitAbd * (stroke === "serve" ? 1 : lerp(1, take, 0.7)),
      hitFlex: a.hitFlex,
      leadPlant: [a.leadPlant[0] * m.wide, a.leadPlant[1]] as [number, number],
      trailPlant: [a.trailPlant[0] * m.wide, a.trailPlant[1]] as [number, number],
      spineTwist: a.spineTwist * (0.85 + 0.15 * m.power),
    };
  });
}

function offsetChain(c: ChainOverride, dx: number, dy: number, dz: number, s = 1): ChainOverride {
  const sh = (p: [number, number, number]): [number, number, number] => [
    p[0] * s + dx,
    p[1] * s + dy,
    p[2] * s + dz,
  ];
  return {
    elbow: sh(c.elbow),
    wrist: sh(c.wrist),
    hand: c.hand ? sh(c.hand) : undefined,
    tip: sh(c.tip),
    face: c.face,
  };
}

function forehandWaypoints(m: PlayerMod): Anatomy[] {
  const loop = 0.08 * m.takeback;
  const ww = 0.16 * m.ww;
  const early = 0.1 * (m.early - 1);
  return applyMod(
    [
      ready({ t: 0, phase: "ready" }),
      ready({
        t: 0.16,
        phase: "unitTurn",
        hipYaw: -42,
        hipPitch: 18,
        spineTwist: -28,
        leadKnee: 36,
        trailKnee: 42,
        hitFlex: 70,
        hitAbd: 48,
        hitIR: -18,
        hitElbow: 68,
        nonFlex: 70,
        nonAbd: 40,
        racketElev: 20,
        chain: {
          elbow: [0.32, 1.22, 0.12],
          wrist: [0.38, 1.18, 0.28],
          tip: [0.42, 1.28, 0.48],
          face: [0, 0, 1],
        },
      }),
      ready({
        t: 0.34,
        phase: "backswing",
        hipYaw: -50,
        hipPitch: 22,
        spineTwist: -38,
        leadKnee: 40,
        trailKnee: 50,
        hitFlex: 110,
        hitAbd: 58,
        hitIR: -35,
        hitElbow: 78,
        nonFlex: 85,
        racketElev: 55,
        chain: {
          elbow: [0.3, 1.32, 0.18],
          wrist: [0.28, 1.48 + loop, 0.22],
          tip: [0.22, 1.72 + loop, 0.18],
          face: [0.2, 0.1, 0.9],
        },
      }),
      ready({
        t: 0.52,
        phase: "acceleration",
        hipYaw: -18,
        hipPitch: 16,
        spineTwist: -8,
        leadKnee: 32,
        trailKnee: 30,
        hitFlex: 80,
        hitAbd: 40,
        hitIR: 10,
        hitElbow: 55,
        nonFlex: 50,
        racketElev: 10,
        chain: {
          elbow: [0.34, 1.18, -0.02],
          wrist: [0.42, 1.12, -0.18],
          tip: [0.38, 0.92, -0.22],
          face: [0.15, 0.2, -0.9],
        },
      }),
      ready({
        t: 0.68 + early,
        phase: "contact",
        hipYaw: 8,
        hipPitch: 10,
        spineTwist: 16,
        leadKnee: 24,
        trailKnee: 20,
        hitFlex: 85,
        hitAbd: 28,
        hitIR: 28,
        hitElbow: 28,
        nonFlex: 36,
        racketElev: 8,
        chain: {
          elbow: [0.36, 1.2, -0.22],
          wrist: [0.48, 1.12, -0.42],
          tip: [0.52, 1.14, -0.88],
          face: [0.1, 0.15, -0.98],
        },
      }),
      ready({
        t: 0.84,
        phase: "followThrough",
        hipYaw: 28,
        hipPitch: 12,
        spineTwist: 32,
        leadKnee: 28,
        trailKnee: 22,
        hitFlex: 130,
        hitAbd: -10,
        hitIR: 50,
        hitElbow: 55,
        nonFlex: 40,
        racketElev: 40,
        chain: {
          elbow: [0.08, 1.42, -0.18],
          wrist: [-0.12, 1.58 + ww, -0.12],
          tip: [-0.28, 1.85 + ww, 0.02],
          face: [-0.3, 0.4, -0.7],
        },
      }),
      ready({
        t: 1,
        phase: "recovery",
        hipYaw: -6,
        hitFlex: 50,
        hitAbd: 20,
        hitElbow: 50,
        chain: READY_CHAIN,
      }),
    ],
    m,
    "forehand",
  );
}

function backhandWaypoints(m: PlayerMod, oneHanded: boolean): Anatomy[] {
  const high = oneHanded ? 0.06 : 0.02;
  return applyMod(
    [
      ready({ t: 0, phase: "ready", hipYaw: 8 }),
      ready({
        t: 0.16,
        phase: "unitTurn",
        hipYaw: 38,
        hipPitch: 16,
        spineTwist: 26,
        leadKnee: 34,
        trailKnee: 40,
        hitFlex: 60,
        hitAbd: -30,
        hitElbow: 70,
        nonFlex: oneHanded ? 55 : 70,
        nonAbd: oneHanded ? 35 : 20,
        chain: {
          elbow: [-0.08, 1.2, 0.16],
          wrist: [-0.22, 1.16, 0.3],
          tip: [-0.32, 1.22, 0.5],
        },
      }),
      ready({
        t: 0.34,
        phase: "backswing",
        hipYaw: 48,
        hipPitch: 20,
        spineTwist: 36,
        leadKnee: 40,
        trailKnee: 48,
        hitFlex: 95,
        hitAbd: -42,
        hitIR: -20,
        hitElbow: 82,
        chain: {
          elbow: [-0.18, 1.3, 0.2],
          wrist: [-0.28, 1.42 + high, 0.28],
          tip: [-0.3, 1.68 + high, 0.22],
        },
      }),
      ready({
        t: 0.52,
        phase: "acceleration",
        hipYaw: 16,
        hipPitch: 14,
        spineTwist: 10,
        hitFlex: 70,
        hitAbd: -28,
        hitElbow: 48,
        chain: {
          elbow: [-0.16, 1.18, -0.02],
          wrist: [-0.28, 1.12, -0.2],
          tip: [-0.22, 0.95, -0.18],
        },
      }),
      ready({
        t: 0.68,
        phase: "contact",
        hipYaw: -6,
        hipPitch: 10,
        spineTwist: -12,
        leadKnee: 24,
        trailKnee: 22,
        hitFlex: 80,
        hitAbd: -18,
        hitIR: 18,
        hitElbow: 26,
        chain: {
          elbow: [-0.22, 1.18, -0.24],
          wrist: [-0.38, 1.08, -0.44],
          tip: [-0.5, 1.06, -0.86],
          face: [-0.1, 0.12, -0.98],
        },
      }),
      ready({
        t: 0.84,
        phase: "followThrough",
        hipYaw: -22,
        spineTwist: -24,
        hitFlex: oneHanded ? 140 : 115,
        hitAbd: 8,
        hitElbow: oneHanded ? 42 : 60,
        chain: {
          elbow: [0.12, 1.4, -0.16],
          wrist: [0.28, 1.52, -0.08],
          tip: [0.42, oneHanded ? 1.82 : 1.58, 0.06],
        },
      }),
      ready({
        t: 1,
        phase: "recovery",
        hipYaw: 4,
        chain: {
          elbow: [-0.08, 1.14, -0.04],
          wrist: [-0.14, 1.1, -0.2],
          tip: [-0.16, 1.16, -0.52],
        },
      }),
    ],
    m,
    "backhand",
  );
}

function serveWaypoints(m: PlayerMod): Anatomy[] {
  const sit = m.sit;
  return [
    ready({
      t: 0,
      phase: "ready",
      hipYaw: -72,
      hipPitch: 12,
      leadPlant: [-0.1, 0.22],
      trailPlant: [0.12, -0.28],
      hitFlex: 42,
      hitAbd: 18,
      hitElbow: 48,
      nonFlex: 55,
      racketElev: 20,
      chain: {
        elbow: [0.22, 1.12, 0.02],
        wrist: [0.2, 1.05, -0.18],
        tip: [0.16, 1.15, -0.55],
      },
    }),
    ready({
      t: 0.14,
      phase: "unitTurn",
      hipYaw: -82,
      hipPitch: 18 * sit,
      leadKnee: 40,
      trailKnee: 48,
      leadPlant: [-0.1, 0.22],
      trailPlant: [0.12, -0.28],
      nonFlex: 120,
      hitFlex: 80,
      hitAbd: 50,
      hitElbow: 70,
      chain: {
        elbow: [0.28, 1.28, 0.08],
        wrist: [0.26, 1.4, 0.02],
        tip: [0.22, 1.62, -0.08],
      },
    }),
    ready({
      t: 0.3,
      phase: "trophy",
      hipYaw: -88,
      hipPitch: 26 * sit,
      spineLean: -14,
      leadKnee: 72 * sit,
      trailKnee: 88 * sit,
      leadPlant: [-0.1, 0.22],
      trailPlant: [0.12, -0.28],
      nonFlex: 168,
      nonAbd: 18,
      nonElbow: 18,
      hitFlex: 150,
      hitAbd: 82,
      hitIR: -25,
      hitElbow: 92,
      racketElev: 70,
      chain: {
        elbow: [0.32, 1.52, 0.04],
        wrist: [0.3, 1.68, -0.02],
        tip: [0.22, 2.05, 0.02],
        face: [0.7, 0.1, 0.2],
      },
    }),
    ready({
      t: 0.44,
      phase: "backswing",
      hipYaw: -86,
      hipPitch: 30 * sit,
      spineLean: -10,
      leadKnee: 80 * sit,
      trailKnee: 96 * sit,
      leadPlant: [-0.1, 0.22],
      trailPlant: [0.12, -0.28],
      nonFlex: 150,
      hitFlex: 168,
      hitAbd: 95,
      hitIR: -88,
      hitElbow: 105,
      racketElev: -72,
      chain: {
        elbow: [0.3, 1.62, 0.1],
        wrist: [0.18, 1.28, 0.22],
        tip: [0.06, 0.72, 0.32],
        face: [0.2, 0.3, 0.9],
      },
    }),
    ready({
      t: 0.58,
      phase: "acceleration",
      hipYaw: -70,
      hipPitch: 10,
      leadKnee: 40,
      trailKnee: 32,
      trailLift: 0.06,
      leadPlant: [-0.08, 0.2],
      trailPlant: [0.1, -0.26],
      nonFlex: 80,
      hitFlex: 170,
      hitAbd: 48,
      hitIR: -20,
      hitElbow: 42,
      chain: {
        elbow: [0.2, 1.72, -0.02],
        wrist: [0.16, 2.02, -0.06],
        tip: [0.12, 2.35, -0.04],
      },
    }),
    ready({
      t: 0.7,
      phase: "contact",
      hipYaw: -48,
      hipPitch: 2,
      spineLean: 8,
      leadKnee: 18,
      trailKnee: 16,
      trailLift: 0.1,
      leadPlant: [-0.06, 0.18],
      trailPlant: [0.08, -0.22],
      nonFlex: 35,
      nonElbow: 70,
      hitFlex: 178,
      hitAbd: 12,
      hitIR: 25,
      hitElbow: 10,
      racketElev: 88,
      chain: {
        elbow: [0.12, 1.88, -0.04],
        wrist: [0.1, 2.22, -0.08],
        tip: [0.08, 2.78, -0.1],
        face: [0.15, 0.05, -0.98],
      },
    }),
    ready({
      t: 0.84,
      phase: "followThrough",
      hipYaw: -8,
      hipPitch: 14,
      leadKnee: 36,
      trailKnee: 28,
      trailLift: 0,
      nonFlex: 40,
      hitFlex: 130,
      hitAbd: -28,
      hitIR: 78,
      hitElbow: 48,
      chain: {
        elbow: [-0.08, 1.42, -0.16],
        wrist: [-0.28, 1.22, -0.12],
        tip: [-0.48, 0.95, 0.08],
        face: [-0.4, -0.2, -0.8],
      },
    }),
    ready({
      t: 1,
      phase: "recovery",
      hipYaw: -20,
      hipPitch: 16,
      leadKnee: 32,
      trailKnee: 30,
      hitFlex: 50,
      hitAbd: 18,
      hitElbow: 55,
      nonFlex: 42,
    }),
  ];
}

function sliceWaypoints(m: PlayerMod): Anatomy[] {
  return applyMod(
    [
      ready({ t: 0, phase: "ready", hipYaw: 6 }),
      ready({
        t: 0.2,
        phase: "unitTurn",
        hipYaw: 32,
        spineTwist: 20,
        hitFlex: 80,
        hitAbd: -24,
        hitElbow: 60,
        chain: {
          elbow: [-0.06, 1.32, 0.1],
          wrist: [-0.16, 1.4, 0.2],
          tip: [-0.18, 1.62, 0.28],
        },
      }),
      ready({
        t: 0.42,
        phase: "backswing",
        hipYaw: 40,
        hitFlex: 100,
        hitAbd: -30,
        racketElev: 40,
        chain: {
          elbow: [-0.12, 1.38, 0.16],
          wrist: [-0.2, 1.5, 0.24],
          tip: [-0.22, 1.78, 0.2],
        },
      }),
      ready({
        t: 0.66,
        phase: "contact",
        hipYaw: 4,
        hitFlex: 70,
        hitAbd: -16,
        hitElbow: 32,
        racketFace: 28,
        chain: {
          elbow: [-0.18, 1.12, -0.18],
          wrist: [-0.3, 0.98, -0.36],
          tip: [-0.4, 0.78, -0.62],
          face: [0.15, 0.55, -0.8],
        },
      }),
      ready({
        t: 0.84,
        phase: "followThrough",
        hipYaw: -10,
        hitFlex: 90,
        hitAbd: 6,
        chain: {
          elbow: [0.1, 1.05, -0.22],
          wrist: [0.22, 0.95, -0.28],
          tip: [0.32, 0.82, -0.18],
        },
      }),
      ready({
        t: 1,
        phase: "recovery",
        chain: {
          elbow: [-0.08, 1.12, -0.02],
          wrist: [-0.14, 1.06, -0.18],
          tip: [-0.16, 1.0, -0.42],
        },
      }),
    ],
    m,
    "slice",
  );
}

function volleyWaypoints(m: PlayerMod): Anatomy[] {
  return applyMod(
    [
      ready({
        t: 0,
        phase: "ready",
        hipYaw: -8,
        hipPitch: 18,
        leadKnee: 34,
        trailKnee: 34,
        hitFlex: 62,
        hitAbd: 28,
        hitElbow: 62,
        chain: {
          elbow: [0.26, 1.28, -0.08],
          wrist: [0.3, 1.32, -0.22],
          tip: [0.32, 1.4, -0.48],
        },
      }),
      ready({
        t: 0.22,
        phase: "unitTurn",
        hipYaw: -18,
        hitFlex: 70,
        hitAbd: 32,
        hitElbow: 68,
        chain: {
          elbow: [0.3, 1.3, 0.02],
          wrist: [0.34, 1.34, -0.08],
          tip: [0.36, 1.42, -0.28],
        },
      }),
      ready({
        t: 0.48,
        phase: "acceleration",
        hipYaw: -6,
        hitFlex: 75,
        hitAbd: 26,
        hitElbow: 40,
        chain: {
          elbow: [0.32, 1.28, -0.16],
          wrist: [0.38, 1.3, -0.32],
          tip: [0.4, 1.34, -0.58],
        },
      }),
      ready({
        t: 0.64,
        phase: "contact",
        hipYaw: 4,
        hitFlex: 78,
        hitAbd: 22,
        hitElbow: 28,
        chain: {
          elbow: [0.34, 1.3, -0.22],
          wrist: [0.42, 1.32, -0.42],
          tip: [0.46, 1.36, -0.72],
          face: [0.05, 0.1, -0.99],
        },
      }),
      ready({
        t: 0.84,
        phase: "followThrough",
        hipYaw: 8,
        hitFlex: 82,
        hitElbow: 32,
        chain: {
          elbow: [0.3, 1.32, -0.28],
          wrist: [0.36, 1.34, -0.48],
          tip: [0.38, 1.38, -0.7],
        },
      }),
      ready({
        t: 1,
        phase: "recovery",
        hitFlex: 62,
        hitElbow: 58,
        chain: {
          elbow: [0.26, 1.28, -0.08],
          wrist: [0.3, 1.32, -0.22],
          tip: [0.32, 1.4, -0.48],
        },
      }),
    ],
    m,
    "volley",
  );
}

function waypointsFor(playerId: PlayerMotionId, stroke: StrokeType, oneHanded: boolean): Anatomy[] {
  const m = MODS[playerId];
  switch (stroke) {
    case "forehand":
      return forehandWaypoints(m);
    case "backhand":
      return backhandWaypoints(m, oneHanded);
    case "serve":
      return serveWaypoints(m);
    case "slice":
      return sliceWaypoints(m);
    case "volley":
      return volleyWaypoints(m);
  }
}

function lerpAnatomy(a: Anatomy, b: Anatomy, t: number): Anatomy {
  const s = smoothstep(t);
  const lerpPlant = (p: [number, number], q: [number, number]): [number, number] => [
    lerp(p[0], q[0], s),
    lerp(p[1], q[1], s),
  ];
  const L3 = (p: [number, number, number], q: [number, number, number]): [number, number, number] => [
    lerp(p[0], q[0], s),
    lerp(p[1], q[1], s),
    lerp(p[2], q[2], s),
  ];
  const ca = a.chain ?? READY_CHAIN;
  const cb = b.chain ?? READY_CHAIN;
  const chain: ChainOverride = {
    elbow: L3(ca.elbow, cb.elbow),
    wrist: L3(ca.wrist, cb.wrist),
    tip: L3(ca.tip, cb.tip),
    hand: ca.hand && cb.hand ? L3(ca.hand, cb.hand) : ca.hand ?? cb.hand,
    face: ca.face && cb.face ? L3(ca.face, cb.face) : ca.face ?? cb.face,
  };
  return {
    t: lerp(a.t, b.t, s),
    phase: s < 0.5 ? a.phase : b.phase,
    rootX: lerp(a.rootX, b.rootX, s),
    rootZ: lerp(a.rootZ, b.rootZ, s),
    hipYaw: lerp(a.hipYaw, b.hipYaw, s),
    hipPitch: lerp(a.hipPitch, b.hipPitch, s),
    spineTwist: lerp(a.spineTwist, b.spineTwist, s),
    spineLean: lerp(a.spineLean, b.spineLean, s),
    leadKnee: lerp(a.leadKnee, b.leadKnee, s),
    trailKnee: lerp(a.trailKnee, b.trailKnee, s),
    leadPlant: lerpPlant(a.leadPlant, b.leadPlant),
    trailPlant: lerpPlant(a.trailPlant, b.trailPlant),
    trailLift: lerp(a.trailLift, b.trailLift, s),
    leadLift: lerp(a.leadLift, b.leadLift, s),
    hitFlex: lerp(a.hitFlex, b.hitFlex, s),
    hitAbd: lerp(a.hitAbd, b.hitAbd, s),
    hitIR: lerp(a.hitIR, b.hitIR, s),
    hitElbow: lerp(a.hitElbow, b.hitElbow, s),
    nonFlex: lerp(a.nonFlex, b.nonFlex, s),
    nonAbd: lerp(a.nonAbd, b.nonAbd, s),
    nonElbow: lerp(a.nonElbow, b.nonElbow, s),
    racketElev: lerp(a.racketElev, b.racketElev, s),
    racketFace: lerp(a.racketFace, b.racketFace, s),
    chain,
  };
}

const REF_ANTHRO: Anthropometrics = {
  heightM: 1.85,
  wingspanM: 1.9,
  massKg: 80,
  torsoRatio: 0.3,
  upperArmRatio: 0.186,
  forearmRatio: 0.146,
  thighRatio: 0.245,
  shankRatio: 0.246,
};

function sampleAnatomy(list: Anatomy[], t: number): Anatomy {
  const x = clamp(t, 0, 1);
  if (x <= list[0].t) return list[0];
  if (x >= list[list.length - 1].t) return list[list.length - 1];
  let i = 0;
  while (i < list.length - 1 && list[i + 1].t < x) i++;
  const a = list[i];
  const b = list[i + 1];
  const span = b.t - a.t || 1;
  return lerpAnatomy(a, b, (x - a.t) / span);
}

export function authorClip(
  playerId: PlayerMotionId,
  stroke: StrokeType,
  oneHanded: boolean,
  frames = 96,
  anthro: Anthropometrics = REF_ANTHRO,
): MotionClip {
  const wps = waypointsFor(playerId, stroke, oneHanded);
  const root: number[] = [];
  const quats: number[] = [];
  let prev: Record<string, QuatTuple> | null = null;

  for (let i = 0; i < frames; i++) {
    const t = i / (frames - 1);
    const anatomy = sampleAnatomy(wps, t);
    const pose = constructPose(anatomy, anthro, oneHanded, stroke);
    const local = extractLocalQuats(pose);
    if (prev) {
      for (const id of MOTION_JOINTS) {
        const a = prev[id];
        const b = local[id];
        if (a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3] < 0) {
          local[id] = [-b[0], -b[1], -b[2], -b[3]];
        }
      }
    }
    prev = local;
    root.push(pose.pelvis.x, pose.pelvis.y, pose.pelvis.z);
    for (const id of MOTION_JOINTS) {
      const q = local[id];
      quats.push(q[0], q[1], q[2], q[3]);
    }
  }

  return {
    id: `${playerId}/${stroke}`,
    playerId,
    stroke,
    oneHanded,
    authoredHand: "right",
    frameCount: frames,
    root,
    quats,
    phases: wps.map((w) => ({ phase: w.phase, t: w.t })),
  };
}

export const PLAYER_IDS: PlayerMotionId[] = [
  "federer",
  "nadal",
  "djokovic",
  "serena",
  "alcaraz",
  "sinner",
];

export const STROKE_TYPES: StrokeType[] = ["forehand", "backhand", "serve", "slice", "volley"];

export function authorAllClips(frames = 96): MotionClip[] {
  const oneHanded = (id: PlayerMotionId, stroke: StrokeType) =>
    stroke === "backhand" ? id === "federer" : true;
  const clips: MotionClip[] = [];
  for (const id of PLAYER_IDS) {
    for (const stroke of STROKE_TYPES) {
      clips.push(authorClip(id, stroke, oneHanded(id, stroke), frames));
    }
  }
  return clips;
}

export { offsetChain };
