import type {
  BodyConstraint,
  ConstraintSeverity,
  PlayerProfile,
} from "@/types/playerProfile";

export type ConstraintFlag = {
  id: string;
  severity: ConstraintSeverity | "block";
  title: string;
  detail: string;
};

export type RecommendationInput = {
  frameStiffness?: "soft" | "mid" | "stiff";
  /** Frame comfort score 0–100 when known */
  frameComfort?: number | null;
  tensionLbs?: number;
  stringMaterial?: string;
  fullPoly?: boolean;
  stringComfort?: number | null;
};

function activeConstraints(profile: PlayerProfile): BodyConstraint[] {
  return profile.constraints.filter((c) => c.active);
}

function hasArea(cs: BodyConstraint[], area: BodyConstraint["area"]): BodyConstraint | undefined {
  return cs.find((c) => c.area === area);
}

/**
 * Guardrails from stored constraints. Soft flags warn; hard/block should
 * stop silent recommendation until the player acknowledges risk.
 */
export function checkRecommendation(
  profile: PlayerProfile,
  input: RecommendationInput,
): ConstraintFlag[] {
  const cs = activeConstraints(profile);
  const flags: ConstraintFlag[] = [];
  const elbow = hasArea(cs, "elbow");
  const skin = hasArea(cs, "skin");
  const blisters = hasArea(cs, "blisters");
  const prefersArm = profile.preferences.prefersArmFriendly;

  if (
    (elbow || prefersArm) &&
    (input.frameStiffness === "stiff" ||
      (typeof input.frameComfort === "number" && input.frameComfort < 45))
  ) {
    flags.push({
      id: "stiff-frame-elbow",
      severity: elbow?.severity === "hard" ? "block" : "soft",
      title: "Stiff / low-comfort frame vs elbow constraint",
      detail:
        elbow?.detail ??
        "Your profile prioritizes arm-friendly frames. A stiff stick fights that — acknowledge risk before chasing power.",
    });
  }

  if (
    (elbow || prefersArm) &&
    input.fullPoly &&
    typeof input.tensionLbs === "number" &&
    input.tensionLbs >= 55
  ) {
    flags.push({
      id: "high-poly-elbow",
      severity: "hard",
      title: "High-tension full poly vs arm",
      detail: `Full poly at ${input.tensionLbs} lbs is a known arm risk for your profile. Soften tension, hybridize, or pick a more arm-friendly bed.`,
    });
  }

  if (
    (elbow || prefersArm) &&
    input.fullPoly &&
    typeof input.tensionLbs === "number" &&
    input.tensionLbs >= 52 &&
    input.tensionLbs < 55
  ) {
    flags.push({
      id: "mid-poly-caution",
      severity: "soft",
      title: "Poly tension near your arm edge",
      detail:
        "You're in a band where comfort can tip. Log body-check after the next session before going higher.",
    });
  }

  if (
    (skin || blisters) &&
    input.stringMaterial &&
    /rough|shaped|hex|5-sided/i.test(input.stringMaterial)
  ) {
    flags.push({
      id: "shaped-poly-skin",
      severity: "soft",
      title: "Shaped poly vs fragile / blister-prone hands",
      detail:
        "Shaped beds can chew overgrips and skin faster. Keep Tourna fresh and watch the blister log.",
    });
  }

  return flags;
}

export function armFriendlyNudge(profile: PlayerProfile): string | null {
  const elbow = activeConstraints(profile).find((c) => c.area === "elbow");
  if (!elbow && !profile.preferences.prefersArmFriendly) return null;
  return "Constraint active: prefer arm-friendly frames, moderate poly tension, and never stack stiff frame + high full poly.";
}

export function hasBlockingFlags(flags: ConstraintFlag[]): boolean {
  return flags.some((f) => f.severity === "block" || f.severity === "hard");
}

export function stiffnessFromComfort(comfort: number | null | undefined): "soft" | "mid" | "stiff" {
  if (comfort == null) return "mid";
  if (comfort >= 65) return "soft";
  if (comfort < 45) return "stiff";
  return "mid";
}
