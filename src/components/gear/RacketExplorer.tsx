"use client";

import { useDeferredValue, useMemo, useState } from "react";
import type { RacketCatalogMeta, RacketProfile } from "@/types/equipment";
import { matchesEquipmentSearch, searchMatchScore } from "@/lib/equipment/search";
import { derivePlayerFit } from "@/lib/equipment/playerFit";
import { racketImageUrl } from "@/lib/equipment/media/urls";
import { useGearStore } from "@/store/gearStore";
import { LaunchAngleVisual, SwingPathVisual, StrikeCoachingBullets } from "./RacketVisuals";
import { PlayerFitBadges } from "./PlayerFitBadges";
import { ScoreGrid, ScoreMeter } from "./ScoreMeter";
import { EquipmentThumb } from "./EquipmentThumb";
import { CompareToSetup, numericDelta, type CompareDeltaRow } from "./CompareToSetup";

const PAGE = 80;
const MAX_COMPARE = 3;

function patternBand(pattern: string | null): "16x19" | "18x20" | "other" {
  if (!pattern) return "other";
  const p = pattern.toLowerCase().replace(/\s/g, "").replace("×", "x");
  if (p.startsWith("16x19")) return "16x19";
  if (p.startsWith("18x20")) return "18x20";
  return "other";
}

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
  const [pattern, setPattern] = useState("all");
  const [sort, setSort] = useState<"newest" | "spin" | "control" | "power" | "weight">("newest");
  const [visible, setVisible] = useState(PAGE);
  const [filterEpoch, setFilterEpoch] = useState("");
  const setup = useGearStore((s) => s.setup);
  const setupSlug = setup.racketSlug;
  const setRacket = useGearStore((s) => s.setRacket);
  const [selectedSlug, setSelectedSlug] = useState(
    setupSlug && initialRackets.some((r) => r.slug === setupSlug)
      ? setupSlug
      : (initialRackets[0]?.slug ?? ""),
  );
  const [compareIds, setCompareIds] = useState<string[]>([]);
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
    const q = deferredQuery.trim();
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
      if (pattern !== "all" && patternBand(r.stringPattern) !== pattern) return false;
      if (!q) return true;
      return matchesEquipmentSearch(
        q,
        r.brand,
        r.model,
        r.slug,
        r.year,
        r.style,
        r.stringPattern,
        r.summary,
      );
    });

    const sorted = [...list];
    sorted.sort((a, b) => {
      if (q) {
        const scoreDelta =
          searchMatchScore(q, b.brand, b.model, b.slug) -
          searchMatchScore(q, a.brand, a.model, a.slug);
        if (scoreDelta !== 0) return scoreDelta;
      }
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
  }, [initialRackets, deferredQuery, brand, style, weightBand, headBand, pattern, sort]);

  const nextEpoch = `${deferredQuery}|${brand}|${style}|${weightBand}|${headBand}|${pattern}|${sort}`;
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
  const setupRacket = setupSlug
    ? initialRackets.find((r) => r.slug === setupSlug) ?? null
    : null;

  const compareRackets = compareIds
    .map((id) => initialRackets.find((r) => r.slug === id))
    .filter((r): r is RacketProfile => r != null);

  const toggleCompare = (slug: string) => {
    setCompareIds((prev) => {
      if (prev.includes(slug)) return prev.filter((x) => x !== slug);
      if (prev.length >= MAX_COMPARE) return [...prev.slice(1), slug];
      return [...prev, slug];
    });
  };

  const vsSetupRows: CompareDeltaRow[] = selected
    ? [
        {
          key: "power",
          label: "Power",
          value: selected.power,
          baseline: setup.racketPower ?? setupRacket?.power ?? null,
          delta: numericDelta(selected.power, setup.racketPower ?? setupRacket?.power),
        },
        {
          key: "spin",
          label: "Spin",
          value: selected.spin,
          baseline: setup.racketSpin ?? setupRacket?.spin ?? null,
          delta: numericDelta(selected.spin, setup.racketSpin ?? setupRacket?.spin),
        },
        {
          key: "control",
          label: "Control",
          value: selected.control,
          baseline: setup.racketControl ?? setupRacket?.control ?? null,
          delta: numericDelta(selected.control, setup.racketControl ?? setupRacket?.control),
        },
        {
          key: "comfort",
          label: "Comfort",
          value: selected.comfort,
          baseline: setup.racketComfort ?? setupRacket?.comfort ?? null,
          delta: numericDelta(selected.comfort, setup.racketComfort ?? setupRacket?.comfort),
        },
        {
          key: "launch",
          label: "Ideal launch",
          value: selected.idealLaunchAngleDeg,
          baseline: setup.racketLaunchDeg ?? setupRacket?.idealLaunchAngleDeg ?? null,
          delta: numericDelta(
            selected.idealLaunchAngleDeg,
            setup.racketLaunchDeg ?? setupRacket?.idealLaunchAngleDeg,
          ),
          unit: "°",
          higherIsBetter: false,
        },
        {
          key: "swing",
          label: "Ideal swing path",
          value: selected.idealSwingPathDeg,
          baseline: setup.racketSwingPathDeg ?? setupRacket?.idealSwingPathDeg ?? null,
          delta: numericDelta(
            selected.idealSwingPathDeg,
            setup.racketSwingPathDeg ?? setupRacket?.idealSwingPathDeg,
          ),
          unit: "°",
          higherIsBetter: false,
        },
        {
          key: "weight",
          label: "Weight",
          value: selected.weightG ?? "—",
          baseline: setup.racketWeightG ?? setupRacket?.weightG ?? null,
          delta: numericDelta(selected.weightG, setup.racketWeightG ?? setupRacket?.weightG),
          unit: "g",
          higherIsBetter: false,
        },
        {
          key: "sw",
          label: "Swingweight",
          value: selected.swingweight ?? "—",
          baseline: setup.racketSwingweight ?? setupRacket?.swingweight ?? null,
          delta: numericDelta(
            selected.swingweight,
            setup.racketSwingweight ?? setupRacket?.swingweight,
          ),
          higherIsBetter: false,
        },
      ]
    : [];

  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="order-2 space-y-4 lg:order-1">
        <div className="flex flex-col gap-3">
          <label className="relative flex-1">
            <span className="sr-only">Search rackets</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search cx200, Pure Aero, Blade…"
              className="w-full rounded-md border border-[var(--line)] bg-black/20 px-3 py-2.5 text-sm outline-none transition focus:border-[var(--accent)]"
            />
          </label>
          <button
            type="button"
            className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-[var(--muted)] lg:hidden"
            style={{ boxShadow: "0 0 0 1px var(--line)" }}
            onClick={() => setFiltersOpen((o) => !o)}
            aria-expanded={filtersOpen}
          >
            <span>Filters & sort</span>
            <span className="text-xs">{filtersOpen ? "Hide" : "Show"}</span>
          </button>
          <div
            className={`grid grid-cols-2 gap-2 sm:grid-cols-3 ${
              filtersOpen ? "" : "hidden lg:grid"
            }`}
          >
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
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              aria-label="String pattern"
              className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="all">Any pattern</option>
              <option value="16x19">16×19 open</option>
              <option value="18x20">18×20 dense</option>
              <option value="other">Other patterns</option>
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              aria-label="Sort"
              className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
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
          · compare up to {MAX_COMPARE} · {meta.source} v{meta.version}
          {meta.live ? " · live" : " · offline snapshot"}
        </p>

        <ul className="max-h-[22rem] divide-y divide-[var(--line)] overflow-y-auto border-y border-[var(--line)] md:max-h-[28rem]">
          {shown.map((r) => {
            const active = r.slug === selected?.slug;
            const saved = r.slug === setupSlug;
            const fit = derivePlayerFit(r);
            const inCompare = compareIds.includes(r.slug);
            return (
              <li key={r.slug} className="flex items-stretch gap-1">
                <label
                  className="flex shrink-0 items-center px-2"
                  title={inCompare ? "Remove from compare" : "Add to compare"}
                >
                  <span className="sr-only">
                    Compare {r.brand} {r.model}
                  </span>
                  <input
                    type="checkbox"
                    checked={inCompare}
                    onChange={() => toggleCompare(r.slug)}
                    className="h-3.5 w-3.5 accent-[var(--accent)]"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setSelectedSlug(r.slug)}
                  aria-pressed={active}
                  className={`flex min-w-0 flex-1 items-center gap-3 px-2 py-3 text-left transition ${
                    active ? "bg-[var(--accent-dim)]" : "hover:bg-white/[0.03]"
                  }`}
                >
                  <EquipmentThumb
                    src={racketImageUrl(r)}
                    alt={`${r.brand} ${r.model}`}
                    size="sm"
                  />
                  <span className="flex min-w-0 flex-col gap-1">
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
                    <span className="flex flex-wrap gap-1.5 pt-0.5">
                      <MiniTag label={fit.skill} color="#c8f560" />
                      <MiniTag label={fit.courtRole} color="#7dd3fc" />
                      <MiniTag label={fit.feelAxis} color="#f4a261" />
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="px-2 py-8 text-sm text-[var(--muted)]">
              No rackets match those filters. Try &quot;cx 200&quot;, &quot;cx200&quot;, or clear weight /
              head size.
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
          className="order-1 space-y-6 lg:order-2 lg:space-y-8"
          key={selected.slug}
          style={{ animation: "rise 0.45s ease-out both" }}
        >
          <header className="flex flex-wrap gap-5">
            <EquipmentThumb
              src={racketImageUrl(selected)}
              alt={`${selected.brand} ${selected.model}`}
              size="lg"
            />
            <div className="min-w-0 flex-1">
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
                  setRacket(selected.slug, `${selected.brand} ${selected.model}`, {
                    idealLaunchAngleDeg: selected.idealLaunchAngleDeg,
                    idealSwingPathDeg: selected.idealSwingPathDeg,
                    power: selected.power,
                    spin: selected.spin,
                    control: selected.control,
                    comfort: selected.comfort,
                    weightG: selected.weightG,
                    swingweight: selected.swingweight,
                  })
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
            </div>
          </header>

          <PlayerFitBadges racket={selected} />

          <div className="grid gap-8 md:grid-cols-2">
            <LaunchAngleVisual degrees={selected.idealLaunchAngleDeg} label="Strike launch (frame)" />
            <SwingPathVisual degrees={selected.idealSwingPathDeg} label="Path through contact" />
          </div>
          <StrikeCoachingBullets
            launchDeg={selected.idealLaunchAngleDeg}
            pathDeg={selected.idealSwingPathDeg}
            spin={selected.spin}
            control={selected.control}
            power={selected.power}
          />

          <ScoreGrid
            scores={[
              { label: "Power", value: selected.power, accent: "#f4a261" },
              { label: "Spin", value: selected.spin, accent: "#7dd3fc" },
              { label: "Control", value: selected.control },
              { label: "Comfort", value: selected.comfort, accent: "#e9c46a" },
            ]}
          />

          <CompareToSetup
            title={setup.racketLabel ? `Vs ${setup.racketLabel}` : "Vs my setup"}
            subtitle="Compare this frame to the racket you have already tested and saved."
            rows={vsSetupRows}
            emptyHint="Save a racket to My setup to see launch, swing path, and score deltas against what you play with."
          />

          {compareRackets.length >= 2 && (
            <section className="border-t border-[var(--line)] pt-6">
              <h4 className="font-[family-name:var(--font-display)] text-lg tracking-tight">
                Side-by-side frames
              </h4>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Check up to {MAX_COMPARE} frames in the list.
              </p>
              <div
                className={`mt-4 grid gap-4 ${
                  compareRackets.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"
                }`}
              >
                {compareRackets.map((r) => (
                  <div
                    key={r.slug}
                    className="space-y-3 rounded-md p-3"
                    style={{
                      boxShadow:
                        r.slug === selected.slug
                          ? "inset 0 0 0 1px var(--accent)"
                          : "inset 0 0 0 1px var(--line)",
                    }}
                  >
                    <EquipmentThumb
                      src={racketImageUrl(r)}
                      alt={`${r.brand} ${r.model}`}
                      size="md"
                    />
                    <p className="font-[family-name:var(--font-display)] text-sm tracking-tight">
                      {r.brand} {r.model}
                    </p>
                    <ScoreMeter label="Power" value={r.power} accent="#f4a261" />
                    <ScoreMeter label="Spin" value={r.spin} accent="#7dd3fc" />
                    <ScoreMeter label="Control" value={r.control} />
                    <ScoreMeter label="Comfort" value={r.comfort} accent="#e9c46a" />
                    <p className="text-xs tabular-nums text-[var(--muted)]">
                      Launch {r.idealLaunchAngleDeg}° · Path {r.idealSwingPathDeg}°
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <p className="text-sm leading-relaxed text-[var(--muted)]">{selected.summary}</p>
        </div>
      )}
    </div>
  );
}

function MiniTag({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="rounded px-1.5 py-0.5 text-[10px] font-medium"
      style={{
        color,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color} 35%, transparent)`,
      }}
    >
      {label}
    </span>
  );
}
