"use client";

import { useDeferredValue, useMemo, useRef, useState } from "react";
import type { EquipmentTab, StringProfile } from "@/types/equipment";
import {
  GAUGE_FILTER_OPTIONS,
  gaugeLabel,
  matchesMaterialFilter,
  materialLabel,
  parseGaugeFromQuery,
  parsePolyIntent,
  shapeLabel,
  stringHasGauge,
  tensionOutcome,
  tensionRangeOverlaps,
  findSimilarStrings,
  stringCategoryBlurb,
} from "@/lib/equipment/strings";
import { matchesEquipmentSearch } from "@/lib/equipment/search";
import { stringImageUrl } from "@/lib/equipment/media/urls";
import { hasExternalPhoto, photoFirst } from "@/lib/equipment/media/externalImages";
import { brandAccent } from "@/lib/equipment/media/brandColors";
import { equipmentLabel, modelWithoutBrand } from "@/lib/equipment/labels";
import { useGearStore } from "@/store/gearStore";
import { SpinPotentialRing, TensionCurve } from "./StringVisuals";
import { ScoreGrid, ScoreMeter } from "./ScoreMeter";
import { EquipmentThumb } from "./EquipmentThumb";
import { CompareToSetup, numericDelta, type CompareDeltaRow } from "./CompareToSetup";
import { StringIntelligencePanel } from "./StringIntelligencePanel";
import {
  AisleChip,
  ActiveFilterChips,
  CatalogAisle,
  ChipRow,
  MoreFilters,
  ProductCard,
  SearchField,
} from "./CatalogShop";
import {
  FEEL_MIN,
  STRING_BRAND_PIN,
  STRING_FEELS,
  STRING_MATERIAL_AISLES,
  brandsByCount,
  groupByBrand,
  matchesFeel,
  stringMaterialAisle,
  stringMaterialShortLabel,
  stringShapeShortLabel,
  uniqueSortedBrands,
  type FeelKey,
  type StringMaterialAisle,
} from "@/lib/equipment/shopAisles";

type TensionFilter = "all" | "soft" | "mid" | "firm" | "target";

