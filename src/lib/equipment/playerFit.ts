import type { RacketProfile } from "@/types/equipment";

export type SkillBand = "Beginner-friendly" | "Intermediate" | "Advanced" | "Tour / expert";
export type CourtRole = "Baseliner" | "All-court" | "Serve & volley" | "Counterpuncher" | "Power hitter";
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
  if (spread <= 10) return "Balanced";
  if (max === spin && spin >= power && spin >= control) return "Spin-oriented";
  if (max === control && control > power) return "Control-oriented";
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

  // Tour / expert: heavy, small head, dense pattern, high control
  if ((w >= 315 || dense) && (hs <= 98 || r.control >= 78) && r.power <= 72) {
    return "Tour / expert";
  }
  // Beginner-friendly: light, large head, high power, high comfort
  if (hs >= 102 && r.power >= 68 && (w < 300 || r.comfort >= 70)) {
    return "Beginner-friendly";
  }
  // Advanced: control-forward player frames
  if (r.control >= 72 && hs <= 100 && w >= 300) {
    return "Advanced";
  }
  return "Intermediate";
}

function courtRoleOf(r: RacketProfile): CourtRole {
  const style = r.style.toLowerCase();
  const { power, spin, control } = r;

  if (/serve|volley|net/.test(style) || (control >= 74 && spin <= 62 && power <= 65)) {
    return "Serve & volley";
  }
  if (/spin|baseliner|rpms|shape/.test(style) || (spin >= 78 && power >= 60)) {
    return "Baseliner";
  }
  if (/power|easy depth|forgiving/.test(style) || (power >= 74 && control <= 62)) {
    return "Power hitter";
  }
  if (control >= 70 && spin <= 68 && power <= 68) {
    return "Counterpuncher";
  }
  if (/all-court|versatile|balanced/.test(style) || Math.abs(power - control) <= 12) {
    return "All-court";
  }
  if (spin >= 70) return "Baseliner";
  return "All-court";
}

export function derivePlayerFit(r: RacketProfile): PlayerFit {
  const skill = skillOf(r);
  const courtRole = courtRoleOf(r);
  const weightClass = weightClassOf(r);
  const headFeel = headFeelOf(r);
  const feelAxis = feelAxisOf(r);

  const blurb = `${skill} ${courtRole.toLowerCase()} frame — ${feelAxis.toLowerCase()} with a ${headFeel.toLowerCase()} and ${weightClass.toLowerCase()} swing weight class.`;

  return { skill, courtRole, weightClass, headFeel, feelAxis, blurb };
}

const SKILL_COLOR: Record<SkillBand, string> = {
  "Beginner-friendly": "#7dd3fc",
  Intermediate: "#c8f560",
  Advanced: "#f4a261",
  "Tour / expert": "#e9c46a",
};

const ROLE_COLOR: Record<CourtRole, string> = {
  Baseliner: "#7dd3fc",
  "All-court": "#c8f560",
  "Serve & volley": "#e9c46a",
  Counterpuncher: "#f4a261",
  "Power hitter": "#f4a261",
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
      hint: "Court role inferred from style tags and spin/power/control scores.",
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
            : '98–100" midplus — modern all-round sweet spot.',
    },
  ];
}
