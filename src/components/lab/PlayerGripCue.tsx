"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePlayerStore } from "@/store/playerStore";
import { useGearStore } from "@/store/gearStore";
import { deriveForehandMold } from "@/lib/equipment/forehandMold";
import { useCoachStore } from "@/store/coachStore";

/** Form Lab cue: face / bevel from the stored grip, not a generic pro. */
export function PlayerGripCue() {
  const grips = usePlayerStore((s) => s.profile.grips);
  const setup = useGearStore((s) => s.setup);
  const stroke = useCoachStore((s) => s.stroke);

  const mold = useMemo(() => {
    if (!grips.forehand) return null;
    return deriveForehandMold({
      playerGrip: grips.forehand,
      launchAngleDeg: setup.racketLaunchDeg,
      swingPathDeg: setup.racketSwingPathDeg,
      power: setup.racketPower,
      spin: setup.racketSpin,
      control: setup.racketControl,
    });
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
        </p>
      )}
    </div>
  );
}