export function StringExplorer({ strings, onSelectTab }: { strings: StringProfile[]; onSelectTab?: (tab: EquipmentTab) => void; }) {
  void onSelectTab;
  const setup = useGearStore((s) => s.setup);
  const setString = useGearStore((s) => s.setString);
  const setTensionStore = useGearStore((s) => s.setTension);
  const setGaugeStore = useGearStore((s) => s.setGauge);

  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("all");
  const [feel, setFeel] = useState<FeelKey | "all">("all");
  const [materialAisle, setMaterialAisle] = useState<StringMaterialAisle | "all">("all");
  const [shape, setShape] = useState("all");
  const [gaugeFilter, setGaugeFilter] = useState("all");
  const [tensionFilter, setTensionFilter] = useState<TensionFilter>("all");
  const [targetTension, setTargetTension] = useState(setup.tensionLbs ?? 52);
  const [selectedId, setSelectedId] = useState(
    setup.stringId && strings.some((s) => s.id === setup.stringId)
      ? setup.stringId
      : (strings[0]?.id ?? ""),
  );
  const [compareId, setCompareId] = useState(
    setup.stringId && strings.some((s) => s.id === setup.stringId)
      ? setup.stringId
      : (strings[1]?.id ?? strings[0]?.id ?? ""),
  );
  const [tensionById, setTensionById] = useState<Record<string, number>>(() =>
    setup.stringId && setup.tensionLbs != null
      ? { [setup.stringId]: setup.tensionLbs }
      : {},
  );
  const [gaugeById, setGaugeById] = useState<Record<string, number>>(() =>
    setup.stringId && setup.gaugeMm != null ? { [setup.stringId]: setup.gaugeMm } : {},
  );
  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(() => {
    const q = deferredQuery.trim();
    const gaugeFromQuery = parseGaugeFromQuery(q);
    const polyFromQuery = parsePolyIntent(q);
    const gaugeTarget =
      gaugeFilter !== "all" ? parseFloat(gaugeFilter) : gaugeFromQuery;
    // Strip gauge/poly tokens from text search so "poly 1.30" does not over-constrain name match
    const textQuery = q
      .replace(/\b(1\.\d{1,2}|16g|17g|17l|15g|15l|18g)\b/gi, " ")
      .replace(/\b(poly|polyester|co-?poly|copoly)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    return strings
      .filter((s) => {
      if (brand !== "all" && s.brand !== brand) return false;
      if (materialAisle !== "all" && stringMaterialAisle(s.material) !== materialAisle) return false;
      if (!matchesFeel(s, feel)) return false;
      const materialFilter = polyFromQuery ? "poly" : "all";
      if (!matchesMaterialFilter(s, materialFilter)) return false;
      if (shape !== "all" && s.shape !== shape) return false;
      if (gaugeTarget != null && !stringHasGauge(s, gaugeTarget)) return false;
      if (tensionFilter === "soft" && s.recommendedTensionLbs > 50) return false;
      if (tensionFilter === "mid" && (s.recommendedTensionLbs < 50 || s.recommendedTensionLbs > 54))
        return false;
      if (tensionFilter === "firm" && s.recommendedTensionLbs < 55) return false;
      if (tensionFilter === "target" && !tensionRangeOverlaps(s, targetTension, 2)) return false;
      if (!textQuery) return true;
      return matchesEquipmentSearch(
        textQuery,
        s.brand,
        s.name,
        s.material,
        s.shape,
        s.gaugesMm.join(" "),
        s.bestFor,
        s.feel,
      );
    })
      .sort((a, b) => photoFirst(hasExternalPhoto("string", a.id), hasExternalPhoto("string", b.id)));
  }, [strings, deferredQuery, brand, feel, materialAisle, shape, gaugeFilter, tensionFilter, targetTension]);

  const selected = filtered.find((s) => s.id === selectedId) ?? filtered[0] ?? null;
  const compare = strings.find((s) => s.id === compareId) ?? strings[0];
  const tension = selected
    ? (tensionById[selected.id] ?? selected.recommendedTensionLbs)
    : 52;
  const gauge = selected
    ? (gaugeById[selected.id] ?? selected.gaugesMm[0] ?? 1.25)
    : 1.25;
  const [lo, hi] = selected ? selected.tensionRangeLbs : ([48, 58] as [number, number]);
  const selectedOutcome = selected ? tensionOutcome(selected, tension, gauge) : null;
  const compareGauge = compare
    ? (gaugeById[compare.id] ??
      (setup.stringId === compare.id && setup.gaugeMm != null
        ? setup.gaugeMm
        : null) ??
      compare.gaugesMm[0] ??
      1.25)
    : 1.25;
  const compareOutcome = compare
    ? tensionOutcome(
        compare,
        Math.min(
          compare.tensionRangeLbs[1],
          Math.max(
            compare.tensionRangeLbs[0],
            setup.stringId === compare.id && setup.tensionLbs != null
              ? setup.tensionLbs
              : tension,
          ),
        ),
        compareGauge,
      )
    : null;
  const inSetup = selected != null && selected.id === setup.stringId;
  const detailRef = useRef<HTMLDivElement>(null);

  const saveStringRow = (s: StringProfile) => {
    const t = tensionById[s.id] ?? s.recommendedTensionLbs;
    const g = gaugeById[s.id] ?? s.gaugesMm[0] ?? 1.25;
    const outcome = tensionOutcome(s, t, g);
    setString(s.id, equipmentLabel(s.brand, s.name), {
      tensionLbs: t,
      gaugeMm: g,
      power: outcome.power,
      spin: outcome.spin,
      control: outcome.control,
      comfort: outcome.comfort,
    });
  };

  const brands = useMemo(() => {
    const all = uniqueSortedBrands(strings);
    const pinned = STRING_BRAND_PIN.filter((b) => all.includes(b));
    const pinSet = new Set(pinned);
    return [...pinned, ...all.filter((b) => !pinSet.has(b))];
  }, [strings]);
  const aisleBrands = useMemo(() => brandsByCount(strings, 10, STRING_BRAND_PIN), [strings]);
  const selectString = (id: string) => {
    setSelectedId(id);
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      requestAnimationFrame(() =>
        detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    }
  };
  const showAisles =
    brand === "all" &&
    feel === "all" &&
    materialAisle === "all" &&
    shape === "all" &&
    gaugeFilter === "all" &&
    tensionFilter === "all" &&
    !deferredQuery.trim();

  const vsSetupRows: CompareDeltaRow[] =
    selected && selectedOutcome
      ? [
          {
            key: "spin",
            label: "Spin",
            value: selectedOutcome.spin,
            baseline: setup.stringSpin,
            delta: numericDelta(selectedOutcome.spin, setup.stringSpin),
          },
          {
            key: "control",
            label: "Control",
            value: selectedOutcome.control,
            baseline: setup.stringControl,
            delta: numericDelta(selectedOutcome.control, setup.stringControl),
          },
          {
            key: "power",
            label: "Power",
            value: selectedOutcome.power,
            baseline: setup.stringPower,
            delta: numericDelta(selectedOutcome.power, setup.stringPower),
          },
          {
            key: "comfort",
            label: "Comfort",
            value: selectedOutcome.comfort,
            baseline: setup.stringComfort,
            delta: numericDelta(selectedOutcome.comfort, setup.stringComfort),
          },
        ]
      : [];

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-6">
      <div className="order-1 space-y-4">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Search ALU Power, RPM, poly 1.30…"
          label="Search strings"
        />
        <ChipRow label="Brand">
          <AisleChip label="All" active={brand === "all"} onClick={() => setBrand("all")} />
          {brands.map((b) => (
            <AisleChip key={b} label={b} active={brand === b} onClick={() => setBrand(b)} />
          ))}
        </ChipRow>
        <ChipRow label="Type">
          <AisleChip label="All types" active={materialAisle === "all"} onClick={() => setMaterialAisle("all")} />
          {STRING_MATERIAL_AISLES.map((t) => (
            <AisleChip
              key={t.id}
              label={t.label}
              active={materialAisle === t.id}
              onClick={() => setMaterialAisle(t.id)}
            />
          ))}
        </ChipRow>
        {materialAisle !== "all" || shape !== "all" || gaugeFilter !== "all" ? (
          <p className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-xs leading-relaxed text-[var(--muted)]">
            {stringCategoryBlurb(
              materialAisle === "all" ? "all" : materialAisle,
              gaugeFilter === "all" ? null : Number(gaugeFilter),
              shape,
            )}
          </p>
        ) : null}
        <ChipRow label="Feel">
          <AisleChip label="Any feel" active={feel === "all"} onClick={() => setFeel("all")} />
          {STRING_FEELS.map((f) => (
            <AisleChip
              key={f.id}
              label={f.label}
              active={feel === f.id}
              onClick={() => setFeel(f.id)}
              color={f.color}
            />
          ))}
        </ChipRow>
        <ActiveFilterChips
          chips={[
            ...(brand !== "all" ? [{ id: "brand", label: brand, onRemove: () => setBrand("all") }] : []),
            ...(materialAisle !== "all"
              ? [
                  {
                    id: "type",
                    label: STRING_MATERIAL_AISLES.find((t) => t.id === materialAisle)?.label ?? materialAisle,
                    onRemove: () => setMaterialAisle("all"),
                  },
                ]
              : []),
            ...(feel !== "all" ? [{ id: "feel", label: feel, onRemove: () => setFeel("all") }] : []),
            ...(shape !== "all" ? [{ id: "shape", label: shape, onRemove: () => setShape("all") }] : []),
            ...(gaugeFilter !== "all"
              ? [{ id: "gauge", label: `${gaugeFilter} mm`, onRemove: () => setGaugeFilter("all") }]
              : []),
            ...(tensionFilter !== "all"
              ? [{ id: "tension", label: tensionFilter, onRemove: () => setTensionFilter("all") }]
              : []),
          ]}
          onClear={() => {
            setBrand("all");
            setMaterialAisle("all");
            setFeel("all");
            setShape("all");
            setGaugeFilter("all");
            setTensionFilter("all");
            setQuery("");
          }}
        />
        <MoreFilters>
            <select value={shape} onChange={(e) => setShape(e.target.value)} aria-label="Shape" className="sf-select w-full">
              <option value="all">Any shape</option>
              <option value="round">Round</option>
              <option value="octagonal">Octagonal</option>
              <option value="hexagonal">Hexagonal</option>
              <option value="pentagonal">Pentagonal</option>
              <option value="triangular">Triangular</option>
              <option value="twisted">Twisted</option>
              <option value="textured">Textured</option>
            </select>
            <select value={gaugeFilter} onChange={(e) => setGaugeFilter(e.target.value)} aria-label="Gauge" className="sf-select w-full">
              <option value="all">Any gauge</option>
              {GAUGE_FILTER_OPTIONS.map((g) => (
                <option key={g} value={String(g)}>
                  {g.toFixed(2)} mm ({gaugeLabel(g)})
                </option>
              ))}
            </select>
            <select value={tensionFilter} onChange={(e) => setTensionFilter(e.target.value as TensionFilter)} aria-label="Tension band" className="sf-select w-full">
              <option value="all">Any tension</option>
              <option value="soft">Softer rec. (≤50)</option>
              <option value="mid">Mid rec. (50–54)</option>
              <option value="firm">Firmer rec. (55+)</option>
              <option value="target">Fits my tension…</option>
            </select>
            {tensionFilter === "target" ? (
              <label className="col-span-2 flex items-center gap-2">
                <input
                  type="number"
                  min={40}
                  max={70}
                  step={0.5}
                  value={targetTension}
                  onChange={(e) => setTargetTension(parseFloat(e.target.value) || 52)}
                  className="sf-input"
                  aria-label="Target tension in pounds"
                />
                <span className="shrink-0 text-xs text-[var(--muted)]">lbs</span>
              </label>
            ) : null}
        </MoreFilters>
        <p className="text-xs text-[var(--muted)]">
          {filtered.length} string{filtered.length === 1 ? "" : "s"}
          {feel !== "all" ? ` · ${feel} ${FEEL_MIN}+` : ""}
        </p>
        {showAisles ? (
          <div className="space-y-6">
            {groupByBrand(strings, STRING_BRAND_PIN)
              .filter((g) => aisleBrands.includes(g.brand))
              .map((g) => (
                <CatalogAisle
                  key={g.brand}
                  title={g.brand}
                  actionLabel={`See all ${g.brand}`}
                  onAction={() => setBrand(g.brand)}
                >
                  {[...g.items]
                    .sort((a, b) =>
                      photoFirst(hasExternalPhoto("string", a.id), hasExternalPhoto("string", b.id)),
                    )
                    .slice(0, 8)
                    .map((s) => (
                    <StringCard
                      key={s.id}
                      string={s}
                      compact
                      selected={s.id === selected?.id}
                      saved={s.id === setup.stringId}
                      onSelect={() => selectString(s.id)}
                      onSave={() => saveStringRow(s)}
                    />
                  ))}
                </CatalogAisle>
              ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {filtered.map((s) => (
              <StringCard
                key={s.id}
                string={s}
                selected={s.id === selected?.id}
                saved={s.id === setup.stringId}
                onSelect={() => selectString(s.id)}
                onSave={() => saveStringRow(s)}
              />
            ))}
            {filtered.length === 0 ? (
              <p className="col-span-full py-8 text-sm text-[var(--muted)]">
                No strings match. Try poly for spin, or multi if your arm talks.
              </p>
            ) : null}
          </div>
        )}
      </div>

      {selected && selectedOutcome && (
        <div
          ref={detailRef} className="order-2 scroll-mt-16 space-y-6 lg:space-y-8"
          key={selected.id}
          style={{ animation: "rise 0.45s ease-out both" }}
        >
          <header className="flex flex-wrap gap-5">
            <EquipmentThumb
              src={stringImageUrl(selected)}
              alt={`${selected.brand} ${selected.name}`}
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--sky)]">
                {materialLabel(selected.material)} · {shapeLabel(selected.shape)}
              </p>
              <h3 className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-tight md:text-4xl">
                {selected.brand} {selected.name}
              </h3>
              <p className="mt-2 text-sm text-[var(--muted)]">{selected.feel}</p>
              <p className="mt-2 text-sm text-[var(--foreground)]/85">
                Best for: {selected.bestFor}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span
                  className="rounded-md px-2.5 py-1 font-medium tabular-nums"
                  style={{
                    color: "var(--chart-control)",
                    background: "color-mix(in srgb, var(--accent) 12%, transparent)",
                    boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--accent) 40%, transparent)",
                  }}
                >
                  Rec. {selected.recommendedTensionLbs} lbs
                </span>
                <span
                  className="rounded-md px-2.5 py-1 tabular-nums text-[var(--muted)]"
                  style={{ boxShadow: "inset 0 0 0 1px var(--line)" }}
                >
                  Range {lo}–{hi} lbs
                </span>
                <span
                  className="rounded-md px-2.5 py-1 tabular-nums text-[var(--muted)]"
                  style={{ boxShadow: "inset 0 0 0 1px var(--line)" }}
                >
                  Gauges {selected.gaugesMm.map((g) => `${g} (${gaugeLabel(g)})`).join(" · ")}
                </span>
              </div>
              <button
                type="button"
                onClick={() => saveStringRow(selected)}
                className="mt-4 min-h-11 w-full rounded-md px-4 py-2.5 text-sm font-medium transition hover:brightness-110 sm:w-auto"
                style={{
                  background: inSetup ? "color-mix(in srgb, var(--chart-spin) 14%, transparent)" : "var(--accent)",
                  color: inSetup ? "var(--chart-spin)" : "var(--accent-ink)",
                  boxShadow: inSetup ? "0 0 0 1px var(--chart-spin)" : "none",
                }}
              >
                {inSetup ? "In your bag" : "Add to bag"}
              </button>
            </div>
          </header>

          <StringIntelligencePanel string={selected} />

          <SpinPotentialRing value={selectedOutcome.spin} />

          <ScoreGrid
            scores={[
              { label: "Spin @ setup", value: selectedOutcome.spin, accent: "var(--chart-spin)" },
              { label: "Control @ setup", value: selectedOutcome.control },
              { label: "Power @ setup", value: selectedOutcome.power, accent: "var(--chart-power)" },
              { label: "Comfort @ setup", value: selectedOutcome.comfort, accent: "var(--chart-comfort)" },
              { label: "Durability @ gauge", value: selectedOutcome.durability, accent: "var(--chart-power)" },
              {
                label: "Tension maintenance",
                value: selected.tensionMaintenance,
                accent: "var(--chart-comfort)",
              },
              { label: "Stiffness feel", value: selectedOutcome.stiffness, accent: "var(--muted)" },
            ]}
          />

          {(() => {
            const alts = findSimilarStrings(selected, strings, { limit: 4 });
            if (alts.length === 0) return null;
            return (
              <section className="border-t border-[var(--line)] pt-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--sky)]">
                  Similar feel — shop substitutes
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  If this reel is hard to find or over budget, these play close. Copy the search
                  and check a local shop or marketplace.
                </p>
                <ul className="mt-3 space-y-2">
                  {alts.map((a) => (
                    <li
                      key={a.string.id}
                      className="flex flex-wrap items-center justify-between gap-2 text-sm"
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedId(a.string.id)}
                        className="min-w-0 text-left transition hover:text-[var(--sky)]"
                      >
                        <span className="font-[family-name:var(--font-display)] tracking-tight">
                          {a.string.brand} {a.string.name}
                        </span>
                        <span className="ml-2 text-[11px] tabular-nums text-[var(--sky)]">
                          {a.score}%
                        </span>
                        <span className="mt-0.5 block text-[11px] text-[var(--muted)]">
                          {a.why}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void navigator.clipboard?.writeText(a.shopQuery)}
                        className="shrink-0 rounded-md px-2 py-1.5 text-[11px] text-[var(--muted)]"
                        style={{ boxShadow: "0 0 0 1px var(--line)" }}
                      >
                        Copy search
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })()}

          {selected.gaugesMm.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                Gauge — changes spin, power, durability
              </p>
              <div className="flex flex-wrap gap-2">
                {selected.gaugesMm.map((g) => {
                  const active = g === gauge;
                  return (
                    <button
                      key={g}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        setGaugeById((prev) => ({ ...prev, [selected.id]: g }));
                        if (inSetup) setGaugeStore(g);
                      }}
                      className="rounded-md px-3 py-1.5 text-sm tabular-nums transition"
                      style={{
                        background: active ? "var(--accent-dim)" : "transparent",
                        color: active ? "var(--accent)" : "var(--foreground)",
                        boxShadow: "0 0 0 1px var(--line)",
                      }}
                    >
                      {g} mm · {gaugeLabel(g)}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">
                {selectedOutcome.gaugeHint} Thinner gauges usually add bite and pocket; thicker
                gauges last longer and feel firmer. Scores above update with your pick.
              </p>
            </div>
          )}

          <div>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <label className="min-w-0 flex-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Tension ({lo}–{hi} lbs) · recommended {selected.recommendedTensionLbs} — lower is more power, higher is more control
                </span>
                <input
                  type="range"
                  min={lo}
                  max={hi}
                  step={0.5}
                  value={tension}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setTensionById((prev) => ({
                      ...prev,
                      [selected.id]: v,
                    }));
                    if (inSetup) setTensionStore(v);
                  }}
                  className="mt-3 w-full accent-[var(--accent)]"
                  aria-label="String tension slider"
                />
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={lo}
                  max={hi}
                  step={0.5}
                  value={tension}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!Number.isFinite(v)) return;
                    const clamped = Math.max(lo, Math.min(hi, v));
                    setTensionById((prev) => ({
                      ...prev,
                      [selected.id]: clamped,
                    }));
                    if (inSetup) setTensionStore(clamped);
                  }}
                  className="w-20 rounded-md border border-[var(--line)] bg-black/30 px-2 py-2 text-right font-[family-name:var(--font-display)] text-xl tabular-nums outline-none focus:border-[var(--accent)]"
                  aria-label="String tension in pounds"
                />
                <span className="text-sm text-[var(--muted)]">lbs</span>
              </div>
            </div>
            <TensionCurve string={selected} tension={tension} gaugeMm={gauge} />
          </div>

          <CompareToSetup
            title={setup.stringLabel ? `Vs ${setup.stringLabel}` : "Vs my setup"}
            subtitle="Deltas use your saved string scores at the tension/gauge you tested."
            rows={vsSetupRows}
            emptyHint="Save a string (with tension and gauge) to My setup to compare against what you have hit with."
          />

          <section className="border-t border-[var(--line)] pt-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="font-[family-name:var(--font-display)] text-lg tracking-tight">
                  Compare at {tension} lbs
                </h4>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Defaults to your saved string when available. Scores use each bed&apos;s gauge.
                </p>
              </div>
              <select
                value={compareId}
                onChange={(e) => setCompareId(e.target.value)}
                aria-label="Compare string"
                className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              >
                {strings.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.brand} {s.name}
                    {s.id === setup.stringId ? " (my setup)" : ""}
                  </option>
                ))}
              </select>
            </div>
            {compare && compareOutcome && (
              <div className="grid gap-4 sm:grid-cols-2">
                <CompareColumn
                  label={`${selected.name} · ${gauge} mm`}
                  spin={selectedOutcome.spin}
                  control={selectedOutcome.control}
                  power={selectedOutcome.power}
                  comfort={selectedOutcome.comfort}
                  durability={selectedOutcome.durability}
                  stiffness={selectedOutcome.stiffness}
                  tensionMaint={selected.tensionMaintenance}
                />
                <CompareColumn
                  label={`${compare.name} · ${compareGauge} mm`}
                  spin={compareOutcome.spin}
                  control={compareOutcome.control}
                  power={compareOutcome.power}
                  comfort={compareOutcome.comfort}
                  durability={compareOutcome.durability}
                  stiffness={compareOutcome.stiffness}
                  tensionMaint={compare.tensionMaintenance}
                />
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
  power,
  comfort,
  durability,
  stiffness,
  tensionMaint,
}: {
  label: string;
  spin: number;
  control: number;
  power: number;
  comfort: number;
  durability: number;
  stiffness: number;
  tensionMaint: number;
}) {
  return (
    <div className="space-y-3 border-t border-[var(--line)] pt-3">
      <p className="text-sm font-medium">{label}</p>
      <ScoreMeter label="Spin" value={spin} accent="var(--chart-spin)" />
      <ScoreMeter label="Control" value={control} />
      <ScoreMeter label="Power" value={power} accent="var(--chart-power)" />
      <ScoreMeter label="Comfort" value={comfort} accent="var(--chart-comfort)" />
      <ScoreMeter label="Durability" value={durability} accent="var(--chart-power)" />
      <ScoreMeter label="Stiffness" value={stiffness} accent="var(--muted)" />
      <ScoreMeter label="Tension maint." value={tensionMaint} accent="var(--chart-comfort)" />
    </div>
  );
}

function StringCard({
  string,
  compact,
  selected,
  saved,
  onSelect,
  onSave,
}: {
  string: StringProfile;
  compact?: boolean;
  selected: boolean;
  saved: boolean;
  onSelect: () => void;
  onSave: () => void;
}) {
  return (
    <ProductCard
      image={stringImageUrl(string)}
      alt={equipmentLabel(string.brand, string.name)}
      brand={string.brand}
      name={modelWithoutBrand(string.brand, string.name)}
      badge={stringMaterialShortLabel(string.material)}
      meta={stringShapeShortLabel(string.shape)}
      accent={brandAccent(string.brand)}
      scores={[
        { label: "Spin", value: string.spin, color: "var(--chart-spin)" },
        { label: "Power", value: string.power, color: "var(--chart-power)" },
        { label: "Control", value: string.control, color: "var(--chart-control)" },
      ]}
      saved={saved}
      selected={selected}
      onSelect={onSelect}
      onSave={onSave}
      compact={compact}
    />
  );
}
