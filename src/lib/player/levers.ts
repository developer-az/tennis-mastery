import type { LeverKind } from "@/types/playerProfile";

export type RankedLever = {
  lever: LeverKind;
  label: string;
  action: string;
  why: string;
};

export type ProblemId =
  | "balls_flying"
  | "pushy_no_depth"
  | "harsh_arm"
  | "grip_slip"
  | "blisters"
  | "inconsistent_bh"
  | "dead_feel";

const PROBLEM_LEVERS: Record<ProblemId, RankedLever[]> = {
  balls_flying: [
    {
      lever: "tension",
      label: "Tension",
      action: "Raise tension ~2 lbs (one bed only)",
      why: "First accountable depth/launch control without changing feel stack.",
    },
    {
      lever: "tip-tape",
      label: "Tip mass",
      action: "Add 1–2g tip lead on one frame",
      why: "Plow / lower launch without restringing.",
    },
    {
      lever: "swing",
      label: "Swing path",
      action: "Shorten / shape swing — log form note, no gear change",
      why: "Rule out technique before another bag experiment.",
    },
  ],
  pushy_no_depth: [
    {
      lever: "tension",
      label: "Tension",
      action: "Drop tension ~2 lbs (stay ≥50 with poly if that's your floor)",
      why: "Depth first; one number change.",
    },
    {
      lever: "tip-tape",
      label: "Tip mass",
      action: "Add tip mass for plow",
      why: "Helps drive through without going trampoline-soft.",
    },
    {
      lever: "swing",
      label: "Swing",
      action: "Commit through contact — log form, keep gear fixed",
      why: "You generate your own power; confirm it's not hesitation.",
    },
  ],
  harsh_arm: [
    {
      lever: "tension",
      label: "Tension",
      action: "Lower tension 2 lbs or soften hybrid cross",
      why: "Fastest comfort lever that stays accountable.",
    },
    {
      lever: "string",
      label: "String",
      action: "Move toward softer bed / hybrid (one change)",
      why: "Only after tension result is logged.",
    },
    {
      lever: "frame",
      label: "Frame",
      action: "Arm-friendlier frame — last resort after bed levers",
      why: "Frame hops erase evidence if done early.",
    },
  ],
  grip_slip: [
    {
      lever: "grip-layer",
      label: "Grip build",
      action: "Fresh Tourna / adjust sleeve stack on both matched frames",
      why: "Match the pair; don't mix builds.",
    },
    {
      lever: "other",
      label: "Dampener",
      action: "Confirm dampener present if pocket helps you",
      why: "Secondary; only if build is already matched.",
    },
  ],
  blisters: [
    {
      lever: "grip-size",
      label: "Grip size / build",
      action: "Hold target size (e.g. 4 3/8 + sleeve + Tourna) on both frames",
      why: "Blisters need matched builds + multi-session evidence.",
    },
  ],
  inconsistent_bh: [
    {
      lever: "swing",
      label: "Form Lab",
      action: "Rehearse BH window with your grip-derived face — no gear change",
      why: "Framing is usually window/face, not string.",
    },
    {
      lever: "grip-layer",
      label: "Grip",
      action: "Confirm BH still comes off back of FH grip; rebuild if slipped",
      why: "Only if form rehearsal didn't stabilize.",
    },
  ],
  dead_feel: [
    {
      lever: "string",
      label: "String hours",
      action: "Restring — do not judge setup on a dead poly bed",
      why: "Fresh vs dead is the hidden variable you kept missing.",
    },
  ],
};

export function rankedLeversFor(problem: ProblemId): RankedLever[] {
  return PROBLEM_LEVERS[problem] ?? [];
}

export const PROBLEM_LABELS: Record<ProblemId, string> = {
  balls_flying: "Balls flying / too much launch",
  pushy_no_depth: "Pushy / no depth",
  harsh_arm: "Harsh on the arm",
  grip_slip: "Grip slipping",
  blisters: "Blisters / hand hot spots",
  inconsistent_bh: "Inconsistent one-hander / framing",
  dead_feel: "Dead / muted string bed",
};

export function problemOptions(): { id: ProblemId; label: string }[] {
  return (Object.keys(PROBLEM_LABELS) as ProblemId[]).map((id) => ({
    id,
    label: PROBLEM_LABELS[id],
  }));
}
