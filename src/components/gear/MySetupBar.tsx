"use client";

import Link from "next/link";
import type { EquipmentTab } from "@/types/equipment";
import { setupSummary, useGearStore } from "@/store/gearStore";

export function MySetupBar({
  onSelectTab,
}: {
  onSelectTab?: (tab: EquipmentTab) => void;
}) {
  const setup = useGearStore((s) => s.setup);
  const clearSetup = useGearStore((s) => s.clearSetup);
  const setTab = useGearStore((s) => s.setTab);
  const tapeG = setup.leadTape?.pieces?.reduce((n, p) => n + p.massG, 0) ?? 0;
  const hasAny =
    setup.racketSlug || setup.stringId || setup.gripId || tapeG > 0;

  const go = (tab: EquipmentTab) => {
    if (onSelectTab) onSelectTab(tab);
    else {
      setTab(tab);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("tab", tab);
        window.history.replaceState(null, "", url.toString());
      }
    }
  };

  return (
    <div
      className="sticky top-0 z-40 mb-5 border border-[var(--line)] bg-[var(--panel)]/95 px-3 py-2.5 backdrop-blur sm:mb-8 sm:px-4 sm:py-3 md:px-5"
      style={{ animation: "rise 0.45s ease-out both" }}
    >
      <div className="flex flex-wrap items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            My setup
          </p>
          <p className="mt-1 text-sm leading-snug text-[var(--foreground)]/90 sm:leading-relaxed">
            {setupSummary(setup)}
          </p>
          <p className="mt-1 hidden text-xs text-[var(--muted)] sm:block">
            Saved in this browser. Open{" "}
            <button
              type="button"
              onClick={() => go("overview")}
              className="text-[var(--accent)] underline-offset-2 hover:underline"
            >
              My setup
            </button>{" "}
            for molded launch, playstyle, and pros/cons.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {hasAny ? (
            <>
              <button
                type="button"
                onClick={() => go("overview")}
                className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-[#0b1a14] transition hover:brightness-110"
              >
                View combined
              </button>
              <Link
                href="/lab"
                className="rounded-md px-3 py-1.5 text-xs text-[var(--foreground)] transition hover:bg-white/5"
                style={{ boxShadow: "0 0 0 1px var(--line)" }}
              >
                Form lab
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
            <li>
              <button
                type="button"
                onClick={() => go("rackets")}
                className="rounded bg-[var(--accent-dim)] px-2 py-1 text-[var(--accent)] transition hover:brightness-110"
              >
                Frame · {setup.racketLabel}
              </button>
            </li>
          ) : null}
          {setup.stringLabel ? (
            <li>
              <button
                type="button"
                onClick={() => go("strings")}
                className="rounded bg-sky-400/10 px-2 py-1 text-sky-300 transition hover:brightness-110"
              >
                String · {setup.stringLabel}
                {setup.tensionLbs != null ? ` · ${setup.tensionLbs} lbs` : ""}
                {setup.gaugeMm != null ? ` · ${setup.gaugeMm} mm` : ""}
              </button>
            </li>
          ) : null}
          {setup.gripLabel ? (
            <li>
              <button
                type="button"
                onClick={() => go("grips")}
                className="rounded bg-[var(--amber)]/15 px-2 py-1 text-[var(--amber)] transition hover:brightness-110"
              >
                Grip · {setup.gripLabel}
              </button>
            </li>
          ) : null}
          {tapeG > 0 ? (
            <li>
              <button
                type="button"
                onClick={() => go("lead-tape")}
                className="rounded bg-[var(--accent)]/15 px-2 py-1 text-[var(--accent)] transition hover:brightness-110"
              >
                Lead tape · +{tapeG}g
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
