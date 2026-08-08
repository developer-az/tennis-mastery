"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { EquipmentTab } from "@/types/equipment";

export interface MySetup {
  racketSlug: string | null;
  racketLabel: string | null;
  racketLaunchDeg: number | null;
  racketSwingPathDeg: number | null;
  stringId: string | null;
  stringLabel: string | null;
  tensionLbs: number | null;
  gaugeMm: number | null;
  gripId: string | null;
  gripLabel: string | null;
}

interface GearState {
  tab: EquipmentTab;
  setup: MySetup;
  setTab: (tab: EquipmentTab) => void;
  setRacket: (
    slug: string,
    label: string,
    idealLaunchAngleDeg?: number,
    idealSwingPathDeg?: number,
  ) => void;
  setString: (id: string, label: string, tensionLbs?: number, gaugeMm?: number) => void;
  setTension: (tensionLbs: number) => void;
  setGauge: (gaugeMm: number) => void;
  setGrip: (id: string, label: string) => void;
  clearSetup: () => void;
}

const emptySetup: MySetup = {
  racketSlug: null,
  racketLabel: null,
  racketLaunchDeg: null,
  racketSwingPathDeg: null,
  stringId: null,
  stringLabel: null,
  tensionLbs: null,
  gaugeMm: null,
  gripId: null,
  gripLabel: null,
};

export const useGearStore = create<GearState>()(
  persist(
    (set) => ({
      tab: "rackets",
      setup: emptySetup,
      setTab: (tab) => set({ tab }),
      setRacket: (slug, label, idealLaunchAngleDeg, idealSwingPathDeg) =>
        set((s) => ({
          setup: {
            ...s.setup,
            racketSlug: slug,
            racketLabel: label,
            racketLaunchDeg: idealLaunchAngleDeg ?? s.setup.racketLaunchDeg,
            racketSwingPathDeg: idealSwingPathDeg ?? s.setup.racketSwingPathDeg,
          },
        })),
      setString: (id, label, tensionLbs, gaugeMm) =>
        set((s) => ({
          setup: {
            ...s.setup,
            stringId: id,
            stringLabel: label,
            tensionLbs: tensionLbs ?? s.setup.tensionLbs,
            gaugeMm: gaugeMm ?? s.setup.gaugeMm,
          },
        })),
      setTension: (tensionLbs) =>
        set((s) => ({ setup: { ...s.setup, tensionLbs } })),
      setGauge: (gaugeMm) => set((s) => ({ setup: { ...s.setup, gaugeMm } })),
      setGrip: (id, label) =>
        set((s) => ({
          setup: { ...s.setup, gripId: id, gripLabel: label },
        })),
      clearSetup: () => set({ setup: emptySetup }),
    }),
    {
      name: "strokeform-my-setup",
      partialize: (s) => ({ setup: s.setup }),
    },
  ),
);

export function setupSummary(setup: MySetup): string {
  const parts: string[] = [];
  if (setup.racketLabel) parts.push(setup.racketLabel);
  if (setup.stringLabel) {
    const tension = setup.tensionLbs != null ? ` @ ${setup.tensionLbs} lbs` : "";
    const gauge = setup.gaugeMm != null ? ` · ${setup.gaugeMm} mm` : "";
    parts.push(`${setup.stringLabel}${tension}${gauge}`);
  }
  if (setup.gripLabel) parts.push(setup.gripLabel);
  return parts.length ? parts.join(" · ") : "No gear saved yet — pick items below to build your setup.";
}
