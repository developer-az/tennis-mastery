import type {
  DecisionEntry,
  PlayerProfile,
  SessionEntry,
} from "@/types/playerProfile";

export type PatternInsight = {
  id: string;
  severity: "info" | "warn" | "strong";
  title: string;
  detail: string;
};

export function derivePatterns(profile: PlayerProfile): PatternInsight[] {
  const out: PatternInsight[] = [];
  const decisions = profile.decisions;
  const sessions = profile.sessions;

  const frameAbandons = decisions.filter(
    (d) =>
      d.lever === "frame" &&
      (d.result === "abandoned" ||
        d.result === "rejected" ||
        /comfort|elbow|arm|pain|stiff/i.test(
          `${d.reason} ${d.prediction} ${d.resultNote} ${d.bodyRead}`,
        )),
  );
  if (frameAbandons.length >= 2) {
    out.push({
      id: "frame-comfort-abandons",
      severity: "strong",
      title: `You've abandoned ${frameAbandons.length} frames citing comfort/arm`,
      detail:
        "Your data keeps pointing at comfort as the real filter. Prefer arm-friendly frames (e.g. CX200 class) over stiff power sticks unless a constraint says otherwise.",
    });
  }

  const lowTensionFly = decisions.filter((d) => {
    const blob = `${d.reason} ${d.prediction} ${d.resultNote} ${d.changeSummary}`;
    const low =
      /below\s*5[0-2]|to\s*4[0-9]|dropped|lower|52\s*lbs|50\s*lbs/i.test(blob) &&
      d.lever === "tension";
    const flew =
      d.result === "rejected" ||
      /fly|trampoline|launch|long/i.test(`${d.resultNote} ${d.bodyRead}`);
    return low && flew;
  });
  if (lowTensionFly.length >= 2) {
    out.push({
      id: "low-tension-fly",
      severity: "strong",
      title: "Pattern: low poly tension → balls fly",
      detail:
        "Multiple logged outcomes match “below ~50–52 with poly, depth/launch gets wild.” Treat that band as evidence, not a fresh experiment.",
    });
  }

  const pushySessions = sessions.filter(
    (s) =>
      s.overallFeel === "pushy" ||
      /pushy|no depth|flat|blocked/i.test(`${s.feltGood} ${s.brokeDown} ${s.notes}`),
  );
  const framingSessions = sessions.filter(
    (s) =>
      s.overallFeel === "framing" ||
      /fram|window|late|contact/i.test(`${s.feltGood} ${s.brokeDown} ${s.notes}`),
  );
  if (framingSessions.length >= 3) {
    out.push({
      id: "bh-framing",
      severity: "info",
      title: "Recurring: backhand framing / window",
      detail: `Logged on ${framingSessions.length} sessions. Form Lab + grip-derived face angle are the rehearsal tools — not another string change.`,
    });
  }
  if (pushySessions.length >= 3) {
    out.push({
      id: "pushy-feel",
      severity: "warn",
      title: "Recurring: pushy / no depth feel",
      detail:
        "Before changing three things, run one lever (usually tension −2 or tip mass) and log the body read.",
    });
  }

  const blisterWorse = sessions.filter(
    (s) => s.bodyCheck.blisters === "blister" || s.bodyCheck.hand === "blister",
  ).length;
  const blisterOk = sessions.filter(
    (s) =>
      s.bodyCheck.blisters === "ok" ||
      (s.bodyCheck.hand === "ok" && s.bodyCheck.blisters !== "blister"),
  ).length;
  if (blisterWorse >= 2 && blisterOk === 0) {
    out.push({
      id: "blisters-unresolved",
      severity: "warn",
      title: "Blisters still trending worse",
      detail:
        "Grip-build (size + sleeve + Tourna) hasn't shown a clear win yet. Keep both frames matched and log blister after every session.",
    });
  } else if (blisterOk >= 2 && blisterWorse === 0) {
    out.push({
      id: "blisters-improving",
      severity: "info",
      title: "Blister log improving",
      detail: "Recent sessions mark hands/blisters ok — hold the current grip build on both frames.",
    });
  }

  const openDecisions = decisions.filter((d) => d.result === "pending").length;
  if (openDecisions >= 2) {
    out.push({
      id: "open-predictions",
      severity: "warn",
      title: `${openDecisions} decisions still need a result`,
      detail:
        "Close the loop: after you hit, mark each prediction confirmed / rejected / mixed with a body read.",
    });
  }

  const dampenerSessions = sessions.filter((s) =>
    /dampen/i.test(`${s.feltGood} ${s.brokeDown} ${s.notes}`),
  );
  if (dampenerSessions.length >= 2) {
    out.push({
      id: "dampener-signal",
      severity: "info",
      title: "Dampener keeps showing up in session notes",
      detail:
        "Treat pocket / vibration feel as a preference to protect, not something to strip for “pure feel.”",
    });
  }

  const cxMentions = decisions.filter((d) =>
    /cx\s*200|cx200/i.test(`${d.setupSummary} ${d.changeSummary} ${d.resultNote}`),
  );
  if (cxMentions.length >= 2 && frameAbandons.length >= 2) {
    out.push({
      id: "cx200-signal",
      severity: "strong",
      title: "Your data favors CX200-class comfort",
      detail:
        "You've now left stiffer frames for comfort more than once while CX200 keeps showing up in working setups. Weight that evidence above the next power-frame temptation.",
    });
  }

  return out;
}

export function decisionAccountabilityScore(decisions: DecisionEntry[]): {
  closed: number;
  pending: number;
  confirmed: number;
} {
  const closed = decisions.filter((d) => d.result !== "pending").length;
  const pending = decisions.filter((d) => d.result === "pending").length;
  const confirmed = decisions.filter((d) => d.result === "confirmed").length;
  return { closed, pending, confirmed };
}

export function recentBodyTrend(sessions: SessionEntry[]): string {
  const last = sessions.slice(0, 5);
  if (last.length === 0) return "No sessions logged yet — body trend unknown.";
  const armWarn = last.filter(
    (s) => s.bodyCheck.elbow === "whisper" || s.bodyCheck.elbow === "pain",
  ).length;
  const blisterWarn = last.filter(
    (s) => s.bodyCheck.blisters === "blister" || s.bodyCheck.hand === "blister",
  ).length;
  if (armWarn >= 2) {
    return "Recent arm signal: elbow whispering more than once — prioritize comfort levers.";
  }
  if (blisterWarn >= 2) {
    return "Recent hand signal: blisters across sessions — check grip build match on both frames.";
  }
  return "Recent body checks look stable enough to keep iterating one lever at a time.";
}
