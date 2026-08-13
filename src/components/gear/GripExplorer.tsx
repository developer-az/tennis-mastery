"use client";

import { useDeferredValue, useMemo, useState } from "react";
import type { GripProfile } from "@/types/equipment";
import { matchesEquipmentSearch } from "@/lib/equipment/search";
import { gripImageUrl } from "@/lib/equipment/media/urls";
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

const MAX_COMPARE = 3;

export function GripExplorer({ grips }: { grips: GripProfile[] }) {
  const setup = useGearStore((s) => s.setup);
  const layers = setup.gripLayers ?? [];
  const setupGripId = setup.gripId;
  const setGrip = useGearStore((s) => s.setGrip);
  const addGripLayer = useGearStore((s) => s.addGripLayer);
  const removeGripLayerAt = useGearStore((s) => s.removeGripLayerAt);
  const clearGripLayers = useGearStore((s) => s.clearGripLayers);
  const setGripSize = useGearStore((s) => s.setGripSize);
  const [query, setQuery] = useState("");
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

  const stackFx = useMemo(
    () => gripStackEffect(layers, grips, setup.gripSize),
    [layers, grips, setup.gripSize],
  );

  const filtered = useMemo(() => {
    const q = deferredQuery.trim();
    return grips.filter((g) => {
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
    });
  }, [grips, deferredQuery, kind, texture]);

  const selected = filtered.find((g) => g.id === selectedId) ?? filtered[0] ?? null;
  const inStack =
    selected != null && layers.some((l) => l.id === selected.id);
  const canAddSelected =
    selected != null && canAddGripLayer(layers, selected.kind);
  const [filtersOpen, setFiltersOpen] = useState(false);

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
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-8">
      <div className="order-1 space-y-3 lg:space-y-4">
        <div className="sticky top-[6.5rem] z-20 -mx-1 space-y-2 bg-[var(--background)]/95 px-1 py-2 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Tourna, Super Grap, leather…"
            aria-label="Search grips"
            inputMode="search"
            enterKeyHint="search"
            autoCapitalize="off"
            autoCorrect="off"
            className="w-full rounded-md border border-[var(--line)] bg-black/20 px-3 py-3 text-base outline-none focus:border-[var(--accent)] sm:py-2.5 sm:text-sm"
          />
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm text-[var(--muted)] lg:hidden"
            style={{ boxShadow: "0 0 0 1px var(--line)" }}
            onClick={() => setFiltersOpen((o) => !o)}
            aria-expanded={filtersOpen}
          >
            <span>Filters</span>
            <span className="text-xs">{filtersOpen ? "Hide" : "Show"}</span>
          </button>
          <div className={`grid grid-cols-2 gap-2 ${filtersOpen ? "" : "hidden lg:grid"}`}>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as typeof kind)}
              aria-label="Grip kind"
              className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="all">All grips</option>
              <option value="overgrip">Overgrips</option>
              <option value="replacement">Replacement grips</option>
            </select>
            <select
              value={texture}
              onChange={(e) => setTexture(e.target.value)}
              aria-label="Texture"
              className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="all">Any texture</option>
              {textures.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
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
          {kind !== "all" || texture !== "all" || deferredQuery ? " match" : " in catalog"}
          {" · "}
          Compare up to {MAX_COMPARE} (checkboxes)
        </p>

        <ul className="max-h-[min(70vh,28rem)] divide-y divide-[var(--line)] overflow-y-auto overscroll-contain border-y border-[var(--line)] md:max-h-[32rem]">
          {filtered.map((g) => {
            const active = g.id === selected?.id;
            const saved = layers.some((l) => l.id === g.id);
            const inCompare = compareIds.includes(g.id);
            const canAdd = canAddGripLayer(layers, g.kind);
            return (
              <li key={g.id} className="flex items-stretch gap-0.5">
                <label
                  className="hidden shrink-0 items-center px-2 sm:flex"
                  title={inCompare ? "Remove from compare" : "Add to compare"}
                >
                  <span className="sr-only">
                    Compare {g.brand} {g.name}
                  </span>
                  <input
                    type="checkbox"
                    checked={inCompare}
                    onChange={() => toggleCompare(g.id)}
                    className="h-3.5 w-3.5 accent-[var(--amber)]"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setSelectedId(g.id)}
                  aria-pressed={active}
                  className={`flex min-w-0 flex-1 items-center gap-2.5 px-2 py-3 text-left transition sm:gap-3 ${
                    active ? "bg-[var(--accent-dim)]" : "hover:bg-white/[0.03]"
                  }`}
                >
                  <EquipmentThumb
                    src={gripImageUrl(g)}
                    alt={`${g.brand} ${g.name}`}
                    size="sm"
                  />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="flex flex-wrap items-center gap-2 font-[family-name:var(--font-display)] text-sm tracking-tight">
                      {g.brand} {g.name}
                      {saved ? (
                        <span className="rounded bg-[var(--amber)]/20 px-1.5 py-0.5 text-[10px] font-sans font-semibold uppercase tracking-wider text-[var(--amber)]">
                          In stack
                        </span>
                      ) : null}
                    </span>
                    <span className="text-xs text-[var(--muted)]">
                      {g.kind === "overgrip" ? "Overgrip" : "Replacement"} · {g.texture} ·{" "}
                      {g.thicknessMm} mm
                    </span>
                  </span>
                </button>
                <div className="m-1.5 flex shrink-0 flex-col justify-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      addLayer(g);
                    }}
                    disabled={!canAdd && layers.length > 0}
                    className="rounded-md px-2.5 py-2 text-[11px] font-semibold uppercase tracking-wide transition active:scale-[0.98] disabled:opacity-40 sm:min-h-10 sm:px-3 sm:py-2.5 sm:text-xs"
                    style={{
                      background: "var(--accent)",
                      color: "#0b1a14",
                    }}
                    aria-label={
                      layers.length === 0
                        ? `Save ${g.brand} ${g.name} to my setup`
                        : `Add ${g.brand} ${g.name} to grip stack`
                    }
                  >
                    {layers.length === 0 ? "Save" : "Add"}
                  </button>
                  {layers.length > 0 ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        replaceStack(g);
                      }}
                      className="rounded-md px-2 py-1 text-[10px] text-[var(--muted)]"
                      style={{ boxShadow: "0 0 0 1px var(--line)" }}
                      aria-label={`Replace stack with ${g.brand} ${g.name}`}
                    >
                      Replace
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="px-2 py-8 text-sm text-[var(--muted)]">
              No grips match that search. Try All grips or a shorter query.
            </li>
          )}
        </ul>
      </div>

      {selected && (
        <div
          className="order-2 space-y-6"
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
                    color: inStack ? "var(--amber)" : "#0b1a14",
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
                    className="min-h-11 rounded-md px-4 py-2.5 text-sm transition hover:bg-white/5"
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
                  Select up to {MAX_COMPARE} with the list checkboxes.
                </p>
              </div>
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
      <ScoreMeter label="Cushion" value={grip.cushion} accent="#f4a261" />
      <ScoreMeter label="Absorbency" value={grip.absorbency} accent="#7dd3fc" />
      <ScoreMeter label="Durability" value={grip.durability} accent="#e9c46a" />
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
