"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePlayerStore } from "@/store/playerStore";
import { useGearStore } from "@/store/gearStore";
import { bedStatus } from "@/lib/player/stringHours";
import { derivePatterns } from "@/lib/player/patterns";
import {
  armFriendlyNudge,
  checkRecommendation,
  stiffnessFromComfort,
} from "@/lib/player/constraints";

/**
 * Compact Gear Lab strip: lever lock, dead-string warning, constraint flags, pattern peek.
 */
export function AccountabilityStrip() {
  const profile = usePlayerStore((s) => s.profile);
  const pendingLockMessage = usePlayerStore((s) => s.pendingLockMessage);
  const setup = useGearStore((s) => s.setup);

  const lockMsg = pendingLockMessage();
  const patterns = useMemo(() => derivePatterns(profile).slice(0, 2), [profile]);
  const nudge = armFriendlyNudge(profile);

  const bedWarn = useMemo(() => {
    if (!setup.stringId) return null;
    const bed = profile.stringBeds.find((b) => b.stringId === setup.stringId);
    if (!bed) return null;
    const st = bedStatus(bed, setup.stringLabel ?? undefined);
    if (st.status === "fresh") return null;
    return st;
  }, [profile.stringBeds, setup.stringId, setup.stringLabel]);

  const flags = useMemo(() => {
    const material = setup.stringLabel ?? "";
    const fullPoly = /poly/i.test(material) && !/hybrid/i.test(material);
    return checkRecommendation(profile, {
      frameComfort: setup.racketComfort,
      frameStiffness: stiffnessFromComfort(setup.racketComfort),
      tensionLbs: setup.tensionLbs ?? undefined,
      stringMaterial: material,
      fullPoly,
      stringComfort: setup.stringComfort,
    });
  }, [profile, setup]);

  const hasSomething =
    lockMsg || bedWarn || nudge || flags.length > 0 || patterns.length > 0;

  if (!hasSomething) {
    return (
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--line)] bg-[var(--panel)]/60 px-4 py-3 text-xs text-[var(--muted)]">
        <span>
          Memory on: log decisions & sessions in{" "}
          <Link href="/profile" className="text-[var(--accent)] hover:underline">
            Player profile
          </Link>{" "}
          so Gear Lab remembers your constraints and one-lever discipline.
        </span>
      </div>
    );
  }

  return (
    <div className="mb-4 space-y-2">
      {lockMsg && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-100">
          {lockMsg}{" "}
          <Link href="/profile" className="underline underline-offset-2">
            Resolve in profile
          </Link>
        </p>
      )}
      {bedWarn && (
        <p
          className={`rounded-md border px-4 py-2 text-sm ${
            bedWarn.status === "likely_dead"
              ? "border-red-400/40 bg-red-500/10"
              : "border-amber-500/30 bg-amber-500/10"
          }`}
        >
          {bedWarn.message}
        </p>
      )}
      {nudge && (
        <p className="rounded-md border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-4 py-2 text-sm">
          {nudge}
        </p>
      )}
      {flags.map((f) => (
        <p
          key={f.id}
          className={`rounded-md border px-4 py-2 text-sm ${
            f.severity === "block" || f.severity === "hard"
              ? "border-red-400/40 bg-red-500/10"
              : "border-[var(--line)] text-[var(--muted)]"
          }`}
        >
          <span className="font-medium text-[var(--foreground)]">{f.title}.</span> {f.detail}
        </p>
      ))}
      {patterns.map((p) => (
        <p key={p.id} className="rounded-md border border-[var(--line)] px-4 py-2 text-sm text-[var(--muted)]">
          <span className="font-medium text-[var(--foreground)]">{p.title}.</span> {p.detail}
        </p>
      ))}
    </div>
  );
}
