"use client";

import { useDeferredValue, useMemo, useRef, useState } from "react";
import type { EquipmentTab, GripProfile } from "@/types/equipment";
import { matchesEquipmentSearch } from "@/lib/equipment/search";
import { gripImageUrl } from "@/lib/equipment/media/urls";
import { hasExternalPhoto, photoFirst } from "@/lib/equipment/media/externalImages";
import { GRIP_SIZES } from "@/lib/equipment/gripSize";
import {
  MAX_OVERGRIPS,
  canAddGripLayer,
  gripStackEffect,
  summarizeGripLayers,
} from "@/lib/equipment/gripStack";
import { useGearStore } from "@/store/gearStore";
import { GripFeelVisual } from "./GripVisuals";
import { ScoreMeter } from "./ScoreMeter";
import { EquipmentThumb } from "./EquipmentThumb";
import { CompareToSetup, numericDelta, type CompareDeltaRow } from "./CompareToSetup";
import { AisleChip, ChipRow, ProductCard, SearchField } from "./CatalogShop";
import { GRIP_BRAND_PIN, uniqueSortedBrands } from "@/lib/equipment/shopAisles";

const MAX_COMPARE = 3;

export function GripExplorer({ grips, onSelectTab }: { grips: GripProfile[]; onSelectTab?: (tab: EquipmentTab) => void; }) {
  void onSelectTab;
  const setup = useGearStore((s) => s.setup);
  const layers = useMemo(() => setup.gripLayers ?? [], [setup.gripLayers]);
  const setupGripId = setup.gripId;
  const setGrip = useGearStore((s) => s.setGrip);
  const addGripLayer = useGearStore((s) => s.addGripLayer);
  const removeGripLayerAt = useGearStore((s) => s.removeGripLayerAt);
  const clearGripLayers = useGearStore((s) => s.clearGripLayers);
  const setGripSize = useGearStore((s) => s.setGripSize);
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("all");
  const [kind, setKind] = useState<"all" | "overgrip" | "replacement">("all");
  const [texture, setTexture] = useState("all");
  const [selectedId, setSelectedId] = useState(
    setupGripId && grips.some((g) => g.id === setupGripId)
      ? setupGripId
      : (grips[0]?.id ?? ""),
  );
  const [compareIds, setCompareIds] = useState<string[]>(() => {
    if (setupGripId) {
      const other = grips.find((g) => g.id !== setupGripId)?.id;
      return [setupGripId, ...(other ? [other] : [])];
    }
    return grips.slice(0, 2).map((g) => g.id);
  });
  const deferredQuery = useDeferredValue(query);

  const textures = useMemo(
    () => Array.from(new Set(grips.map((g) => g.texture))).sort(),
    [grips],
  );
  const brands = useMemo(() => {
    const all = uniqueSortedBrands(grips);
    const pinned = GRIP_BRAND_PIN.filter((b) => all.includes(b));
    const pinSet = new Set(pinned);
    return [...pinned, ...all.filter((b) => !pinSet.has(b))];
  }, [grips]);

  const stackFx = useMemo(
    () => gripStackEffect(layers, grips, setup.gripSize),
    [layers, grips, setup.gripSize],
  );

  const filtered = useMemo(() => {
    const q = deferredQuery.trim();
    return grips
      .filter((g) => {
        if (brand !== "all" && g.brand !== brand) return false;
        if (kind !== "all" && g.kind !== kind) return false;
        if (texture !== "all" && g.texture !== texture) return false;
        if (!q) return true;
        return matchesEquipmentSearch(
          q,
          g.brand,
          g.name,
          g.texture,
          g.bestFor,
          g.uniqueTrait,
          g.kind,
        );
      })
      .sort((a, b) => photoFirst(hasExternalPhoto("grip", a.id), hasExternalPhoto("grip", b.id)));
  }, [grips, deferredQuery, brand, kind, texture]);

  const selected = filtered.find((g) => g.id === selectedId) ?? filtered[0] ?? null;
  const inStack =
    selected != null && layers.some((l) => l.id === selected.id);
  const canAddSelected =
    selected != null && canAddGripLayer(layers, selected.kind);
  const detailRef = useRef<HTMLDivElement>(null);

  const replaceStack = (g: GripProfile) => {
    setGrip(g.id, `${g.brand} ${g.name}`, {
      tackiness: g.tackiness,
      cushion: g.cushion,
      absorbency: g.absorbency,
      durability: g.durability,
      kind: g.kind,
    });
  };

  const addLayer = (g: GripProfile) => {
    if (!canAddGripLayer(layers, g.kind) && layers.length > 0) return;
    if (layers.length === 0) {
      replaceStack(g);
      return;
    }
    addGripLayer(
      { id: g.id, label: `${g.brand} ${g.name}`, kind: g.kind },
      {
        tackiness: g.tackiness,
        cushion: g.cushion,
        absorbency: g.absorbency,
        durability: g.durability,
      },
    );
  };

  const compareGrips = compareIds
    .map((id) => grips.find((g) => g.id === id))
    .filter((g): g is GripProfile => g != null);

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_COMPARE) return [...prev.slice(1), id];
      return [...prev, id];
    });
  };

  const vsSetupRows: CompareDeltaRow[] = selected
    ? [
        {
          key: "tack",
          label: "Tackiness",
          value: selected.tackiness,
          baseline: setup.gripTackiness ?? stackFx.tackiness,
          delta: numericDelta(
            selected.tackiness,
            setup.gripTackiness ?? stackFx.tackiness,
          ),
        },
        {
          key: "cushion",
          label: "Cushion",
          value: selected.cushion,
          baseline: setup.gripCushion ?? stackFx.cushion,
          delta: numericDelta(
            selected.cushion,
            setup.gripCushion ?? stackFx.cushion,
          ),
        },
        {
          key: "absorb",
          label: "Absorbency",
          value: selected.absorbency,
          baseline: setup.gripAbsorbency ?? stackFx.absorbency,
          delta: numericDelta(
            selected.absorbency,
            setup.gripAbsorbency ?? stackFx.absorbency,
          ),
        },
        {
          key: "dur",
          label: "Durability",
          value: selected.durability,
          baseline: setup.gripDurability ?? stackFx.durability,
          delta: numericDelta(
            selected.durability,
            setup.gripDurability ?? stackFx.durability,
          ),
        },
      ]
    : [];

  const stackSummary = summarizeGripLayers(layers, setup.gripSize);

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-6">
      <div className="order-1 space-y-3 lg:space-y-4">
        <div className="space-y-3">
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Search Tourna, Super Grap…"
            label="Search grips"
          />
          <ChipRow label="Brand">
            <AisleChip label="All" active={brand === "all"} onClick={() => setBrand("all")} />
            {brands.map((b) => (
              <AisleChip key={b} label={b} active={brand === b} onClick={() => setBrand(b)} />
            ))}
          </ChipRow>
          <ChipRow label="Type">
            <AisleChip label="All kinds" active={kind === "all"} onClick={() => setKind("all")} />
            <AisleChip label="Overgrip" active={kind === "overgrip"} onClick={() => setKind("overgrip")} />
            <AisleChip
              label="Replacement"
              active={kind === "replacement"}
              onClick={() => setKind("replacement")}
            />
          </ChipRow>
          <ChipRow label="Texture">
            <AisleChip label="Any texture" active={texture === "all"} onClick={() => setTexture("all")} />
            {textures.map((t) => (
              <AisleChip key={t} label={t} active={texture === t} onClick={() => setTexture(t)} />
            ))}
          </ChipRow>
        </div>

        {layers.length > 0 ? (
          <div
            className="rounded-md px-3 py-2.5"
            style={{ boxShadow: "inset 0 0 0 1px var(--line)" }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--amber)]">
                Handle stack
              </p>
              <button
                type="button"
                onClick={clearGripLayers}
                className="text-[11px] text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                Clear stack
              </button>
            </div>
            <p className="mt-1 text-sm text-[var(--foreground)]/90">{stackSummary}</p>
            <p className="mt-0.5 text-[11px] text-[var(--muted)]">
              {stackFx.thicknessMm} mm build · {stackFx.buildNote}
            </p>
            <ul className="mt-2 space-y-1.5">
              {layers.map((layer, i) => (
                <li
                  key={`${layer.id}-${i}`}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span>
                    <span className="text-[var(--muted)]">
                      {i === 0 ? "Inner" : i === layers.length - 1 ? "Outer" : `Layer ${i + 1}`}
                      {" · "}
                    </span>
                    {layer.label}
                    <span className="text-[var(--muted)]">
                      {" "}
                      ({layer.kind === "overgrip" ? "overgrip" : "replacement"})
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeGripLayerAt(i)}
                    className="shrink-0 text-[var(--amber)] hover:underline"
                    aria-label={`Remove ${layer.label}`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-[var(--muted)]">
              Up to {MAX_OVERGRIPS} overgrips
              {stackFx.hasReplacement ? " over a replacement grip" : ""}. Size L0–L5 is set below
              or in Dial your setup.
            </p>
          </div>
        ) : null}

        <p className="text-xs text-[var(--muted)]">
          {filtered.length} grip{filtered.length === 1 ? "" : "s"}
          {kind !== "all" || texture !== "all" || deferredQuery || brand !== "all" ? " match" : " in catalog"}
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {filtered.map((g) => (
            <ProductCard
              key={g.id}
              image={gripImageUrl(g)}
              alt={`${g.brand} ${g.name}`}
              brand={g.brand}
              name={g.name}
              badge={g.kind === "overgrip" ? "Overgrip" : "Replacement"}
              meta={`${g.texture} · ${g.thicknessMm} mm`}
              scores={[
                { label: "Tack", value: g.tackiness, color: "var(--chart-spin)" },
                { label: "Cushion", value: g.cushion, color: "var(--chart-comfort)" },
                { label: "Grip", value: g.absorbency, color: "var(--chart-control)" },
              ]}
              saved={layers.some((l) => l.id === g.id)}
              selected={g.id === selected?.id}
              onSelect={() => {
                setSelectedId(g.id);
                if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
                  requestAnimationFrame(() =>
                    detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
                  );
                }
              }}
              onSave={() => addLayer(g)}
              saveLabel={layers.length === 0 ? "Add to bag" : "Add layer"}
              savedLabel="In stack"
            />
          ))}
        </div>
        {filtered.length === 0 ? (
          <p className="px-1 py-8 text-sm text-[var(--muted)]">
            No grips match. Try overgrip, or search Tourna.
          </p>
        ) : null}
      </div>

      {selected && (
        <div
          ref={detailRef} className="order-2 scroll-mt-16 space-y-6"
          key={selected.id}
          style={{ animation: "rise 0.45s ease-out both" }}
        >
          <header className="flex flex-wrap gap-5">
            <EquipmentThumb
              src={gripImageUrl(selected)}
              alt={`${selected.brand} ${selected.name}`}
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--amber)]">
                {selected.kind === "overgrip" ? "Overgrip" : "Replacement grip"}
              </p>
              <h3 className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-tight md:text-4xl">
                {selected.brand} {selected.name}
              </h3>
              <p className="mt-2 text-sm text-[var(--muted)]">Best for: {selected.bestFor}</p>
              <p className="mt-1 text-sm text-[var(--foreground)]/85">{selected.uniqueTrait}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => addLayer(selected)}
                  disabled={!canAddSelected && layers.length > 0}
                  className="min-h-11 rounded-md px-4 py-2.5 text-sm font-medium transition hover:brightness-110 disabled:opacity-40"
                  style={{
                    background: inStack ? "rgba(244,162,97,0.15)" : "var(--accent)",
                    color: inStack ? "var(--amber)" : "var(--accent-ink)",
                    boxShadow: inStack ? "0 0 0 1px var(--amber)" : "none",
                  }}
                >
                  {layers.length === 0
                    ? "Save to my setup"
                    : canAddSelected
                      ? selected.kind === "overgrip"
                        ? "Add overgrip to stack"
                        : "Set as replacement (inner)"
                      : inStack
                        ? "Already in stack"
                        : "Stack full (max 3 overgrips)"}
                </button>
                {layers.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => replaceStack(selected)}
                    className="min-h-11 rounded-md px-4 py-2.5 text-sm transition hover:bg-[var(--overlay-hover)]"
                    style={{ boxShadow: "0 0 0 1px var(--line)" }}
                  >
                    Replace whole stack
                  </button>
                ) : null}
              </div>

              <div className="mt-4">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  Your grip size (frame handle)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {GRIP_SIZES.map((g) => {
                    const active = setup.gripSize === g.code;
                    return (
                      <button
                        key={g.code}
                        type="button"
                        title={g.hint}
                        aria-pressed={active}
                        onClick={() => setGripSize(active ? null : g.code)}
                        className="min-h-10 rounded-md px-2.5 py-1.5 text-sm transition"
                        style={{
                          background: active ? "rgba(244,162,97,0.18)" : "transparent",
                          color: active ? "var(--amber)" : "var(--foreground)",
                          boxShadow: active
                            ? "0 0 0 1px var(--amber)"
                            : "0 0 0 1px var(--line)",
                        }}
                      >
                        {g.code}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-[11px] text-[var(--muted)]">
                  {setup.gripSize
                    ? `${GRIP_SIZES.find((x) => x.code === setup.gripSize)?.label} · effective build ~${stackFx.effectiveSizeIndex.toFixed(1)} with stack`
                    : "L0–L5 stamped on the butt cap — size + overgrip count both enter the mold math."}
                </p>
              </div>
            </div>
          </header>

          <GripFeelVisual grip={selected} />

          <p className="text-sm leading-relaxed text-[var(--muted)]">{selected.notes}</p>
          <p className="text-sm leading-relaxed text-[var(--foreground)]/85">{selected.feel}</p>

          <CompareToSetup
            title={stackSummary ? `Vs ${stackSummary}` : "Vs my setup"}
            subtitle="Compare tack, cushion, and absorbency to the outer layer you already use."
            rows={vsSetupRows}
            emptyHint="Save a grip to My setup to compare against what you have tested on court."
          />

          <section className="border-t border-[var(--line)] pt-6">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h4 className="font-[family-name:var(--font-display)] text-lg tracking-tight">
                  Compare grips
                </h4>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Side-by-side tack, cushion, absorbency, durability, and thickness.
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleCompare(selected.id)}
                className="text-xs text-[var(--muted)]"
              >
                {compareIds.includes(selected.id) ? "In compare" : "Compare this grip"}
              </button>
              {compareGrips.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setCompareIds(
                      setupGripId
                        ? [setupGripId]
                        : selected
                          ? [selected.id]
                          : [],
                    )
                  }
                  className="text-xs text-[var(--muted)] transition hover:text-[var(--foreground)]"
                >
                  Clear compare
                </button>
              )}
            </div>

            {compareGrips.length < 2 ? (
              <p className="text-sm text-[var(--muted)]">
                Check at least two grips in the list to compare attributes.
              </p>
            ) : (
              <div
                className={`grid gap-4 ${
                  compareGrips.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"
                }`}
              >
                {compareGrips.map((g) => (
                  <GripCompareColumn key={g.id} grip={g} highlight={g.id === selected.id} />
                ))}
              </div>
            )}

            {compareGrips.length >= 2 && <GripCompareTable grips={compareGrips} />}
          </section>
        </div>
      )}
    </div>
  );
}

