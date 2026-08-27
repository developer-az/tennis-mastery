"use client";

import { useDeferredValue, useMemo, useRef, useState } from "react";
import type { EquipmentTab, RacketCatalogMeta, RacketProfile } from "@/types/equipment";
import { matchesEquipmentSearch, searchMatchScore } from "@/lib/equipment/search";
import { racketImageUrl } from "@/lib/equipment/media/urls";
import { useGearStore } from "@/store/gearStore";
import { usePlayerStore } from "@/store/playerStore";
import { LaunchAngleVisual, SwingPathVisual, StrikeCoachingBullets, strikeZoneForFrame, ForehandGripBevelVisual, FaceAngleAtContactVisual, ContactGeometryVisual } from "./RacketVisuals";
import { deriveForehandMold } from "@/lib/equipment/forehandMold";
import { computeFlightMetrics } from "@/lib/equipment/setupSynthesis";
import { computeFrameSpecPhysics } from "@/lib/equipment/playability";
import { PlayerFitBadges } from "./PlayerFitBadges";
import { FrameIntelligencePanel } from "./FrameIntelligencePanel";
import { HowItHitsPanel } from "./HowItHitsPanel";
import { ScoreGrid, ScoreMeter } from "./ScoreMeter";
import { EquipmentThumb } from "./EquipmentThumb";
import { CompareToSetup, numericDelta, type CompareDeltaRow } from "./CompareToSetup";
import {
  AisleChip,
  CatalogAisle,
  ChipRow,
  ProductCard,
  SearchField,
} from "./CatalogShop";
import {
  FEEL_MIN,
  RACKET_FEELS,
  RACKET_SHOP_TYPES,
  brandsByCount,
  groupByBrand,
  matchesFeel,
  racketShopBadge,
  racketShopType,
  uniqueSortedBrands,
  type FeelKey,
  type RacketShopType,
} from "@/lib/equipment/shopAisles";

