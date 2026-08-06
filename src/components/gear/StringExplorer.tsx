"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { StringProfile } from "@/types/equipment";
import { materialLabel, shapeLabel } from "@/lib/equipment/strings";
import { SpinPotentialRing, TensionCurve } from "./StringVisuals";
import { ScoreMeter } from "./ScoreMeter";

export function StringExplorer({ strings }: { strings: StringProfile[] }) {
  const [query, setQuery] = useState("");
  const [material, setMaterial] = useState("all");
  const [selectedId, setSelectedId] = useState(strings[0]?.id ?? "");
  const [compareId, setCompareId] = useState(strings[1]?.id ?? strings[0]?.id ?? "");
  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return strings.filter((s) => {
      if (material !== "all" && s.material !== material) return false;
      if (!q) return true;
      return `${s.brand} ${s.name} ${s.material} ${s.shape} ${s.bestFor}`.toLowerCase().includes(q);
    });
  }, [strings, deferredQuery, material]);

  useEffect(() => {
    if (!filtered.some((s) => s.id === selectedId)) {
      setSelectedId(filtered[0]?.id ?? "");
    }
  }, [filtered, selectedId]);

  const selected = filtered.find((s) => s.id === selectedId) ?? filtered[0];
  const compare = strings.find((s) => s.id === compareId) ?? strings[0];
  const [lo, hi] = selected
    ? selected.tensionRangeLbs
    : ([48, 58] as [number, number]);
  const [tension, setTension] = useState(selected?.recommendedTensionLbs ?? 52);

  useEffect(() => {
    if (selected) setTension(selected.recommendedTensionLbs);
  }, [selected]);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search RPM, ALU Power, Hyper-G…"
            className="w-full flex-1 rounded-md border border-[var(--line)] bg-black/20 px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
          />
          <select
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
            className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
          >
            <option value="all">All materials</option>
            <option value="polyester">Polyester</option>
            <option value="co-poly">Co-poly</option>
            <option value="multifilament">Multifilament</option>
            <option value="synthetic-gut">Synthetic gut</option>
            <option value="natural-gut">Natural gut</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>

        <ul className="max-h-[28rem] divide-y divide-[var(--line)] overflow-y-auto border-y border-[var(--line)]">
          {filtered.map((s) => {
            const active = s.id === selected?.id;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(s.id)}
                  className={`flex w-full flex-col gap-0.5 px-2 py-3 text-left transition ${
                    active ? "bg-[var(--accent-dim)]" : "hover:bg-white/[0.03]"
                  }`}
                >
                  <span className="font-[family-name:var(--font-display)] text-sm tracking-tight">
                    {s.brand} {s.name}
                  </span>
                  <span className="text-xs text-[var(--muted)]">
                    {materialLabel(s.material)} · {shapeLabel(s.shape)} · spin {s.spin}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {selected && (
        <div className="space-y-8" key={selected.id} style={{ animation: "rise 0.45s ease-out both" }}>
          <header>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-300">
              {materialLabel(selected.material)} · {shapeLabel(selected.shape)}
            </p>
            <h3 className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-tight md:text-4xl">
              {selected.brand} {selected.name}
            </h3>
            <p className="mt-2 text-sm text-[var(--muted)]">{selected.feel}</p>
            <p className="mt-2 text-sm text-[var(--foreground)]/85">
              Best for: {selected.bestFor}
            </p>
          </header>

          <SpinPotentialRing value={selected.spin} />

          <div>
            <div className="mb-3 flex items-end justify-between gap-4">
              <label className="flex-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Tension ({lo}–{hi} lbs)
                </span>
                <input
                  type="range"
                  min={lo}
                  max={hi}
                  step={0.5}
                  value={tension}
                  onChange={(e) => setTension(parseFloat(e.target.value))}
                  className="mt-3 w-full"
                />
              </label>
              <p className="font-[family-name:var(--font-display)] text-2xl tabular-nums">
                {tension}
                <span className="ml-1 text-sm text-[var(--muted)]">lbs</span>
              </p>
            </div>
            <TensionCurve string={selected} tension={tension} />
          </div>

          <section className="border-t border-[var(--line)] pt-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h4 className="font-[family-name:var(--font-display)] text-lg tracking-tight">
                Compare control & spin
              </h4>
              <select
                value={compareId}
                onChange={(e) => setCompareId(e.target.value)}
                className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              >
                {strings.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.brand} {s.name}
                  </option>
                ))}
              </select>
            </div>
            {compare && (
              <div className="grid gap-4 sm:grid-cols-2">
                <CompareColumn label={selected.name} spin={selected.spin} control={selected.control} />
                <CompareColumn label={compare.name} spin={compare.spin} control={compare.control} />
              </div>
            )}
            <p className="mt-4 text-sm leading-relaxed text-[var(--muted)]">{selected.notes}</p>
          </section>
        </div>
      )}
    </div>
  );
}

function CompareColumn({
  label,
  spin,
  control,
}: {
  label: string;
  spin: number;
  control: number;
}) {
  return (
    <div className="space-y-3 border-t border-[var(--line)] pt-3">
      <p className="text-sm font-medium">{label}</p>
      <ScoreMeter label="Spin potential" value={spin} accent="#7dd3fc" />
      <ScoreMeter label="Control" value={control} />
    </div>
  );
}
