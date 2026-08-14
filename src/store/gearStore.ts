"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { EquipmentTab, GripKind, LeadTapePiece, LeadTapeSetup } from "@/types/equipment";
import type { GripSizeCode } from "@/lib/equipment/gripSize";
import { gripSizeLabel } from "@/lib/equipment/gripSize";
import {
  type GripLayer,
  canAddGripLayer,
  summarizeGripLayers,
} from "@/lib/equipment/gripStack";

export interface MySetup {
  racketSlug: string | null;
  racketLabel: string | null;
  racketLaunchDeg: number | null;
  racketSwingPathDeg: number | null;
  racketPower: number | null;
  racketSpin: number | null;
  racketControl: number | null;
  racketComfort: number | null;
  racketWeightG: number | null;
  racketSwingweight: number | null;
  racketBalanceMm: number | null;
  stringId: string | null;
  stringLabel: string | null;
  tensionLbs: number | null;
  gaugeMm: number | null;
  stringPower: number | null;
  stringSpin: number | null;
  stringControl: number | null;
  stringComfort: number | null;
  /** @deprecated prefer gripLayers — kept for older saved setups */
  gripId: string | null;
  gripLabel: string | null;
  gripTackiness: number | null;
  gripCushion: number | null;
  gripAbsorbency: number | null;
  gripDurability: number | null;
  /** Ordered butt → outer. At most one replacement (first) + up to 3 overgrips. */
  gripLayers: GripLayer[];
  gripSize: GripSizeCode | null;
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
      balanceMm?: number | null;
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
  /** Replace the whole grip stack with a single product (compat + quick save). */
  setGrip: (
    id: string,
    label: string,
    meta?: {
      tackiness?: number;
      cushion?: number;
      absorbency?: number;
      durability?: number;
      kind?: GripKind;
    },
  ) => void;
  addGripLayer: (layer: GripLayer, meta?: {
    tackiness?: number;
    cushion?: number;
    absorbency?: number;
    durability?: number;
  }) => void;
  removeGripLayerAt: (index: number) => void;
  clearGripLayers: () => void;
  setGripSize: (gripSize: GripSizeCode | null) => void;
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
  racketBalanceMm: null,
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
  gripLayers: [],
  gripSize: null,
  leadTape: { pieces: [] },
};

function syncLegacyGripFields(
  layers: GripLayer[],
  meta?: {
    tackiness?: number;
    cushion?: number;
    absorbency?: number;
    durability?: number;
  },
): Pick<
  MySetup,
  "gripId" | "gripLabel" | "gripTackiness" | "gripCushion" | "gripAbsorbency" | "gripDurability"
> {
  const outer = layers[layers.length - 1] ?? null;
  return {
    gripId: outer?.id ?? null,
    gripLabel: summarizeGripLayers(layers, null) || null,
    gripTackiness: meta?.tackiness ?? null,
    gripCushion: meta?.cushion ?? null,
    gripAbsorbency: meta?.absorbency ?? null,
    gripDurability: meta?.durability ?? null,
  };
}

export const useGearStore = create<GearState>()(
  persist(
    (set) => ({
      tab: "overview",
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
            racketBalanceMm:
              meta?.balanceMm !== undefined ? meta.balanceMm : s.setup.racketBalanceMm,
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
      setGrip: (id, label, meta) => {
        const kind = meta?.kind ?? "overgrip";
        const layers: GripLayer[] = [{ id, label, kind }];
        return set((s) => ({
          setup: {
            ...s.setup,
            gripLayers: layers,
            ...syncLegacyGripFields(layers, meta),
            gripLabel: label,
          },
        }));
      },
      addGripLayer: (layer, meta) =>
        set((s) => {
          const cur = s.setup.gripLayers ?? [];
          if (!canAddGripLayer(cur, layer.kind)) return s;
          let next = [...cur];
          if (layer.kind === "replacement") {
            next = [layer, ...cur.filter((l) => l.kind !== "replacement")];
          } else {
            next = [...cur, layer];
          }
          return {
            setup: {
              ...s.setup,
              gripLayers: next,
              ...syncLegacyGripFields(next, meta),
            },
          };
        }),
      removeGripLayerAt: (index) =>
        set((s) => {
          const next = (s.setup.gripLayers ?? []).filter((_, i) => i !== index);
          return {
            setup: {
              ...s.setup,
              gripLayers: next,
              ...syncLegacyGripFields(next),
            },
          };
        }),
      clearGripLayers: () =>
        set((s) => ({
          setup: {
            ...s.setup,
            gripLayers: [],
            ...syncLegacyGripFields([]),
          },
        })),
      setGripSize: (gripSize) => set((s) => ({ setup: { ...s.setup, gripSize } })),
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
        const raw = { ...emptySetup, ...current.setup, ...p?.setup };
        let gripLayers = raw.gripLayers ?? [];
        if (gripLayers.length === 0 && raw.gripId) {
          gripLayers = [
            {
              id: raw.gripId,
              label: raw.gripLabel ?? raw.gripId,
              kind: "overgrip",
            },
          ];
        }
        return {
          ...current,
          setup: {
            ...raw,
            gripLayers,
            leadTape: p?.setup?.leadTape ?? current.setup.leadTape ?? { pieces: [] },
          },
        };
      },
    },
  ),
);

export function hasAnyGear(setup: MySetup): boolean {
  const tapeG = setup.leadTape?.pieces?.reduce((n, p) => n + p.massG, 0) ?? 0;
  const hasGrip = (setup.gripLayers?.length ?? 0) > 0 || Boolean(setup.gripId);
  return Boolean(setup.racketSlug || setup.stringId || hasGrip || tapeG > 0);
}

export function setupSummary(setup: MySetup): string {
  const parts: string[] = [];
  if (setup.racketLabel) parts.push(setup.racketLabel);
  if (setup.stringLabel) {
    const tension = setup.tensionLbs != null ? ` @ ${setup.tensionLbs} lbs` : "";
    const gauge = setup.gaugeMm != null ? ` · ${setup.gaugeMm} mm` : "";
    parts.push(`${setup.stringLabel}${tension}${gauge}`);
  }
  const gripBit =
    summarizeGripLayers(setup.gripLayers ?? [], setup.gripSize) ||
    (setup.gripLabel
      ? `${setup.gripLabel}${setup.gripSize ? ` · ${gripSizeLabel(setup.gripSize)}` : ""}`
      : "");
  if (gripBit) parts.push(gripBit);
  const tapeG = setup.leadTape?.pieces?.reduce((n, p) => n + p.massG, 0) ?? 0;
  if (tapeG > 0) parts.push(`+${tapeG}g lead tape`);
  return parts.length
    ? parts.join(" · ")
    : "No gear saved yet — pick items below to build your setup.";
}
