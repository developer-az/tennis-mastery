"use client";

import { useDeferredValue, useMemo, useState } from "react";
import type { GripProfile } from "@/types/equipment";
import { matchesEquipmentSearch } from "@/lib/equipment/search";
import { useGearStore } from "@/store/gearStore";
import { GripFeelVisual } from "./GripVisuals";
import { ScoreMeter } from "./ScoreMeter";

const MAX_COMPARE = 3;

export function GripExplorer({ grips }: { grips: GripProfile[] }) {
  const setupGripId = useGearStore((s) => s.setup.gripId);
  const setGrip = useGearStore((s) => s.setGrip);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | "overgrip" | "replacement">("all");
  const [selectedId, setSelectedId] = useState(
    setupGripId && grips.some((g) => g.id === setupGripId)
      ? setupGripId
      : (grips[0]?.id ?? ""),
  );
  const [compareIds, setCompareIds] = useState<string[]>(() => {
    const defaults = grips.slice(0, 2).map((g) => g.id);
    return defaults;
  });
  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(() => {
    const q = deferredQuery.trim();
    return grips.filter((g) => {
      if (kind !== "all" && g.kind !== kind) return false;
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
  }, [grips, deferredQuery, kind]);

  const selected = filtered.find((g) => g.id === selectedId) ?? filtered[0] ?? null;
  const inSetup = selected != null && selected.id === setupGripId;
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

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Tourna, Super Grap, leather…"
            aria-label="Search grips"
            className="w-full flex-1 rounded-md border border-[var(--line)] bg-black/20 px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
          />
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
        </div>

        <p className="text-xs text-[var(--muted)]">
          {filtered.length} grip{filtered.length === 1 ? "" : "s"}
          {kind !== "all" || deferredQuery ? " match" : " in catalog"}
          {" · "}
          Compare up to {MAX_COMPARE} (checkboxes)
        </p>

        <ul className="max-h-[28rem] divide-y divide-[var(--line)] overflow-y-auto border-y border-[var(--line)]">
          {filtered.map((g) => {
            const active = g.id === selected?.id;
            const saved = g.id === setupGripId;
            const inCompare = compareIds.includes(g.id);
            return (
              <li key={g.id} className="flex items-stretch gap-1">
                <label
                  className="flex shrink-0 items-center px-2"
                  title={inCompare ? "Remove from compare" : "Add to compare"}
                >
                  <span className="sr-only">Compare {g.brand} {g.name}</span>
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
                  className={`flex min-w-0 flex-1 flex-col gap-0.5 px-2 py-3 text-left transition ${
                    active ? "bg-[var(--accent-dim)]" : "hover:bg-white/[0.03]"
                  }`}
                >
                  <span className="flex items-center gap-2 font-[family-name:var(--font-display)] text-sm tracking-tight">
                    {g.brand} {g.name}
                    {saved ? (
                      <span className="rounded bg-[var(--amber)]/20 px-1.5 py-0.5 text-[10px] font-sans font-semibold uppercase tracking-wider text-[var(--amber)]">
                        Setup
                      </span>
                    ) : null}
                  </span>
                  <span className="text-xs text-[var(--muted)]">
                    {g.kind === "overgrip" ? "Overgrip" : "Replacement"} · {g.texture} ·{" "}
                    {g.thicknessMm} mm
                  </span>
                </button>
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
        <div className="space-y-6" key={selected.id} style={{ animation: "rise 0.45s ease-out both" }}>
          <header>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--amber)]">
              {selected.kind === "overgrip" ? "Overgrip" : "Replacement grip"}
            </p>
            <h3 className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-tight md:text-4xl">
              {selected.brand} {selected.name}
            </h3>
            <p className="mt-2 text-sm text-[var(--muted)]">Best for: {selected.bestFor}</p>
            <p className="mt-1 text-sm text-[var(--foreground)]/85">{selected.uniqueTrait}</p>
            <button
              type="button"
              onClick={() => setGrip(selected.id, `${selected.brand} ${selected.name}`)}
              className="mt-4 rounded-md px-4 py-2 text-sm font-medium transition hover:brightness-110"
              style={{
                background: inSetup ? "rgba(244,162,97,0.15)" : "var(--accent)",
                color: inSetup ? "var(--amber)" : "#0b1a14",
                boxShadow: inSetup ? "0 0 0 1px var(--amber)" : "none",
              }}
            >
              {inSetup ? "Saved in my setup" : "Save to my setup"}
            </button>
          </header>

          <GripFeelVisual grip={selected} />

          <p className="text-sm leading-relaxed text-[var(--muted)]">{selected.notes}</p>
          <p className="text-sm leading-relaxed text-[var(--foreground)]/85">{selected.feel}</p>

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
                  onClick={() => setCompareIds(selected ? [selected.id] : [])}
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

            {compareGrips.length >= 2 && (
              <GripCompareTable grips={compareGrips} />
            )}
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
  const rows: { key: keyof GripProfile | "thickness"; label: string; get: (g: GripProfile) => string | number }[] = [
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
            const max = numeric
              ? Math.max(...(values as number[]))
              : null;
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
