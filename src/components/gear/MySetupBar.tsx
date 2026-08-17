"use client";

import type { EquipmentTab } from "@/types/equipment";
import { setupSummary, useGearStore } from "@/store/gearStore";

export function MySetupBar({
  onSelectTab,
}: {
  onSelectTab?: (tab: EquipmentTab) => void;
}) {
  const setup = useGearStore((s) => s.setup);
  const setTab = useGearStore((s) => s.setTab);

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
    <button
      type="button"
      onClick={() => go("overview")}
      className="mb-4 flex w-full items-center justify-between gap-3 border border-[var(--line)] bg-[var(--panel)]/90 px-4 py-3 text-left text-sm transition hover:border-[var(--line-strong)]"
    >
      <span className="min-w-0 truncate text-[var(--foreground)]/90">{setupSummary(setup)}</span>
      <span className="shrink-0 text-[11px] font-semibold tracking-[0.1em] text-[var(--accent)] uppercase">
        Overview
      </span>
    </button>
  );
}
