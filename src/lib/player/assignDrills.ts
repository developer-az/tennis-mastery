import type {
  AssignedDrill,
  PlayerProfile,
  PlayStroke,
  PlayStruggle,
  SessionEntry,
} from "@/types/playerProfile";
import type { CombinedSetupInsight } from "@/lib/equipment/setupSynthesis";
import { derivePatterns } from "@/lib/player/patterns";
import { rankedLeversFor, type ProblemId } from "@/lib/player/levers";
import { DRILLS, drillById, type Drill } from "@/data/player/drills";

export type GearNudge = {
  label: string;
  href: string;
  why: string;
};

export type DrillPlan = {
  drills: AssignedDrill[];
  gearNudge: GearNudge | null;
};

const STRUGGLE_FROM_FEEL: Partial<Record<SessionEntry["overallFeel"], PlayStruggle>> = {
  flying: "flying",
  dumping: "dumping",
  framing: "framing",
  pushy: "dumping",
};

const WEAK_POINT_DRILLS: Record<string, string> = {
  "Low free power": "through-contact",
  "Spray / sail tendency": "catch-ball-early",
  "Needs the brush": "brush-up",
  "Small sweet spot": "split-step",
  "Heavy plow, slow prep": "early-unit-turn",
  "Light / unstable through contact": "through-contact",
};

function sessionStruggles(session: SessionEntry | null | undefined): PlayStruggle[] {
  if (!session) return [];
  const tagged = session.struggles ?? [];
  const fromFeel = STRUGGLE_FROM_FEEL[session.overallFeel];
  const extra: PlayStruggle[] = [];
  if (fromFeel) extra.push(fromFeel);
  if (/fram|window|late/i.test(session.brokeDown)) extra.push("framing");
  if (/arm|elbow/i.test(session.brokeDown) || session.bodyCheck.elbow === "pain" || session.bodyCheck.elbow === "whisper") {
    extra.push("arm");
  }
  if (/slip|slick/i.test(session.brokeDown)) extra.push("grip_slip");
  if (/spin|flat/i.test(session.brokeDown)) extra.push("no_spin");
  return Array.from(new Set([...tagged, ...extra]));
}

function sessionStrokes(session: SessionEntry | null | undefined): PlayStroke[] {
  return session?.strokes ?? [];
}

function matchesDrill(drill: Drill, strokes: PlayStroke[], struggles: PlayStruggle[]): boolean {
  const strokeOk = drill.stroke === "any" || strokes.length === 0 || strokes.includes(drill.stroke);
  const struggleOk =
    drill.struggles.length === 0 || struggles.some((s) => drill.struggles.includes(s));
  return strokeOk && struggleOk && struggles.length > 0;
}

function toAssigned(drill: Drill, reason: string, source: AssignedDrill["source"]): AssignedDrill {
  return {
    drillId: drill.id,
    reason,
    completed: false,
    assignedAt: new Date().toISOString(),
    source,
  };
}

function struggleToProblem(struggles: PlayStruggle[]): ProblemId | null {
  if (struggles.includes("flying")) return "balls_flying";
  if (struggles.includes("dumping")) return "pushy_no_depth";
  if (struggles.includes("arm")) return "harsh_arm";
  if (struggles.includes("grip_slip")) return "grip_slip";
  if (struggles.includes("framing")) return "inconsistent_bh";
  return null;
}

export function assignDrills({
  profile,
  insight,
}: {
  profile: PlayerProfile;
  insight?: CombinedSetupInsight | null;
}): DrillPlan {
  const latest = profile.sessions[0] ?? null;
  const struggles = sessionStruggles(latest);
  const strokes = sessionStrokes(latest);
  const ranked: AssignedDrill[] = [];
  const seen = new Set<string>();

  const push = (item: AssignedDrill, bump = false) => {
    if (seen.has(item.drillId)) return;
    seen.add(item.drillId);
    if (bump) ranked.unshift(item);
    else ranked.push(item);
  };

  for (const drill of DRILLS) {
    if (matchesDrill(drill, strokes, struggles)) {
      push(toAssigned(drill, "From your last hit", "session"));
    }
  }

  const patterns = derivePatterns(profile);
  if (patterns.some((p) => p.id === "bh-framing")) {
    const drill = drillById("bh-window");
    if (drill) push(toAssigned(drill, "This keeps showing up on the backhand", "pattern"), true);
  }
  if (patterns.some((p) => p.id === "pushy-feel")) {
    const drill = drillById("through-contact");
    if (drill) push(toAssigned(drill, "Recurring pushy / no-depth feel", "pattern"), true);
  }

  if (ranked.length === 0 && insight?.weakPoints?.length) {
    for (const wp of insight.weakPoints) {
      const id = WEAK_POINT_DRILLS[wp.title];
      const drill = id ? drillById(id) : undefined;
      if (drill) push(toAssigned(drill, wp.holdingBack, "frame"));
    }
  }

  const drills = ranked.slice(0, 3).map((d) => ({
    ...d,
    completed: profile.completedDrillIds?.includes(d.drillId) ?? false,
  }));

  const problem = struggleToProblem(struggles);
  let gearNudge: GearNudge | null = null;
  if (problem && drills.length > 0) {
    const lever = rankedLeversFor(problem).find((l) => l.lever !== "swing");
    if (lever) {
      const href =
        lever.lever === "string" || lever.lever === "tension" || lever.lever === "gauge"
          ? "/gear?tab=strings"
          : lever.lever === "frame"
            ? "/gear?tab=rackets"
            : lever.lever === "grip-layer" || lever.lever === "grip-size"
              ? "/gear?tab=grips"
              : "/gear?tab=lead-tape";
      gearNudge = {
        label: lever.action,
        href,
        why: "If this keeps happening after the drill, try one gear change — not first.",
      };
    }
  }

  return { drills, gearNudge };
}
