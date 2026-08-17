"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePlayerStore } from "@/store/playerStore";
import { useGearStore } from "@/store/gearStore";
import { bedStatus } from "@/lib/player/stringHours";
import {
  checkRecommendation,
  stiffnessFromComfort,
} from "@/lib/player/constraints";

/** Only speak when something is actually wrong. */
export function AccountabilityStrip() {
  const profile = usePlayerStore((s) => s.profile);
  const pendingLockMessage = usePlayerStore((s) => s.pendingLockMessage);
  const setup = useGearStore((s) => s.setup);

  const lockMsg = pendingLockMessage();

  const bedWarn = useMemo(() => {
    if (!setup.stringId) return null;
    const bed = profile.stringBeds.find((b) => b.stringId === setup.stringId);
    if (!bed) return null;
    const st = bedStatus(bed, setup.stringLabel ?? undefined);
    if (st.status === "fresh") return null;
    return st;
  }, [profile.stringBeds, setup.stringId, setup.stringLabel]);

  const hardFlags = useMemo(() => {
    const material = setup.stringLabel ?? "";
    const fullPoly = /poly/i.test(material) && !/hybrid/i.test(material);
    return checkRecommendation(profile, {
      frameComfort: setup.racketComfort,
      frameStiffness: stiffnessFromComfort(setup.racketComfort),
      tensionLbs: setup.tensionLbs ?? undefined,
      stringMaterial: material,
      fullPoly,
      stringComfort: setup.stringComfort,
    }).filter((f) => f.severity === "block" || f.severity === "hard");
  }, [profile, setup]);

  if (!lockMsg && !bedWarn && hardFlags.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {lockMsg && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-[var(--amber)]">
          {lockMsg}{" "}
          <Link href="/you" className="underline underline-offset-2">
            Resolve
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
      {hardFlags.map((f) => (
        <p key={f.id} className="rounded-md border border-red-400/40 bg-red-500/10 px-4 py-2 text-sm">
          <span className="font-medium">{f.title}.</span> {f.detail}
        </p>
      ))}
    </div>
  );
}
