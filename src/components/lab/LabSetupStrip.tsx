"use client";

import Link from "next/link";
import { setupSummary, useGearStore } from "@/store/gearStore";

/** Sticky strip in Form Lab — always offers return to Gear + combined setup. */
export function LabSetupStrip() {
  const setup = useGearStore((s) => s.setup);
  const tapeG = setup.leadTape?.pieces?.reduce((n, p) => n + p.massG, 0) ?? 0;
  const hasGrip =
    (setup.gripLayers?.length ?? 0) > 0 || Boolean(setup.gripId);
  const hasAny = Boolean(setup.racketSlug || setup.stringId || hasGrip || tapeG > 0);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] bg-[var(--panel)] px-4 py-2.5 md:px-5">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
          Your setup
        </p>
        <p className="truncate text-xs text-[var(--foreground)]/85">
          {hasAny ? setupSummary(setup) : "No gear saved yet — open Gear lab to build a bag."}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Link
          href="/gear?tab=overview"
          className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-[#0b1a14] transition hover:brightness-110"
        >
          {hasAny ? "My setup" : "Build my setup"}
        </Link>
        <Link
          href="/gear?tab=rackets"
          className="rounded-md px-3 py-1.5 text-xs text-[var(--foreground)] transition hover:bg-white/5"
          style={{ boxShadow: "0 0 0 1px var(--line)" }}
        >
          Return to Gear lab
        </Link>
      </div>
    </div>
  );
}
