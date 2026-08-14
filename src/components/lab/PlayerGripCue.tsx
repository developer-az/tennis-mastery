"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePlayerStore } from "@/store/playerStore";
import { useGearStore } from "@/store/gearStore";
import { deriveForehandMold } from "@/lib/equipment/forehandMold";
import { useCoachStore } from "@/store/coachStore";

/**
 * Form Lab cue: face / bevel from the player's stored grip, not a generic pro.
 */
export function PlayerGripCue() {
  const grips = usePlayerStore((s) => s.profile.grips);
  const setup = useGearStore((s) => s.setup);
  const stroke = useCoachStore((s) => s.stroke);
  const setCameraMode = useCoachStore((s) => s.setCameraMode);
  const cameraMode = useCoachStore((s) => s.cameraMode);

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
      <div className="rounded-md border border-[var(--line)] bg-black/20 px-3 py-3 text-xs text-[var(--muted)]">
        No stored FH grip yet.{" "}
        <Link href="/profile" className="text-[var(--accent)] hover:underline">
          Set your grip in Player profile
        </Link>{" "}
        so face angle follows you, not a generic model.
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-[var(--line)] bg-black/20 px-3 py-3 text-xs">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
        Your grip → face
      </p>
      <p className="text-sm text-[var(--foreground)]">
        {mold?.summary ?? grips.forehand}
      </p>
      {grips.backhandNote && (
        <p className="text-[var(--muted)]">BH: {grips.backhandNote}</p>
      )}
      {mold && (
        <p className="leading-relaxed text-[var(--muted)]">
          At contact rehearse ~{mold.face.closedDeg}° closed ({mold.face.label.toLowerCase()}) in
          the {mold.prefersHeight} window
          {stroke === "backhand"
            ? " — your one-hander inherits face orientation from this grip family."
            : "."}
        </p>
      )}
      <button
        type="button"
        onClick={() => setCameraMode("firstPerson")}
        className="rounded-md px-2.5 py-1.5 text-xs transition"
        style={{
          background: cameraMode === "firstPerson" ? "var(--accent)" : "transparent",
          color: cameraMode === "firstPerson" ? "#0b1a14" : "var(--foreground)",
          boxShadow: cameraMode === "firstPerson" ? "none" : "0 0 0 1px var(--line)",
        }}
      >
        First-person (hand / face POV)
      </button>
    </div>
  );
}
