"use client";

import Link from "next/link";
import { setupSummary, useGearStore } from "@/store/gearStore";

export function MySetupBar() {
  const setup = useGearStore((s) => s.setup);
  const clearSetup = useGearStore((s) => s.clearSetup);
  const hasAny =
    setup.racketSlug || setup.stringId || setup.gripId;

  return (
    <div
      className="sticky top-0 z-20 mb-8 border border-[var(--line)] bg-[var(--panel)]/95 px-4 py-3 backdrop-blur md:px-5"
      style={{ animation: "rise 0.45s ease-out both" }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            My setup
          </p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--foreground)]/90">
            {setupSummary(setup)}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Saved in this browser. Use “Save to my setup” on any racket, string, or grip.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {hasAny ? (
            <>
              <Link
                href="/lab"
                className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-[#0b1a14] transition hover:brightness-110"
              >
                Open form lab
              </Link>
              <button
                type="button"
                onClick={clearSetup}
                className="rounded-md px-3 py-1.5 text-xs text-[var(--muted)] transition hover:bg-white/5 hover:text-[var(--foreground)]"
                style={{ boxShadow: "0 0 0 1px var(--line)" }}
              >
                Clear
              </button>
            </>
          ) : null}
        </div>
      </div>
      {hasAny ? (
        <ul className="mt-3 flex flex-wrap gap-2 text-xs">
          {setup.racketLabel ? (
            <li className="rounded bg-[var(--accent-dim)] px-2 py-1 text-[var(--accent)]">
              Frame · {setup.racketLabel}
            </li>
          ) : null}
          {setup.stringLabel ? (
            <li className="rounded bg-sky-400/10 px-2 py-1 text-sky-300">
              String · {setup.stringLabel}
              {setup.tensionLbs != null ? ` · ${setup.tensionLbs} lbs` : ""}
              {setup.gaugeMm != null ? ` · ${setup.gaugeMm} mm` : ""}
            </li>
          ) : null}
          {setup.gripLabel ? (
            <li className="rounded bg-[var(--amber)]/15 px-2 py-1 text-[var(--amber)]">
              Grip · {setup.gripLabel}
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