function GripCompareColumn({
  grip,
  highlight,
}: {
  grip: GripProfile;
  highlight: boolean;
}) {
  return (
    <div
      className="space-y-3 rounded-md p-3"
      style={{
        boxShadow: highlight
          ? "inset 0 0 0 1px var(--amber)"
          : "inset 0 0 0 1px var(--line)",
        background: highlight ? "rgba(244,162,97,0.06)" : "transparent",
      }}
    >
      <EquipmentThumb src={gripImageUrl(grip)} alt={`${grip.brand} ${grip.name}`} size="md" />
      <div>
        <p className="font-[family-name:var(--font-display)] text-sm tracking-tight">
          {grip.brand} {grip.name}
        </p>
        <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
          {grip.kind === "overgrip" ? "Overgrip" : "Replacement"} · {grip.texture}
        </p>
      </div>
      <ScoreMeter label="Tackiness" value={grip.tackiness} />
      <ScoreMeter label="Cushion" value={grip.cushion} accent="var(--chart-power)" />
      <ScoreMeter label="Absorbency" value={grip.absorbency} accent="var(--chart-spin)" />
      <ScoreMeter label="Durability" value={grip.durability} accent="var(--chart-comfort)" />
      <p className="text-xs tabular-nums text-[var(--muted)]">
        Thickness {grip.thicknessMm.toFixed(2)} mm
      </p>
    </div>
  );
}

