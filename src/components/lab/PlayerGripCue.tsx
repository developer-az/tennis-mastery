"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePlayerStore } from "@/store/playerStore";
import { useGearStore } from "@/store/gearStore";
import { synthesizeCombinedSetup } from "@/lib/equipment/setupSynthesis";
import { useCoachStore } from "@/store/coachStore";

/** Form Lab cue: face / bevel from the stored grip + molded leave/path (includes tape). */
export function PlayerGripCue() {
  const grips = usePlayerStore((s) => s.profile.grips);
  const setup = useGearStore((s) => s.setup);
  const stroke = useCoachStore((s) => s.stroke);

  const mold = useMemo(() => {
    if (!grips.forehand) return null;
    // Null catalogs still apply tape + string heuristics from setup meta
    return synthesizeCombinedSetup(setup, null, null, null, [], {
      playerGrip: grips.forehand,
    }).forehand;
  }, [grips.forehand, setup]);

  if (!grips.forehand) {
    return (
      <p className="text-xs text-[var(--muted)]">
        Face angle follows your grip.{" "}
        <Link href="/you" className="text-[var(--accent)] hover:underline">
          Finish setup
        </Link>
      </p>
    );
  }

  const hasTape = (setup.leadTape?.pieces?.length ?? 0) > 0;

  return (
    <div className="space-y-1 text-xs">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
        Your grip → face
      </p>
      <p className="text-sm text-[var(--foreground)]">{mold?.summary ?? grips.forehand}</p>
      {mold && (
        <p className="leading-relaxed text-[var(--muted)]">
          ~{mold.face.closedDeg}° closed in the {mold.prefersHeight} window
          {stroke === "backhand" ? " — BH inherits this face family." : "."}
          {hasTape ? " Mold includes your lead tape." : ""}
        </p>
      )}
    </div>
  );
}
