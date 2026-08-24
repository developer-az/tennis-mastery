"use client";

import { useMemo } from "react";
import { PLAYERS } from "@/data/players";
import { PHASE_LABELS, phaseAt } from "@/lib/kinematics";
import { useCoachStore } from "@/store/coachStore";

/** Coach-voice overlay for the Form Lab viewport — replaces “Interactive 3D” demo chrome. */
export function LabPhaseOverlay() {
  const playerId = useCoachStore((s) => s.playerId);
  const strokeType = useCoachStore((s) => s.stroke);
  const t = useCoachStore((s) => s.t);

  const { phase, quirk, athlete } = useMemo(() => {
    const player = PLAYERS.find((p) => p.id === playerId) ?? PLAYERS[0];
    const stroke = player.strokes[strokeType];
    const kf = phaseAt(stroke, t);
    return {
      athlete: player.shortName,
      phase: kf,
      quirk: stroke.metrics.consistency.signatureQuirk,
    };
  }, [playerId, strokeType, t]);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 p-4 md:p-5">
      <div className="sf-lab-overlay max-w-md">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="sf-kicker !text-[10px]">{athlete}</p>
          <p className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-tight">
            {PHASE_LABELS[phase.phase]}
          </p>
        </div>
        <p className="mt-2 text-sm leading-snug text-[var(--foreground)]/90">{phase.coachingCue}</p>
        <p className="mt-3 border-t border-[var(--line)] pt-2.5 text-[11px] leading-relaxed text-[var(--muted)]">
          <span className="font-semibold text-[var(--accent)]">Signature · </span>
          {quirk}
        </p>
      </div>
    </div>
  );
}