function GripCompareTable({ grips }: { grips: GripProfile[] }) {
  const rows: {
    key: keyof GripProfile | "thickness";
    label: string;
    get: (g: GripProfile) => string | number;
  }[] = [
    { key: "tackiness", label: "Tackiness", get: (g) => g.tackiness },
    { key: "cushion", label: "Cushion", get: (g) => g.cushion },
    { key: "absorbency", label: "Absorbency", get: (g) => g.absorbency },
    { key: "durability", label: "Durability", get: (g) => g.durability },
    { key: "thickness", label: "Thickness (mm)", get: (g) => g.thicknessMm.toFixed(2) },
    { key: "texture", label: "Texture", get: (g) => g.texture },
  ];

  return (
    <div className="mt-6 overflow-x-auto border-t border-[var(--line)] pt-4">
      <table className="w-full min-w-[28rem] text-left text-xs">
        <thead>
          <tr className="text-[var(--muted)]">
            <th className="py-2 pr-3 font-medium">Attribute</th>
            {grips.map((g) => (
              <th key={g.id} className="px-2 py-2 font-medium text-[var(--foreground)]">
                {g.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const numeric = grips.every((g) => typeof row.get(g) === "number");
            const values = grips.map((g) => row.get(g));
            const max = numeric ? Math.max(...(values as number[])) : null;
            return (
              <tr key={row.label} className="border-t border-[var(--line)]">
                <td className="py-2 pr-3 text-[var(--muted)]">{row.label}</td>
                {grips.map((g, i) => {
                  const v = values[i];
                  const isBest = numeric && max != null && v === max && max > 0;
                  return (
                    <td
                      key={g.id}
                      className="px-2 py-2 tabular-nums"
                      style={{ color: isBest ? "var(--amber)" : "var(--foreground)" }}
                    >
                      {v}
                      {isBest ? " ·" : ""}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
