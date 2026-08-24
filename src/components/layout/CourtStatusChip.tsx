"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { hasAnyGear, setupSummary, useGearStore } from "@/store/gearStore";
import { usePlayerStore } from "@/store/playerStore";

/**
 * Persistent product signal in the shell — bag one-liner or pending accountability.
 * Renders only after mount to avoid SSR/client hydration mismatches with persisted stores.
 */
export function CourtStatusChip() {
  const [mounted, setMounted] = useState(false);
  const setup = useGearStore((s) => s.setup);
  // Stable selector refs — never return a fresh .filter() array from the store
  // selector (that causes infinite re-renders → global error boundary).
  const decisions = usePlayerStore((s) => s.profile?.decisions);

  useEffect(() => {
    setMounted(true);
  }, []);

  const pending = useMemo(
    () => (decisions ?? []).filter((d) => d.result === "pending"),
    [decisions],
  );

  const bagLine = useMemo(() => {
    if (!setup || !hasAnyGear(setup)) return null;
    const full = setupSummary(setup);
    if (full.length <= 42) return full;
    const racket = setup.racketLabel?.split(" ").slice(0, 3).join(" ");
    if (racket && setup.stringLabel) return `${racket} · bed`;
    return racket ?? "Bag set";
  }, [setup]);

  if (!mounted) return null;

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
