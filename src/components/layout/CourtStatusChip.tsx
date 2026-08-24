"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { hasAnyGear, setupSummary, useGearStore } from "@/store/gearStore";
import { usePlayerStore } from "@/store/playerStore";

/**
 * Persistent product signal in the shell — bag one-liner or pending accountability.
 * Makes the nav feel like a living court, not three static links.
 */
export function CourtStatusChip() {
  const [ready, setReady] = useState(false);
  const setup = useGearStore((s) => s.setup);
  const pending = usePlayerStore((s) =>
    s.profile.decisions.filter((d) => d.result === "pending"),
  );
  const hydrated = usePlayerStore((s) => s.hydrated);
  const setHydrated = usePlayerStore((s) => s.setHydrated);

  useEffect(() => {
    if (usePlayerStore.persist.hasHydrated()) setHydrated(true);
    setReady(true);
  }, [setHydrated]);

  const bagLine = useMemo(() => {
    if (!hasAnyGear(setup)) return null;
    const full = setupSummary(setup);
    if (full.length <= 42) return full;
    const racket = setup.racketLabel?.split(" ").slice(0, 3).join(" ");
    if (racket && setup.stringLabel) return `${racket} · bed`;
    return racket ?? "Bag set";
  }, [setup]);

  if (!ready || !hydrated) return null;

  if (pending.length > 0) {
    return (
      <Link
        href="/you"
        className="sf-status-chip sf-status-chip-warn hidden max-w-[200px] truncate xl:inline-flex"
        title={pending[0].changeSummary}
      >
        <span className="sf-status-dot" aria-hidden />
        Resolve change
      </Link>
    );
  }

  if (bagLine) {
    return (
      <Link
        href="/you"
        className="sf-status-chip hidden max-w-[220px] truncate xl:inline-flex"
        title={setupSummary(setup)}
      >
        <span className="sf-status-dot sf-status-dot-live" aria-hidden />
        {bagLine}
      </Link>
    );
  }

  return (
    <Link href="/you" className="sf-status-chip hidden xl:inline-flex">
      <span className="sf-status-dot" aria-hidden />
      Set your bag
    </Link>
  );
}