const PAGE = 24;
const AISLE_CARDS = 8;
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
  onSelectTab,
}: {
  initialRackets: RacketProfile[];
  meta: RacketCatalogMeta;
  onSelectTab?: (tab: EquipmentTab, extra?: Record<string, string | null>) => void;
}) {
  void meta;
  const liveCatalog = meta.live === true;
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("all");
  const [shopType, setShopType] = useState<RacketShopType | "all">("all");
  const [feel, setFeel] = useState<FeelKey | "all">("all");
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
  const setTab = useGearStore((s) => s.setTab);
  const playerGrip = usePlayerStore((s) => s.profile.grips.forehand);
  const [selectedSlug, setSelectedSlug] = useState(
    setupSlug && initialRackets.some((r) => r.slug === setupSlug)
      ? setupSlug
      : (initialRackets[0]?.slug ?? ""),
  );
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const deferredQuery = useDeferredValue(query);

  const brands = useMemo(() => uniqueSortedBrands(initialRackets), [initialRackets]);
  const aisleBrands = useMemo(() => brandsByCount(initialRackets, 8), [initialRackets]);
  const styles = useMemo(
    () => Array.from(new Set(initialRackets.map((r) => r.style))).sort(),
    [initialRackets],
  );

  const filtered = useMemo(() => {
    const q = deferredQuery.trim();
    const list = initialRackets.filter((r) => {
      if (brand !== "all" && r.brand !== brand) return false;
      if (shopType !== "all" && racketShopType(r) !== shopType) return false;
      if (!matchesFeel(r, feel)) return false;
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
  }, [initialRackets, deferredQuery, brand, shopType, feel, style, weightBand, headBand, pattern, sort]);

  const nextEpoch = `${deferredQuery}|${brand}|${shopType}|${feel}|${style}|${weightBand}|${headBand}|${pattern}|${sort}`;
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

  const forehandAdvice = useMemo(
    () =>
      selected
        ? deriveForehandMold({ racket: selected, playerGrip: playerGrip ?? null })
        : null,
    [selected, playerGrip],
  );
  const stockFlight = useMemo(
    () =>
      selected
        ? computeFlightMetrics({
            launchDeg: selected.idealLaunchAngleDeg,
            pathDeg: selected.idealSwingPathDeg,
            power: selected.power,
            spin: selected.spin,
            control: selected.control,
            swingweight: selected.swingweight,
          })
        : null,
    [selected],
  );
  const framePhysics = useMemo(
    () => (selected ? computeFrameSpecPhysics(selected) : null),
    [selected],
  );

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

  const detailRef = useRef<HTMLDivElement | null>(null);

  const saveRacket = (r: RacketProfile) => {
    setRacket(r.slug, `${r.brand} ${r.model}`, {
      idealLaunchAngleDeg: r.idealLaunchAngleDeg,
      idealSwingPathDeg: r.idealSwingPathDeg,
      power: r.power,
      spin: r.spin,
      control: r.control,
      comfort: r.comfort,
      weightG: r.weightG,
      swingweight: r.swingweight,
      balanceMm: r.balanceMm,
    });
  };

  const selectRacket = (slug: string) => {
    setSelectedSlug(slug);
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      requestAnimationFrame(() =>
        detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    }
  };

  const showAisles =
    brand === "all" &&
    shopType === "all" &&
    feel === "all" &&
    style === "all" &&
    weightBand === "all" &&
    headBand === "all" &&
    pattern === "all" &&
    !deferredQuery.trim();

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-6">
      <div className="order-1 space-y-4 lg:order-1">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Search Blade, CX 200, Prestige…"
          label="Search rackets"
        />
        <p className="text-sm text-[var(--muted)]">
          Not sure? Filter by how the hoop is built — light/forgiving, open-pattern spin, dense
          control — then read the spec math on the right.
        </p>
        <ChipRow label="Brand">
          <AisleChip label="All" active={brand === "all"} onClick={() => setBrand("all")} />
          {brands.map((b) => (
            <AisleChip key={b} label={b} active={brand === b} onClick={() => setBrand(b)} />
          ))}
        </ChipRow>
        <ChipRow label="Type">
          <AisleChip label="All types" active={shopType === "all"} onClick={() => setShopType("all")} />
          {RACKET_SHOP_TYPES.map((t) => (
            <AisleChip
              key={t.id}
              label={t.label}
              active={shopType === t.id}
              onClick={() => setShopType(t.id)}
            />
          ))}
        </ChipRow>
        <ChipRow label="Feel">
          <AisleChip label="Any feel" active={feel === "all"} onClick={() => setFeel("all")} />
          {RACKET_FEELS.map((f) => (
            <AisleChip
              key={f.id}
              label={f.label}
              active={feel === f.id}
              onClick={() => setFeel(f.id)}
              color={f.color}
            />
          ))}
        </ChipRow>
        <details className="text-sm">
          <summary className="cursor-pointer text-[var(--muted)]">More filters</summary>
          <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            <select value={style} onChange={(e) => setStyle(e.target.value)} aria-label="Style" className="sf-select w-full">
              <option value="all">All styles</option>
              {styles.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select value={weightBand} onChange={(e) => setWeightBand(e.target.value)} aria-label="Weight" className="sf-select w-full">
              <option value="all">Any weight</option>
              <option value="light">&lt; 295 g</option>
              <option value="mid">295–314 g</option>
              <option value="heavy">315 g+</option>
            </select>
            <select value={headBand} onChange={(e) => setHeadBand(e.target.value)} aria-label="Head size" className="sf-select w-full">
              <option value="all">Any head size</option>
              <option value="mid">Mid (&lt; 98&quot;)</option>
              <option value="midplus">Midplus (98–100&quot;)</option>
              <option value="oversize">Oversize (&gt; 100&quot;)</option>
            </select>
            <select value={pattern} onChange={(e) => setPattern(e.target.value)} aria-label="String pattern" className="sf-select w-full">
              <option value="all">Any pattern</option>
              <option value="16x19">16×19 open</option>
              <option value="18x20">18×20 dense</option>
              <option value="other">Other patterns</option>
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort" className="sf-select w-full">
              <option value="newest">Newest</option>
              <option value="spin">Most spin</option>
              <option value="control">Most control</option>
              <option value="power">Most power</option>
              <option value="weight">Heaviest</option>
            </select>
          </div>
        </details>

        <p className="text-xs text-[var(--muted)]">
          {shown.length} of {filtered.length}
          {query.trim() ? " matches" : " frames"}
          {feel !== "all" ? ` · ${feel} ${FEEL_MIN}+` : ""}
        </p>

        {showAisles ? (
          <div className="space-y-6">
            {groupByBrand(initialRackets)
              .filter((g) => aisleBrands.includes(g.brand))
              .map((g) => (
                <CatalogAisle
                  key={g.brand}
                  title={g.brand}
                  actionLabel={`See all ${g.brand}`}
                  onAction={() => setBrand(g.brand)}
                >
                  {g.items.slice(0, AISLE_CARDS).map((r) => (
                    <RacketCard
                      key={r.slug}
                      racket={r}
                      compact
                      selected={r.slug === selected?.slug}
                      saved={r.slug === setupSlug}
                      onSelect={() => selectRacket(r.slug)}
                      onSave={() => saveRacket(r)}
                    />
                  ))}
                </CatalogAisle>
              ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {shown.map((r) => (
                <RacketCard
                  key={r.slug}
                  racket={r}
                  selected={r.slug === selected?.slug}
                  saved={r.slug === setupSlug}
                  onSelect={() => selectRacket(r.slug)}
                  onSave={() => saveRacket(r)}
                />
              ))}
            </div>
            {filtered.length === 0 && (
              <p className="px-1 py-8 text-sm text-[var(--muted)]">
                No rackets match. Try beginner-friendly, or search Blade / CX 200.
              </p>
            )}
            {pageSize < filtered.length ? (
              <button
                type="button"
                onClick={() => setVisible((v) => v + PAGE)}
                className="sf-btn sf-btn-secondary w-full"
              >
                Load more ({filtered.length - pageSize} remaining)
              </button>
            ) : null}
          </>
        )}
      </div>

      {selected && (
        <div
          className="order-2 scroll-mt-16 space-y-6 lg:order-2 lg:scroll-mt-4 lg:space-y-8"
          ref={detailRef}
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
                {framePhysics?.hitKicker ?? selected.style}
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
                {selected.headSizeSqIn ? ` · ${selected.headSizeSqIn}"` : ""}
                {selected.stringPattern ? ` · ${selected.stringPattern.replace("x", "×")}` : ""}
              </p>
              {(selected.atpPlayers.length > 0 || selected.wtaPlayers.length > 0) && (
                <p className="mt-2 text-xs text-[var(--foreground)]/70">
                  Seen with: {[...selected.atpPlayers, ...selected.wtaPlayers].slice(0, 6).join(", ")}
                </p>
              )}
              <button
                type="button"
                onClick={() => saveRacket(selected)}
                className="mt-4 min-h-11 w-full rounded-[var(--radius)] px-4 py-2.5 text-sm font-medium transition hover:brightness-110 sm:w-auto"
                style={{
                  background: inSetup ? "var(--accent-dim)" : "var(--accent)",
                  color: inSetup ? "var(--accent)" : "var(--accent-ink)",
                  boxShadow: inSetup ? "0 0 0 1px var(--accent)" : "none",
                }}
              >
                {inSetup ? "In your bag" : "Add to bag"}
              </button>
              <button
                type="button"
                onClick={() => toggleCompare(selected.slug)}
                className="mt-2 w-full rounded-[var(--radius)] px-4 py-2 text-xs text-[var(--muted)] sm:w-auto"
                style={{ boxShadow: "0 0 0 1px var(--line)" }}
              >
                {compareIds.includes(selected.slug) ? "In compare" : "Compare this frame"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onSelectTab) onSelectTab("lead-tape", { mold: selected.slug });
                  else {
                    setTab("lead-tape");
                    const url = new URL(window.location.href);
                    url.searchParams.set("tab", "lead-tape");
                    url.searchParams.set("mold", selected.slug);
                    window.history.replaceState(null, "", `${url.pathname}?${url.searchParams.toString()}`);
                  }
                }}
                className="mt-2 w-full rounded-md px-4 py-2 text-xs text-[var(--muted)] transition hover:bg-white/5 hover:text-[var(--foreground)] sm:w-auto"
                style={{ boxShadow: "0 0 0 1px var(--line)" }}
              >
                Mold my frame toward this →
              </button>
            </div>
          </header>

          <HowItHitsPanel racket={selected} />

          <PlayerFitBadges racket={selected} liveCatalog={liveCatalog} />

          <FrameIntelligencePanel racket={selected} liveCatalog={liveCatalog} />

          <div className="grid gap-8 md:grid-cols-2">
            <LaunchAngleVisual
              degrees={selected.idealLaunchAngleDeg}
              pathDeg={selected.idealSwingPathDeg}
              spin={selected.spin}
              power={selected.power}
              control={selected.control}
              flight={stockFlight}
              zone={strikeZoneForFrame(selected)}
              label="Flight vs net — stock frame"
            />
            <SwingPathVisual
              degrees={selected.idealSwingPathDeg}
              zone={strikeZoneForFrame(selected)}
              label="Where to strike on this frame"
            />
          </div>
          <StrikeCoachingBullets
            launchDeg={selected.idealLaunchAngleDeg}
            pathDeg={selected.idealSwingPathDeg}
            spin={selected.spin}
            control={selected.control}
            power={selected.power}
            headSizeSqIn={selected.headSizeSqIn}
            zone={strikeZoneForFrame(selected)}
          />

          {forehandAdvice ? (
            <section className="border-t border-[var(--line)] pt-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--amber)]">
                Forehand grip & face at contact
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Optimal grip bevel and how closed the face should be for this frame’s path and leave.
              </p>
              <div className="mt-5 grid gap-6 md:grid-cols-2">
                <ForehandGripBevelVisual advice={forehandAdvice} />
                <FaceAngleAtContactVisual advice={forehandAdvice} />
              </div>
              <div className="mt-5">
                <ContactGeometryVisual advice={forehandAdvice} />
              </div>
            </section>
          ) : null}

          <ScoreGrid
            scores={[
              { label: "Power", value: selected.power, accent: "var(--chart-power)" },
              { label: "Spin", value: selected.spin, accent: "var(--chart-spin)" },
              { label: "Control", value: selected.control },
              { label: "Comfort", value: selected.comfort, accent: "var(--chart-comfort)" },
            ]}
          />
          <p className="-mt-4 text-xs leading-relaxed text-[var(--muted)]">
            Power / spin / control from mass, SW, RA, head, and pattern
            {/\/100 for (power|spin|control)/i.test(selected.summary)
              ? " — expert scores tint these by at most 20%."
              : " — not from the model name."}
          </p>

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
                    <ScoreMeter label="Power" value={r.power} accent="var(--chart-power)" />
                    <ScoreMeter label="Spin" value={r.spin} accent="var(--chart-spin)" />
                    <ScoreMeter label="Control" value={r.control} />
                    <ScoreMeter label="Comfort" value={r.comfort} accent="var(--chart-comfort)" />
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

function RacketCard({
  racket,
  compact,
  selected,
  saved,
  onSelect,
  onSave,
}: {
  racket: RacketProfile;
  compact?: boolean;
  selected: boolean;
  saved: boolean;
  onSelect: () => void;
  onSave: () => void;
}) {
  return (
    <ProductCard
      image={racketImageUrl(racket)}
      alt={`${racket.brand} ${racket.model}`}
      brand={racket.brand}
      name={racket.model}
      badge={racketShopBadge(racket)}
      meta={`${racket.year}${racket.weightG ? ` · ${racket.weightG}g` : ""}${
        racket.swingweight ? ` · SW ${racket.swingweight}` : ""
      }${racket.headSizeSqIn ? ` · ${racket.headSizeSqIn}"` : ""}`}
      scores={[
        { label: "Spin", value: racket.spin, color: "var(--chart-spin)" },
        { label: "Power", value: racket.power, color: "var(--chart-power)" },
        { label: "Control", value: racket.control, color: "var(--chart-control)" },
      ]}
      saved={saved}
      selected={selected}
      onSelect={onSelect}
      onSave={onSave}
      compact={compact}
    />
  );
}
