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
    else setTab(tab);
  };

  return (
    <button
      type="button"
      onClick={() => go("overview")}
      className="flex min-h-11 max-w-full min-w-0 items-center gap-2 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-left text-xs transition hover:border-[var(--line-strong)] md:max-w-md"
    >
      <span className="min-w-0 truncate text-[var(--foreground)]/85">{setupSummary(setup)}</span>
      <span className="shrink-0 text-[10px] font-semibold tracking-[0.1em] text-[var(--accent)] uppercase">
        Bag
      </span>
    </button>
  );
}
