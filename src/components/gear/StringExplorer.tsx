"use client";

import { useDeferredValue, useMemo, useState } from "react";
import type { StringProfile } from "@/types/equipment";
import {
  GAUGE_FILTER_OPTIONS,
  gaugeLabel,
  matchesMaterialFilter,
  materialLabel,
  parseGaugeFromQuery,
  parsePolyIntent,
  shapeLabel,
  stringCategoryBlurb,
  stringHasGauge,
  stringStiffness,
  tensionOutcome,
  tensionRangeOverlaps,
  findSimilarStrings,
} from "@/lib/equipment/strings";
import { matchesEquipmentSearch } from "@/lib/equipment/search";
import { stringImageUrl } from "@/lib/equipment/media/urls";
import { useGearStore } from "@/store/gearStore";
import { SpinPotentialRing, TensionCurve } from "./StringVisuals";
import { ScoreGrid, ScoreMeter } from "./ScoreMeter";
import { EquipmentThumb } from "./EquipmentThumb";
import { CompareToSetup, numericDelta, type CompareDeltaRow } from "./CompareToSetup";

type TensionFilter = "all" | "soft" | "mid" | "firm" | "target";

export function StringExplorer({ strings }: { strings: StringProfile[] }) {
  const setup = useGearStore((s) => s.setup);
  const setString = useGearStore((s) => s.setString);
  const setTensionStore = useGearStore((s) => s.setTension);
  const setGaugeStore = useGearStore((s) => s.setGauge);

  const [query, setQuery] = useState("");
  const [material, setMaterial] = useState("all");
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

    return strings.filter((s) => {
      const materialFilter = material !== "all" ? material : polyFromQuery ? "poly" : "all";
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
    });
  }, [strings, deferredQuery, material, shape, gaugeFilter, tensionFilter, targetTension]);

  const categoryActive =
    (material !== "all" ||
      shape !== "all" ||
      gaugeFilter !== "all" ||
      parsePolyIntent(deferredQuery) ||
      parseGaugeFromQuery(deferredQuery) != null) &&
    filtered.length > 0;

  const categoryGauge =
    gaugeFilter !== "all" ? parseFloat(gaugeFilter) : parseGaugeFromQuery(deferredQuery);
  const categoryMaterial =
    material !== "all" ? material : parsePolyIntent(deferredQuery) ? "poly" : "all";

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
  const [filtersOpen, setFiltersOpen] = useState(false);

  const saveStringRow = (s: StringProfile) => {
    const t = tensionById[s.id] ?? s.recommendedTensionLbs;
    const g = gaugeById[s.id] ?? s.gaugesMm[0] ?? 1.25;
    const outcome = tensionOutcome(s, t, g);
    setString(s.id, `${s.brand} ${s.name}`, {
      tensionLbs: t,
      gaugeMm: g,
      power: outcome.power,
      spin: outcome.spin,
      control: outcome.control,
      comfort: outcome.comfort,
    });
  };

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
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-8">
      <div className="order-1 space-y-3 lg:space-y-4">
        <div className="sticky top-0 z-20 -mx-1 space-y-2 bg-[var(--background)]/95 px-1 py-2 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search RPM, ALU Power, poly 1.30…"
            aria-label="Search strings"
            inputMode="search"
            enterKeyHint="search"
            autoCapitalize="off"
            autoCorrect="off"
            className="w-full rounded-md border border-[var(--line)] bg-black/20 px-3 py-3 text-base outline-none focus:border-[var(--accent)] sm:py-2.5 sm:text-sm"
          />
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm text-[var(--muted)]"
            style={{ boxShadow: "0 0 0 1px var(--line)" }}
            onClick={() => setFiltersOpen((o) => !o)}
            aria-expanded={filtersOpen}
          >
            <span>Filters</span>
            <span className="text-xs">{filtersOpen ? "Hide" : "Show"}</span>
          </button>
          <div
            className={`grid grid-cols-2 gap-2 sm:grid-cols-3 ${
              filtersOpen ? "" : "hidden"
            }`}
          >
            <select
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              aria-label="Material"
              className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="all">All materials</option>
              <option value="poly">Poly family (poly + co-poly)</option>
              <option value="polyester">Polyester only</option>
              <option value="co-poly">Co-poly only</option>
              <option value="multifilament">Multifilament</option>
              <option value="synthetic-gut">Synthetic gut</option>
              <option value="natural-gut">Natural gut</option>
              <option value="hybrid">Hybrid</option>
            </select>
            <select
              value={shape}
              onChange={(e) => setShape(e.target.value)}
              aria-label="Shape"
              className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="all">Any shape</option>
              <option value="round">Round</option>
              <option value="octagonal">Octagonal</option>
              <option value="hexagonal">Hexagonal</option>
              <option value="pentagonal">Pentagonal</option>
              <option value="triangular">Triangular</option>
              <option value="twisted">Twisted</option>
              <option value="textured">Textured</option>
            </select>
            <select
              value={gaugeFilter}
              onChange={(e) => setGaugeFilter(e.target.value)}
              aria-label="Gauge"
              className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="all">Any gauge</option>
              {GAUGE_FILTER_OPTIONS.map((g) => (
                <option key={g} value={String(g)}>
                  {g.toFixed(2)} mm ({gaugeLabel(g)})
                </option>
              ))}
            </select>
            <select
              value={tensionFilter}
              onChange={(e) => setTensionFilter(e.target.value as TensionFilter)}
              aria-label="Tension band"
              className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="all">Any tension band</option>
              <option value="soft">Soft rec. (≤50 lbs)</option>
              <option value="mid">Mid rec. (50–54)</option>
              <option value="firm">Firm rec. (55+)</option>
              <option value="target">Fits my tension…</option>
            </select>
            {tensionFilter === "target" ? (
              <label className="col-span-2 flex items-center gap-2 sm:col-span-2">
                <span className="sr-only">Target tension</span>
                <input
                  type="number"
                  min={40}
                  max={70}
                  step={0.5}
                  value={targetTension}
                  onChange={(e) => setTargetTension(parseFloat(e.target.value) || 52)}
                  className="w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2.5 text-sm tabular-nums outline-none focus:border-[var(--accent)]"
                  aria-label="Target tension in pounds"
                />
                <span className="shrink-0 text-xs text-[var(--muted)]">lbs</span>
              </label>
            ) : (
              <p className="col-span-2 self-center text-xs text-[var(--muted)]">
                Filter by material, gauge (e.g. 1.30), shape, or tension.
              </p>
            )}
          </div>
        </div>

        {categoryActive ? (
          <div
            className="rounded-md px-3 py-3 text-sm leading-relaxed"
            style={{
              background: "rgba(125,211,252,0.06)",
              boxShadow: "inset 0 0 0 1px rgba(125,211,252,0.25)",
            }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-300">
              Category · {filtered.length} match
              {filtered.length === 1 ? "" : "es"}
            </p>
            <p className="mt-2 text-[var(--foreground)]/90">
              {stringCategoryBlurb(categoryMaterial, categoryGauge, shape)}
            </p>
            <ul className="mt-3 max-h-48 space-y-1.5 overflow-y-auto text-xs text-[var(--muted)]">
              {[...filtered]
                .sort((a, b) => b.spin - a.spin)
                .slice(0, 12)
                .map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(s.id)}
                      className="text-left transition hover:text-sky-300"
                    >
                      {s.brand} {s.name}
                      <span className="tabular-nums text-[var(--foreground)]/60">
                        {" "}
                        · Sp {s.spin} · Ctl {s.control} ·{" "}
                        {s.gaugesMm.map((g) => g.toFixed(2)).join("/")} mm
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        ) : null}

        <p className="text-xs text-[var(--muted)]">
          {filtered.length} string{filtered.length === 1 ? "" : "s"}
          {material !== "all" ||
          deferredQuery ||
          tensionFilter !== "all" ||
          shape !== "all" ||
          gaugeFilter !== "all"
            ? " match"
            : " in catalog"}
        </p>

        <ul className="max-h-[min(70vh,28rem)] divide-y divide-[var(--line)] overflow-y-auto overscroll-contain border-y border-[var(--line)] md:max-h-[32rem]">
          {filtered.map((s) => {
            const active = s.id === selected?.id;
            const saved = s.id === setup.stringId;
            const [rLo, rHi] = s.tensionRangeLbs;
            return (
              <li key={s.id} className="flex items-stretch gap-0.5">
                <button
                  type="button"
                  onClick={() => setSelectedId(s.id)}
                  aria-pressed={active}
                  className={`flex min-w-0 flex-1 items-center gap-2.5 px-2 py-3 text-left transition sm:gap-3 ${
                    active ? "bg-[var(--accent-dim)]" : "hover:bg-white/[0.03]"
                  }`}
                >
                  <EquipmentThumb
                    src={stringImageUrl(s)}
                    alt={`${s.brand} ${s.name}`}
                    size="sm"
                  />
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2 font-[family-name:var(--font-display)] text-sm tracking-tight">
                      {s.brand} {s.name}
                      {saved ? (
                        <span className="rounded bg-sky-400/20 px-1.5 py-0.5 text-[10px] font-sans font-semibold uppercase tracking-wider text-sky-300">
                          Setup
                        </span>
                      ) : null}
                    </span>
                    <span className="text-xs text-[var(--muted)]">
                      {materialLabel(s.material)} · {shapeLabel(s.shape)} · {rLo}–{rHi} lbs
                      <span className="hidden sm:inline">
                        {" "}
                        · {s.gaugesMm.map((g) => g.toFixed(2)).join("/")} mm
                      </span>
                    </span>
                    <span className="hidden flex-wrap gap-x-3 gap-y-0.5 font-mono text-[10px] tabular-nums text-[var(--foreground)]/70 sm:flex">
                      <span style={{ color: "#7dd3fc" }}>Sp {s.spin}</span>
                      <span style={{ color: "#c8f560" }}>Ctl {s.control}</span>
                      <span style={{ color: "#f4a261" }}>Pwr {s.power}</span>
                      <span style={{ color: "#e9c46a" }}>Dur {s.durability}</span>
                      <span>Tm {s.tensionMaintenance}</span>
                      <span>Stf {stringStiffness(s)}</span>
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    saveStringRow(s);
                  }}
                  className="m-1.5 min-h-11 shrink-0 self-center rounded-md px-3 py-2.5 text-xs font-semibold uppercase tracking-wide transition active:scale-[0.98] sm:min-h-10 sm:px-3.5"
                  style={{
                    background: saved ? "rgba(125,211,252,0.12)" : "var(--accent)",
                    color: saved ? "#7dd3fc" : "#0b1a14",
                    boxShadow: saved ? "0 0 0 1px #7dd3fc" : "none",
                  }}
                  aria-label={
                    saved
                      ? `${s.brand} ${s.name} already in setup`
                      : `Save ${s.brand} ${s.name} to my setup`
                  }
                >
                  {saved ? "Saved" : "Save"}
                </button>
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="px-2 py-8 text-sm text-[var(--muted)]">
              No strings match. Try co-poly + 1.30 mm, clear tension filter, or widen the query.
            </li>
          )}
        </ul>
      </div>

      {selected && selectedOutcome && (
        <div
          className="order-2 space-y-6 lg:space-y-8"
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
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span
                  className="rounded-md px-2.5 py-1 font-medium tabular-nums"
                  style={{
                    color: "#c8f560",
                    background: "color-mix(in srgb, #c8f560 12%, transparent)",
                    boxShadow: "inset 0 0 0 1px color-mix(in srgb, #c8f560 40%, transparent)",
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
                  background: inSetup ? "rgba(125,211,252,0.12)" : "var(--accent)",
                  color: inSetup ? "#7dd3fc" : "#0b1a14",
                  boxShadow: inSetup ? "0 0 0 1px #7dd3fc" : "none",
                }}
              >
                {inSetup ? "Saved in my setup" : "Save to my setup"}
              </button>
            </div>
          </header>

          <SpinPotentialRing value={selectedOutcome.spin} />

          <ScoreGrid
            scores={[
              { label: "Spin @ setup", value: selectedOutcome.spin, accent: "#7dd3fc" },
              { label: "Control @ setup", value: selectedOutcome.control },
              { label: "Power @ setup", value: selectedOutcome.power, accent: "#f4a261" },
              { label: "Comfort @ setup", value: selectedOutcome.comfort, accent: "#e9c46a" },
              { label: "Durability @ gauge", value: selectedOutcome.durability, accent: "#f4a261" },
              {
                label: "Tension maintenance",
                value: selected.tensionMaintenance,
                accent: "#e9c46a",
              },
              { label: "Stiffness feel", value: selectedOutcome.stiffness, accent: "#e8efe9" },
            ]}
          />

          {(() => {
            const alts = findSimilarStrings(selected, strings, { limit: 4 });
            if (alts.length === 0) return null;
            return (
              <section className="border-t border-[var(--line)] pt-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-300">
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
                        className="min-w-0 text-left transition hover:text-sky-300"
                      >
                        <span className="font-[family-name:var(--font-display)] tracking-tight">
                          {a.string.brand} {a.string.name}
                        </span>
                        <span className="ml-2 text-[11px] tabular-nums text-sky-300/80">
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
                  Tension ({lo}–{hi} lbs) · recommended {selected.recommendedTensionLbs}
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
      <ScoreMeter label="Spin" value={spin} accent="#7dd3fc" />
      <ScoreMeter label="Control" value={control} />
      <ScoreMeter label="Power" value={power} accent="#f4a261" />
      <ScoreMeter label="Comfort" value={comfort} accent="#e9c46a" />
      <ScoreMeter label="Durability" value={durability} accent="#f4a261" />
      <ScoreMeter label="Stiffness" value={stiffness} accent="#e8efe9" />
      <ScoreMeter label="Tension maint." value={tensionMaint} accent="#e9c46a" />
    </div>
  );
}
