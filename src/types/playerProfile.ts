/**
 * Persistent player identity — grips, constraints, preferences, logs.
 * This is Strokeform's memory layer: who you are across sessions.
 */

import type { ForehandGripKind } from "@/lib/equipment/forehandMold";
import type { GripSizeCode } from "@/lib/equipment/gripSize";

export type BackhandGripKind =
  | "one-hand-eastern"
  | "one-hand-from-sw"
  | "two-hand-eastern"
  | "two-hand-semi";

export type ServeGripKind = "continental" | "eastern" | "semi-western";

export type BodyArea = "elbow" | "wrist" | "shoulder" | "hand" | "skin" | "blisters" | "back" | "other";

export type ConstraintSeverity = "soft" | "hard";

export interface BodyConstraint {
  id: string;
  area: BodyArea;
  label: string;
  detail: string;
  /** hard = block recommendations; soft = warn */
  severity: ConstraintSeverity;
  active: boolean;
}

export interface PlayerGrips {
  forehand: ForehandGripKind | null;
  /** Notes e.g. "one-hander off the back of SW" */
  backhand: BackhandGripKind | null;
  backhandNote: string;
  serve: ServeGripKind | null;
  slice: ServeGripKind | null;
  /** Target handle: L-size + stack description */
  targetSize: GripSizeCode | null;
  targetBuildNote: string;
}

export interface PlayerPreferences {
  generatesOwnPower: boolean;
  valuesDurability: boolean;
  likesDampener: boolean;
  prefersArmFriendly: boolean;
  notes: string;
}

export type LeverKind =
  | "tension"
  | "gauge"
  | "string"
  | "tip-tape"
  | "handle-tape"
  | "grip-layer"
  | "grip-size"
  | "frame"
  | "swing"
  | "other";

export type DecisionResult = "pending" | "confirmed" | "rejected" | "mixed" | "abandoned";

export interface DecisionEntry {
  id: string;
  createdAt: string;
  /** Snapshot label of setup after change */
  setupSummary: string;
  lever: LeverKind;
  changeSummary: string;
  reason: string;
  prediction: string;
  result: DecisionResult;
  resultNote: string;
  resolvedAt: string | null;
  /** Body read after the change — weighted above model predictions */
  bodyRead: string;
}

export type SessionFeel = "great" | "ok" | "pushy" | "flying" | "dumping" | "framing" | "other";

export interface SessionEntry {
  id: string;
  createdAt: string;
  setupSummary: string;
  racketSlug: string | null;
  stringId: string | null;
  tensionLbs: number | null;
  hoursOnBed: number;
  feltGood: string;
  brokeDown: string;
  bodyCheck: Partial<Record<BodyArea, "ok" | "whisper" | "pain" | "blister">>;
  overallFeel: SessionFeel;
  notes: string;
}

export interface StringBedHours {
  stringId: string;
  stringLabel: string;
  tensionLbs: number | null;
  hours: number;
  installedAt: string;
  lastPlayedAt: string;
}

export interface MatchedPair {
  id: string;
  label: string;
  frameASlug: string;
  frameBSlug: string;
  /** Shared string/tension/SW/grip targets */
  sharedStringId: string | null;
  sharedTensionLbs: number | null;
  sharedGaugeMm: number | null;
  sharedSwingweight: number | null;
  sharedGripBuild: string;
  notes: string;
}

export interface PendingLeverChange {
  problem: string;
  offeredLevers: { lever: LeverKind; action: string; why: string }[];
  chosenLever: LeverKind | null;
  lockedUntilLogged: boolean;
}

export interface PlayerProfile {
  displayName: string;
  grips: PlayerGrips;
  constraints: BodyConstraint[];
  preferences: PlayerPreferences;
  decisions: DecisionEntry[];
  sessions: SessionEntry[];
  stringBeds: StringBedHours[];
  matchedPairs: MatchedPair[];
  pendingLever: PendingLeverChange | null;
  /** Free-form evolving notes */
  bodyFeedbackNotes: string;
  updatedAt: string;
}

export function emptyProfile(): PlayerProfile {
  return {
    displayName: "",
    grips: {
      forehand: null,
      backhand: null,
      backhandNote: "",
      serve: null,
      slice: null,
      targetSize: null,
      targetBuildNote: "",
    },
    constraints: [],
    preferences: {
      generatesOwnPower: false,
      valuesDurability: false,
      likesDampener: false,
      prefersArmFriendly: false,
      notes: "",
    },
    decisions: [],
    sessions: [],
    stringBeds: [],
    matchedPairs: [],
    pendingLever: null,
    bodyFeedbackNotes: "",
    updatedAt: new Date().toISOString(),
  };
}

/** Optional starter aligned to a real coaching case — user can adopt or clear. */
export function exampleCoachingProfile(): PlayerProfile {
  const now = new Date().toISOString();
  return {
    displayName: "Player",
    grips: {
      forehand: "semi-western",
      backhand: "one-hand-from-sw",
      backhandNote: "One-hander off the back of the semi-western — face angle is grip-derived.",
      serve: "continental",
      slice: "continental",
      targetSize: "L3",
      targetBuildNote: "4 3/8 (L3) + Tourna over a sleeve — both frames match.",
    },
    constraints: [
      {
        id: "c-elbow",
        area: "elbow",
        label: "Elbow talks",
        detail: "Arm whispers when the bed is stiff or tip-heavy — prioritize comfort.",
        severity: "hard",
        active: true,
      },
      {
        id: "c-skin",
        area: "skin",
        label: "Fragile skin / Accutane",
        detail: "Avoid abrasive builds and blister-prone overgrip stacks.",
        severity: "hard",
        active: true,
      },
      {
        id: "c-blisters",
        area: "blisters",
        label: "Recurring blisters",
        detail: "Track grip build vs blister log — don’t change size and stack at once.",
        severity: "soft",
        active: true,
      },
    ],
    preferences: {
      generatesOwnPower: true,
      valuesDurability: true,
      likesDampener: true,
      prefersArmFriendly: true,
      notes: "I generate my own power. Value durability and reps. Dampener helps pocket feel.",
    },
    decisions: [],
    sessions: [],
    stringBeds: [],
    matchedPairs: [],
    pendingLever: null,
    bodyFeedbackNotes:
      "Framing on full backhands when late. Felt pushy at times. Balls flying around 50 lbs on poly.",
    updatedAt: now,
  };
}
