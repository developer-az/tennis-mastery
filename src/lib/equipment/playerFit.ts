import type { RacketProfile } from "@/types/equipment";

export type SkillBand = "Beginner-friendly" | "Intermediate" | "Advanced" | "Tour / expert";
export type CourtRole =
  | "Heavy-spin baseliner"
  | "Shape baseliner"
  | "Precision baseliner"
  | "Counterpuncher"
  | "First-strike power"
  | "Serve & volley"
  | "Net-transition all-courter"
  | "Balanced all-courter";
export type WeightClass = "Light" | "Midweight" | "Heavy";
export type HeadFeel = "Precision mid" | "Midplus sweet spot" | "Forgiving oversize";
export type FeelAxis = "Power-oriented" | "Control-oriented" | "Spin-oriented" | "Balanced";

export interface PlayerFit {
  skill: SkillBand;
  courtRole: CourtRole;
  weightClass: WeightClass;
  headFeel: HeadFeel;
  feelAxis: FeelAxis;
  /** Short coaching line derived from scores + specs */
  blurb: string;
}

export interface FitBadge {
  key: string;
  label: string;
  /** CSS color token or hex matching Strokeform palette */
  color: string;
  hint: string;
}

function weightClassOf(r: RacketProfile): WeightClass {
  const w = r.weightG ?? 300;
  if (w < 295) return "Light";
  if (w >= 315) return "Heavy";
  return "Midweight";
}

function headFeelOf(r: RacketProfile): HeadFeel {
  const hs = r.headSizeSqIn ?? 100;
  if (hs < 98) return "Precision mid";
  if (hs > 100) return "Forgiving oversize";
  return "Midplus sweet spot";
}

function feelAxisOf(r: RacketProfile): FeelAxis {
  const { power, control, spin } = r;
  const max = Math.max(power, control, spin);
  const spread = max - Math.min(power, control, spin);
  if (spread <= 8) return "Balanced";
  if (max === spin && spin >= power - 2 && spin >= control - 2) return "Spin-oriented";
  if (max === control && control >= power + 4) return "Control-oriented";
  if (max === power && power >= control + 4) return "Power-oriented";
  if (max === spin) return "Spin-oriented";
  if (max === control) return "Control-oriented";
  if (max === power) return "Power-oriented";
  return "Balanced";
}

function skillOf(r: RacketProfile): SkillBand {
  const w = r.weightG ?? 300;
  const hs = r.headSizeSqIn ?? 100;
  const dense =
    r.stringPattern != null &&
    (/18x20|18×20|16x20|18x19/i.test(r.stringPattern) ||
      (() => {
        const parts = r.stringPattern!.toLowerCase().replace(/\s/g, "").split("x");
        return (parseInt(parts[0], 10) || 16) >= 18;
      })());

  if ((w >= 315 || dense) && (hs <= 98 || r.control >= 78) && r.power <= 72) {
    return "Tour / expert";
  }
  if (hs >= 102 && r.power >= 68 && (w < 300 || r.comfort >= 70)) {
    return "Beginner-friendly";
  }
  if (r.control >= 72 && hs <= 100 && w >= 300) {
    return "Advanced";
  }
  return "Intermediate";
}

/**
 * Court role from style tags first, then score dominance.
 * Avoid defaulting everything to a vague "All-court".
 */
function courtRoleOf(r: RacketProfile): CourtRole {
  const style = (r.style ?? "").toLowerCase();
  const { power, spin, control } = r;
  const path = r.idealSwingPathDeg ?? 20;
  const launch = r.idealLaunchAngleDeg ?? 8;

  if (/serve|volley|net/.test(style)) return "Serve & volley";
  if (/heavy-?spin/.test(style) || (spin >= 82 && path >= 26 && power >= 58)) {
    return "Heavy-spin baseliner";
  }
  if (/\brpms\b|modern shape/.test(style) || (spin >= 72 && spin >= control + 4 && path >= 22)) {
    return spin >= 80 && path >= 28 ? "Heavy-spin baseliner" : "Shape baseliner";
  }
  if (/\bbaseliner\b/.test(style) && spin >= 68) {
    return spin >= 78 ? "Heavy-spin baseliner" : "Shape baseliner";
  }
  if (/precision|player.?s? frame|control-forward/.test(style) || (control >= 76 && power <= 66)) {
    return path <= 18 ? "Precision baseliner" : control >= 80 && spin <= 70 ? "Counterpuncher" : "Precision baseliner";
  }
  if (/power|easy depth|forgiving/.test(style) || (power >= 74 && control <= 60)) {
    return "First-strike power";
  }

  // Score-led (need a clear winner — avoid vague all-court)
  if (spin >= 80 && spin >= control + 8 && path >= 24) {
    return "Heavy-spin baseliner";
  }
  if (spin >= 70 && spin >= control + 4 && spin >= power - 4) {
    return "Shape baseliner";
  }
  if (control >= 74 && control >= power + 8) {
    return spin <= 62 && power <= 64 ? "Serve & volley" : "Precision baseliner";
  }
  if (power >= 74 && power >= control + 8) {
    return "First-strike power";
  }
  if (control >= 70 && spin <= 66 && power <= 66) {
    return "Counterpuncher";
  }
  if (spin >= 66 && control >= 66 && Math.abs(spin - control) <= 8) {
    return "Shape baseliner";
  }

  const spread = Math.max(power, spin, control) - Math.min(power, spin, control);
  if (spread <= 10 && launch >= 6 && launch <= 10 && path >= 16 && path <= 26) {
    return control >= 68 ? "Net-transition all-courter" : "Balanced all-courter";
  }
  if (control >= power && control >= spin) return "Precision baseliner";
  if (spin >= power) return "Shape baseliner";
  return "First-strike power";
}

