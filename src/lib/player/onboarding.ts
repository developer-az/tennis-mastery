import type { BodyConstraint, PlayerProfile } from "@/types/playerProfile";
import type { ForehandGripKind } from "@/lib/equipment/forehandMold";
import { deriveForehandMold } from "@/lib/equipment/forehandMold";

export const WIZARD_STEPS = [
  "welcome",
  "name",
  "forehand",
  "backhand",
  "body",
  "prefs",
  "bag",
  "payoff",
] as const;

export type WizardStepId = (typeof WIZARD_STEPS)[number];

export const CONSTRAINT_TEMPLATES: Record<"elbow" | "skin" | "blisters", BodyConstraint> = {
  elbow: {
    id: "c-elbow",
    area: "elbow",
    label: "Elbow talks",
    detail: "Arm whispers when the bed is stiff or tip-heavy — prioritize comfort.",
    severity: "hard",
    active: true,
  },
  skin: {
    id: "c-skin",
    area: "skin",
    label: "Fragile skin",
    detail: "Avoid abrasive builds and blister-prone overgrip stacks.",
    severity: "hard",
    active: true,
  },
  blisters: {
    id: "c-blisters",
    area: "blisters",
    label: "Recurring blisters",
    detail: "Track grip build vs blister log — don’t change size and stack at once.",
    severity: "soft",
    active: true,
  },
};

export function gripPreviewLine(grip: ForehandGripKind | null): string | null {
  if (!grip) return null;
  const mold = deriveForehandMold({ playerGrip: grip });
  if (!mold) return null;
  return `${mold.face.label} · ~${mold.face.closedDeg}° closed · ${mold.prefersHeight}-high contact`;
}

export function profileLooksStarted(profile: PlayerProfile): boolean {
  return Boolean(
    profile.grips.forehand ||
      profile.displayName.trim() ||
      profile.sessions.length > 0 ||
      profile.decisions.length > 0,
  );
}

export function fhGripLabel(grip: ForehandGripKind): string {
  switch (grip) {
    case "eastern":
      return "Eastern";
    case "semi-western":
      return "Semi-western";
    case "western":
      return "Western";
    case "extreme-western":
      return "Extreme western";
  }
}
