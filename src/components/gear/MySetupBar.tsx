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
      className="mb-4 flex w-full items-center justify-between gap-3 rounded-md border border-[var(--line)] bg-[var(--panel)]/80 px-3 py-2 text-left text-sm"
    >
      <span className="min-w-0 truncate text-[var(--foreground)]/90">{setupSummary(setup)}</span>
      <span className="shrink-0 text-xs text-[var(--accent)]">Overview</span>
    </button>
  );
}
