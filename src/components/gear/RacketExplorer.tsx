"use client";

import { useDeferredValue, useMemo, useState } from "react";
import type { RacketCatalogMeta, RacketProfile } from "@/types/equipment";
import { useGearStore } from "@/store/gearStore";
import { LaunchAngleVisual, SwingPathVisual } from "./RacketVisuals";
import { ScoreGrid } from "./ScoreMeter";

const PAGE = 80;

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
  const [weightBand, setWeightBand] = useState("all");
  const [headBand, setHeadBand] = useState("all");
  const [sort, setSort] = useState<"newest" | "spin" | "control" | "power" | "weight">("newest");
  const [visible, setVisible] = useState(PAGE);
  const [filterEpoch, setFilterEpoch] = useState("");
  const setupSlug = useGearStore((s) => s.setup.racketSlug);
  const setRacket = useGearStore((s) => s.setRacket);
  const [selectedSlug, setSelectedSlug] = useState(
    setupSlug && initialRackets.some((r) => r.slug === setupSlug)
      ? setupSlug
      : (initialRackets[0]?.slug ?? ""),
  );
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
    const list = initialRackets.filter((r) => {
      if (brand !== "all" && r.brand !== brand) return false;
      if (style !== "all" && r.style !== style) return false;
      if (weightBand === "light" && !(r.weightG != null && r.weightG < 295)) return false;
      if (weightBand === "mid" && !(r.weightG != null && r.weightG >= 295 && r.weightG < 315))
        return false;
      if (weightBand === "heavy" && !(r.weightG != null && r.weightG >= 315)) return false;
      if (headBand === "mid" && !(r.headSizeSqIn != null && r.headSizeSqIn < 98)) return false;
      if (
        headBand === "midplus" &&
        !(r.headSizeSqIn != null && r.headSizeSqIn >= 98 && r.headSizeSqIn <= 100)
      )
        return false;
      if (headBand === "oversize" && !(r.headSizeSqIn != null && r.headSizeSqIn > 100)) return false;
      if (!q) return true;
      const hay = `${r.brand} ${r.model} ${r.year} ${r.style} ${r.stringPattern}`.toLowerCase();
      return hay.includes(q);
    });

    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sort) {
        case "spin":
          return b.spin - a.spin;
        case "control":
          return b.control - a.control;
        case "power":
          return b.power - a.power;
        case "weight":
          return (b.weightG ?? 0) - (a.weightG ?? 0);
        default:
          return b.year - a.year || a.brand.localeCompare(b.brand);
      }
    });
    return sorted;
  }, [initialRackets, deferredQuery, brand, style, weightBand, headBand, sort]);

  const nextEpoch = `${deferredQuery}|${brand}|${style}|${weightBand}|${headBand}|${sort}`;
  let pageSize = visible;
  if (filterEpoch !== nextEpoch) {
    setFilterEpoch(nextEpoch);
    setVisible(PAGE);
    pageSize = PAGE;
  }

  const selected =
    filtered.find((r) => r.slug === selectedSlug) ?? filtered[0] ?? null;
  const shown = filtered.slice(0, pageSize);
  const inSetup = selected != null && selected.slug === setupSlug;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="space-y-4">
        <div className="flex flex-col gap-3">
          <label className="relative flex-1">
            <span className="sr-only">Search rackets</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Pure Aero, Blade, Ezone…"
              className="w-full rounded-md border border-[var(--line)] bg-black/20 px-3 py-2.5 text-sm outline-none transition focus:border-[var(--accent)]"
            />
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <select
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              aria-label="Brand"
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
              aria-label="Style"
              className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="all">All styles</option>
              {styles.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={weightBand}
              onChange={(e) => setWeightBand(e.target.value)}
              aria-label="Weight"
              className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="all">Any weight</option>
              <option value="light">&lt; 295 g</option>
              <option value="mid">295–314 g</option>
              <option value="heavy">315 g+</option>
            </select>
            <select
              value={headBand}
              onChange={(e) => setHeadBand(e.target.value)}
              aria-label="Head size"
              className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="all">Any head size</option>
              <option value="mid">Mid (&lt; 98&quot;)</option>
              <option value="midplus">Midplus (98–100&quot;)</option>
              <option value="oversize">Oversize (&gt; 100&quot;)</option>
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              aria-label="Sort"
              className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] sm:col-span-2"
            >
              <option value="newest">Sort: newest</option>
              <option value="spin">Sort: spin</option>
              <option value="control">Sort: control</option>
              <option value="power">Sort: power</option>
              <option value="weight">Sort: weight</option>
            </select>
          </div>
        </div>

        <p className="text-xs text-[var(--muted)]">
          Showing {shown.length} of {filtered.length} frames
          {filtered.length !== initialRackets.length
            ? ` (filtered from ${initialRackets.length})`
            : ""}{" "}
          · {meta.source} v{meta.version}
          {meta.live ? " · live" : " · offline snapshot"} · updated {meta.updated}
        </p>

        <ul className="max-h-[28rem] divide-y divide-[var(--line)] overflow-y-auto border-y border-[var(--line)]">
          {shown.map((r) => {
            const active = r.slug === selected?.slug;
            const saved = r.slug === setupSlug;
            return (
              <li key={r.slug}>
                <button
                  type="button"
                  onClick={() => setSelectedSlug(r.slug)}
                  aria-pressed={active}
                  className={`flex w-full flex-col gap-0.5 px-2 py-3 text-left transition ${
                    active ? "bg-[var(--accent-dim)]" : "hover:bg-white/[0.03]"
                  }`}
                >
                  <span className="flex items-center gap-2 font-[family-name:var(--font-display)] text-sm tracking-tight">
                    {r.brand} {r.model}
                    {saved ? (
                      <span className="rounded bg-[var(--accent)]/20 px-1.5 py-0.5 text-[10px] font-sans font-semibold uppercase tracking-wider text-[var(--accent)]">
                        Setup
                      </span>
                    ) : null}
                  </span>
                  <span className="text-xs text-[var(--muted)]">
                    {r.year} · {r.headSizeSqIn}&quot; · {r.stringPattern} · {r.style}
                  </span>
                </button>
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="px-2 py-8 text-sm text-[var(--muted)]">
              No rackets match those filters. Try clearing weight or head size.
            </li>
          )}
        </ul>
        {pageSize < filtered.length ? (
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE)}
            className="w-full rounded-md px-3 py-2 text-sm text-[var(--muted)] transition hover:bg-white/5 hover:text-[var(--foreground)]"
            style={{ boxShadow: "0 0 0 1px var(--line)" }}
          >
            Load more ({filtered.length - pageSize} remaining)
          </button>
        ) : null}
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
            <button
              type="button"
              onClick={() =>
                setRacket(selected.slug, `${selected.brand} ${selected.model}`)
              }
              className="mt-4 rounded-md px-4 py-2 text-sm font-medium transition hover:brightness-110"
              style={{
                background: inSetup ? "var(--accent-dim)" : "var(--accent)",
                color: inSetup ? "var(--accent)" : "#0b1a14",
                boxShadow: inSetup ? "0 0 0 1px var(--accent)" : "none",
              }}
            >
              {inSetup ? "Saved in my setup" : "Save to my setup"}
            </button>
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
