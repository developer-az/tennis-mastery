"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { EquipmentTab, LeadTapePiece, LeadTapeSetup } from "@/types/equipment";

export interface MySetup {
  racketSlug: string | null;
  racketLabel: string | null;
  racketLaunchDeg: number | null;
  racketSwingPathDeg: number | null;
  /** Cached racket scores for vs-setup compare without catalog lookup. */
  racketPower: number | null;
  racketSpin: number | null;
  racketControl: number | null;
  racketComfort: number | null;
  racketWeightG: number | null;
  racketSwingweight: number | null;
  stringId: string | null;
  stringLabel: string | null;
  tensionLbs: number | null;
  gaugeMm: number | null;
  stringPower: number | null;
  stringSpin: number | null;
  stringControl: number | null;
  stringComfort: number | null;
  gripId: string | null;
  gripLabel: string | null;
  gripTackiness: number | null;
  gripCushion: number | null;
  gripAbsorbency: number | null;
  gripDurability: number | null;
  leadTape: LeadTapeSetup;
}

interface GearState {
  tab: EquipmentTab;
  setup: MySetup;
  setTab: (tab: EquipmentTab) => void;
  setRacket: (
    slug: string,
    label: string,
    meta?: {
      idealLaunchAngleDeg?: number;
      idealSwingPathDeg?: number;
      power?: number;
      spin?: number;
      control?: number;
      comfort?: number;
      weightG?: number | null;
      swingweight?: number | null;
    },
  ) => void;
  setString: (
    id: string,
    label: string,
    meta?: {
      tensionLbs?: number;
      gaugeMm?: number;
      power?: number;
      spin?: number;
      control?: number;
      comfort?: number;
    },
  ) => void;
  setTension: (tensionLbs: number) => void;
  setGauge: (gaugeMm: number) => void;
  setGrip: (
    id: string,
    label: string,
    meta?: {
      tackiness?: number;
      cushion?: number;
      absorbency?: number;
      durability?: number;
    },
  ) => void;
  setLeadTapePieces: (pieces: LeadTapePiece[]) => void;
  clearSetup: () => void;
}

const emptySetup: MySetup = {
  racketSlug: null,
  racketLabel: null,
  racketLaunchDeg: null,
  racketSwingPathDeg: null,
  racketPower: null,
  racketSpin: null,
  racketControl: null,
  racketComfort: null,
  racketWeightG: null,
  racketSwingweight: null,
  stringId: null,
  stringLabel: null,
  tensionLbs: null,
  gaugeMm: null,
  stringPower: null,
  stringSpin: null,
  stringControl: null,
  stringComfort: null,
  gripId: null,
  gripLabel: null,
  gripTackiness: null,
  gripCushion: null,
  gripAbsorbency: null,
  gripDurability: null,
  leadTape: { pieces: [] },
};

export const useGearStore = create<GearState>()(
  persist(
    (set) => ({
      tab: "rackets",
      setup: emptySetup,
      setTab: (tab) => set({ tab }),
      setRacket: (slug, label, meta) =>
        set((s) => ({
          setup: {
            ...s.setup,
            racketSlug: slug,
            racketLabel: label,
            racketLaunchDeg: meta?.idealLaunchAngleDeg ?? s.setup.racketLaunchDeg,
            racketSwingPathDeg: meta?.idealSwingPathDeg ?? s.setup.racketSwingPathDeg,
            racketPower: meta?.power ?? s.setup.racketPower,
            racketSpin: meta?.spin ?? s.setup.racketSpin,
            racketControl: meta?.control ?? s.setup.racketControl,
            racketComfort: meta?.comfort ?? s.setup.racketComfort,
            racketWeightG: meta?.weightG !== undefined ? meta.weightG : s.setup.racketWeightG,
            racketSwingweight:
              meta?.swingweight !== undefined ? meta.swingweight : s.setup.racketSwingweight,
          },
        })),
      setString: (id, label, meta) =>
        set((s) => ({
          setup: {
            ...s.setup,
            stringId: id,
            stringLabel: label,
            tensionLbs: meta?.tensionLbs ?? s.setup.tensionLbs,
            gaugeMm: meta?.gaugeMm ?? s.setup.gaugeMm,
            stringPower: meta?.power ?? s.setup.stringPower,
            stringSpin: meta?.spin ?? s.setup.stringSpin,
            stringControl: meta?.control ?? s.setup.stringControl,
            stringComfort: meta?.comfort ?? s.setup.stringComfort,
          },
        })),
      setTension: (tensionLbs) =>
        set((s) => ({ setup: { ...s.setup, tensionLbs } })),
      setGauge: (gaugeMm) => set((s) => ({ setup: { ...s.setup, gaugeMm } })),
      setGrip: (id, label, meta) =>
        set((s) => ({
          setup: {
            ...s.setup,
            gripId: id,
            gripLabel: label,
            gripTackiness: meta?.tackiness ?? s.setup.gripTackiness,
            gripCushion: meta?.cushion ?? s.setup.gripCushion,
            gripAbsorbency: meta?.absorbency ?? s.setup.gripAbsorbency,
            gripDurability: meta?.durability ?? s.setup.gripDurability,
          },
        })),
      setLeadTapePieces: (pieces) =>
        set((s) => ({
          setup: { ...s.setup, leadTape: { pieces } },
        })),
      clearSetup: () => set({ setup: emptySetup }),
    }),
    {
      name: "strokeform-my-setup",
      partialize: (s) => ({ setup: s.setup }),
      merge: (persisted, current) => {
        const p = persisted as { setup?: Partial<MySetup> } | undefined;
        return {
          ...current,
          setup: {
            ...emptySetup,
            ...current.setup,
            ...p?.setup,
            leadTape: p?.setup?.leadTape ?? current.setup.leadTape ?? { pieces: [] },
          },
        };
      },
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
  const tapeG = setup.leadTape?.pieces?.reduce((n, p) => n + p.massG, 0) ?? 0;
  if (tapeG > 0) parts.push(`+${tapeG}g lead tape`);
  return parts.length
    ? parts.join(" · ")
    : "No gear saved yet — pick items below to build your setup.";
}
