"use client";

import { useDeferredValue, useMemo, useState } from "react";
import type { RacketCatalogMeta, RacketProfile } from "@/types/equipment";
import { LaunchAngleVisual, SwingPathVisual } from "./RacketVisuals";
import { ScoreGrid } from "./ScoreMeter";

export function RacketExplorer({
  initialRackets,
  meta,
}: {
  initialRackets: RacketProfile[];
  meta: RacketCatalogMeta;
}) {
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("all");
  const [style, setStyle] = useState("all");
  const [selectedSlug, setSelectedSlug] = useState(initialRackets[0]?.slug ?? "");
  const deferredQuery = useDeferredValue(query);

  const brands = useMemo(
    () => Array.from(new Set(initialRackets.map((r) => r.brand))).sort(),
    [initialRackets],
  );
  const styles = useMemo(
    () => Array.from(new Set(initialRackets.map((r) => r.style))).sort(),
    [initialRackets],
  );

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return initialRackets.filter((r) => {
      if (brand !== "all" && r.brand !== brand) return false;
      if (style !== "all" && r.style !== style) return false;
      if (!q) return true;
      const hay = `${r.brand} ${r.model} ${r.year} ${r.style} ${r.stringPattern}`.toLowerCase();
      return hay.includes(q);
    });
  }, [initialRackets, deferredQuery, brand, style]);

  const selected =
    filtered.find((r) => r.slug === selectedSlug) ?? filtered[0] ?? null;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">Search rackets</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Pure Aero, Blade, Ezone…"
              className="w-full rounded-md border border-[var(--line)] bg-black/20 px-3 py-2.5 text-sm outline-none transition focus:border-[var(--accent)]"
            />
          </label>
          <select
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
          >
            <option value="all">All brands</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
          >
            <option value="all">All styles</option>
            {styles.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <p className="text-xs text-[var(--muted)]">
          {filtered.length} frames · {meta.source} v{meta.version}
          {meta.live ? " · live" : " · offline snapshot"} · updated {meta.updated}
        </p>

        <ul className="max-h-[28rem] divide-y divide-[var(--line)] overflow-y-auto border-y border-[var(--line)]">
          {filtered.slice(0, 120).map((r) => {
            const active = r.slug === selected?.slug;
            return (
              <li key={r.slug}>
                <button
                  type="button"
                  onClick={() => setSelectedSlug(r.slug)}
                  className={`flex w-full flex-col gap-0.5 px-2 py-3 text-left transition ${
                    active ? "bg-[var(--accent-dim)]" : "hover:bg-white/[0.03]"
                  }`}
                >
                  <span className="font-[family-name:var(--font-display)] text-sm tracking-tight">
                    {r.brand} {r.model}
                  </span>
                  <span className="text-xs text-[var(--muted)]">
                    {r.year} · {r.headSizeSqIn}&quot; · {r.stringPattern} · {r.style}
                  </span>
                </button>
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="px-2 py-8 text-sm text-[var(--muted)]">No rackets match that search.</li>
          )}
        </ul>
      </div>

      {selected && (
        <div
          className="space-y-8"
          key={selected.slug}
          style={{ animation: "rise 0.45s ease-out both" }}
        >
          <header>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              {selected.style}
            </p>
            <h3 className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-tight md:text-4xl">
              {selected.brand} {selected.model}
            </h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {selected.year}
              {selected.weightG ? ` · ${selected.weightG}g` : ""}
              {selected.swingweight ? ` · SW ${selected.swingweight}` : ""}
              {selected.stiffnessRa ? ` · RA ${selected.stiffnessRa}` : ""}
              {selected.balanceMm ? ` · ${selected.balanceMm}mm balance` : ""}
            </p>
            {(selected.atpPlayers.length > 0 || selected.wtaPlayers.length > 0) && (
              <p className="mt-2 text-xs text-[var(--foreground)]/70">
                Seen with: {[...selected.atpPlayers, ...selected.wtaPlayers].slice(0, 6).join(", ")}
              </p>
            )}
          </header>

          <div className="grid gap-8 md:grid-cols-2">
            <LaunchAngleVisual degrees={selected.idealLaunchAngleDeg} />
            <SwingPathVisual degrees={selected.idealSwingPathDeg} />
          </div>

          <ScoreGrid
            scores={[
              { label: "Power", value: selected.power, accent: "#f4a261" },
              { label: "Spin", value: selected.spin, accent: "#7dd3fc" },
              { label: "Control", value: selected.control },
              { label: "Comfort", value: selected.comfort, accent: "#e9c46a" },
            ]}
          />

          <p className="text-sm leading-relaxed text-[var(--muted)]">{selected.summary}</p>
        </div>
      )}
    </div>
  );
}