function roleBlurb(role: CourtRole, r: RacketProfile): string {
  const launch = r.idealLaunchAngleDeg;
  const path = r.idealSwingPathDeg;
  const window =
    launch != null && path != null
      ? ` Teaching window ~${launch.toFixed(1)}° leave / ~${path.toFixed(0)}° path.`
      : "";
  switch (role) {
    case "Heavy-spin baseliner":
      return `Built to shape heavy topspin from the back — high spin axis and a steeper path through contact.${window}`;
    case "Shape baseliner":
      return `Baseline-first mold that wants shape and margin over the tape more than flat penetration.${window}`;
    case "Precision baseliner":
      return `Rewards clean timing and directional control; less free power, more accountability on contact.${window}`;
    case "Counterpuncher":
      return `Absorbs pace and redirects — control-forward with a compact, honest response.${window}`;
    case "First-strike power":
      return `Easy depth and pace on clean hits — watch launch if you open the face or soften the bed too far.${window}`;
    case "Serve & volley":
      return `Maneuverable, control-biased feel that favors first strike into the net and compact volleys.${window}`;
    case "Net-transition all-courter":
      return `Balanced enough to finish forward after a solid groundstroke — not a pure baseliner mold.${window}`;
    case "Balanced all-courter":
      return `No single score dominates — a flexible mold you tune with string, tension, and a few grams of tape.${window}`;
  }
}

export function derivePlayerFit(r: RacketProfile): PlayerFit {
  const skill = skillOf(r);
  const courtRole = courtRoleOf(r);
  const weightClass = weightClassOf(r);
  const headFeel = headFeelOf(r);
  const feelAxis = feelAxisOf(r);

  const blurb = `${skill} · ${courtRole}. ${feelAxis} with a ${headFeel.toLowerCase()} (${weightClass.toLowerCase()}). ${roleBlurb(courtRole, r)}`;

  return { skill, courtRole, weightClass, headFeel, feelAxis, blurb };
}

const SKILL_COLOR: Record<SkillBand, string> = {
  "Beginner-friendly": "#7dd3fc",
  Intermediate: "#c8f560",
  Advanced: "#f4a261",
  "Tour / expert": "#e9c46a",
};

const ROLE_COLOR: Record<CourtRole, string> = {
  "Heavy-spin baseliner": "#7dd3fc",
  "Shape baseliner": "#7dd3fc",
  "Precision baseliner": "#c8f560",
  Counterpuncher: "#f4a261",
  "First-strike power": "#f4a261",
  "Serve & volley": "#e9c46a",
  "Net-transition all-courter": "#c8f560",
  "Balanced all-courter": "#e8efe9",
};

const AXIS_COLOR: Record<FeelAxis, string> = {
  "Power-oriented": "#f4a261",
  "Control-oriented": "#c8f560",
  "Spin-oriented": "#7dd3fc",
  Balanced: "#e8efe9",
};

export function playerFitBadges(r: RacketProfile): FitBadge[] {
  const fit = derivePlayerFit(r);
  return [
    {
      key: "skill",
      label: fit.skill,
      color: SKILL_COLOR[fit.skill],
      hint: "Who the frame typically suits by mass, head size, and control/power balance.",
    },
    {
      key: "role",
      label: fit.courtRole,
      color: ROLE_COLOR[fit.courtRole],
      hint: "Court role from style tags, spin/power/control dominance, and launch/path teaching window.",
    },
    {
      key: "feel",
      label: fit.feelAxis,
      color: AXIS_COLOR[fit.feelAxis],
      hint: "Dominant performance axis from the frame's power / spin / control scores.",
    },
    {
      key: "weight",
      label: fit.weightClass,
      color: "rgba(232,239,233,0.85)",
      hint:
        fit.weightClass === "Light"
          ? "Under 295 g — easier to whip, less plow-through."
          : fit.weightClass === "Heavy"
            ? "315 g+ — more stability and plow-through, harder to accelerate."
            : "295–314 g — common modern midweight band.",
    },
    {
      key: "head",
      label: fit.headFeel,
      color: "rgba(200,245,96,0.85)",
      hint:
        fit.headFeel === "Precision mid"
          ? "Under 98\" — smaller sweet spot, sharper feedback."
          : fit.headFeel === "Forgiving oversize"
            ? 'Over 100" — larger sweet spot and higher launch.'
            : '98–100" midplus — modern drive sweet spot.',
    },
  ];
}
