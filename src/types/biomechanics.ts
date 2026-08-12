/** Scientific biomechanics types for elite tennis stroke analysis */

export type StrokeType =
  | "forehand"
  | "backhand"
  | "serve"
  | "slice"
  | "volley";

export type StrokePhase =
  | "ready"
  | "unitTurn"
  | "backswing"
  | "trophy"
  | "acceleration"
  | "contact"
  | "followThrough"
  | "recovery";

export type GripType =
  | "eastern"
  | "semiWestern"
  | "western"
  | "continental"
  | "twoHanded";

/**
 * Stick-figure joint DOF (degrees). Mapped in `src/lib/skeletonFk.ts`.
 *
 * Frame (hipYaw = 0): +X right, +Y up, −Z toward net.
 * Lefty mirrors yaw / twist / abduction side / IR.
 *
 * hipYaw: − FH unit turn (hitting shoulder back), + BH turn
 * hipPitch: + athletic hinge / sit into legs (both hips)
 * spineTwist: shoulder–hip separation, same sign as coil
 * spineLean: + toward net, − arch (serve trophy)
 * shoulderFlexion: 0 hang, 90 forward, 180 up
 * shoulderAbduction: + FH side, − across body (BH wing)
 * shoulderInternalRotation: + IR/pronation, − ER (racket drop / takeback cocking)
 * wristExtension: + lag, − snap through contact
 * nonHittingShoulderAbduction: + away from body (counterbalance / toss)
 * nonHittingShoulderInternalRotation: lead-arm twist (point / balance)
 * racketFaceAngle: + open (slice), − closed
 * racketPathElevation: tip pitch from horizontal (+ up, − down/scratch-back)
 */
export interface JointAngles {
  hipYaw: number;
  hipPitch: number;
  spineTwist: number;
  spineLean: number;
  shoulderFlexion: number;
  shoulderAbduction: number;
  shoulderInternalRotation: number;
  elbowFlexion: number;
  wristExtension: number;
  wristUlnarDeviation: number;
  leadKneeFlexion: number;
  trailKneeFlexion: number;
  leadHipFlexion: number;
  trailHipFlexion: number;
  ankleDorsiflexion: number;
  nonHittingShoulderFlexion: number;
  nonHittingShoulderAbduction: number;
  nonHittingShoulderInternalRotation: number;
  nonHittingElbowFlexion: number;
  racketFaceAngle: number;
  racketPathElevation: number;
}

export interface PhaseKeyframe {
  phase: StrokePhase;
  /** Normalized 0–1 within the full stroke cycle */
  t: number;
  /** Duration of this phase in ms (mean ± from lab studies) */
  durationMs: number;
  joints: JointAngles;
  /** Instantaneous racket head speed m/s */
  racketSpeedMs: number;
  /** Ball spin rpm estimate at/after contact; 0 otherwise */
  spinRpm: number;
  coachingCue: string;
}

export interface KineticChainTiming {
  /** Order of peak angular velocity contributions */
  sequence: string[];
  /** Lag between proximal and distal peaks (ms) */
  proximalDistalLagMs: number;
  /** Hip–shoulder separation at max stretch (degrees) — “X-factor” */
  xFactorDeg: number;
  /** Peak ground reaction force estimate (N) */
  peakGrfN: number;
}

export interface ConsistencyProfile {
  /** Coefficient of variation for contact height (%) */
  contactHeightCv: number;
  /** Timing variability across trials (ms SD) */
  timingSdMs: number;
  /** Racket path reproducibility 0–100 */
  pathReproducibility: number;
  /** Signature quirk visible in form */
  signatureQuirk: string;
}

export interface StrokeMetrics {
  peakRacketSpeedMs: number;
  contactHeightM: number;
  contactDepthM: number;
  avgSpinRpm: number;
  launchAngleDeg: number;
  swingPathDeg: number;
  impactDurationMs: number;
  grip: GripType;
  kineticChain: KineticChainTiming;
  consistency: ConsistencyProfile;
  /** Peer-reviewed / lab-derived notes */
  researchNotes: string[];
  sources: string[];
}

export interface StrokeProfile {
  type: StrokeType;
  label: string;
  handedness: "right" | "left";
  oneHanded: boolean;
  metrics: StrokeMetrics;
  keyframes: PhaseKeyframe[];
}

export interface Anthropometrics {
  heightM: number;
  wingspanM: number;
  massKg: number;
  /** Segment length ratios relative to height */
  torsoRatio: number;
  upperArmRatio: number;
  forearmRatio: number;
  thighRatio: number;
  shankRatio: number;
}

export interface PlayerProfile {
  id: string;
  name: string;
  shortName: string;
  nationality: string;
  era: string;
  playingStyle: string;
  dominantHand: "right" | "left";
  backhandStyle: "oneHanded" | "twoHanded";
  color: string;
  accent: string;
  anthropometrics: Anthropometrics;
  strokes: Record<StrokeType, StrokeProfile>;
  biography: string;
}
