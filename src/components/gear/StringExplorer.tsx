"use client";

import { useDeferredValue, useMemo, useState } from "react";
import type { StringProfile } from "@/types/equipment";
import {
  gaugeLabel,
  materialLabel,
  shapeLabel,
  stringStiffness,
  tensionOutcome,
  tensionRangeOverlaps,
} from "@/lib/equipment/strings";
import { matchesEquipmentSearch } from "@/lib/equipment/search";
import { useGearStore } from "@/store/gearStore";
import { SpinPotentialRing, TensionCurve } from "./StringVisuals";
import { ScoreGrid, ScoreMeter } from "./ScoreMeter";

type TensionFilter = "all" | "soft" | "mid" | "firm" | "target";

export function StringExplorer({ strings }: { strings: StringProfile[] }) {
  const setup = useGearStore((s) => s.setup);
  const setString = useGearStore((s) => s.setString);
  const setTensionStore = useGearStore((s) => s.setTension);
  const setGaugeStore = useGearStore((s) => s.setGauge);

  const [query, setQuery] = useState("");
  const [material, setMaterial] = useState("all");
  const [tensionFilter, setTensionFilter] = useState<TensionFilter>("all");
  const [targetTension, setTargetTension] = useState(setup.tensionLbs ?? 52);
  const [selectedId, setSelectedId] = useState(
    setup.stringId && strings.some((s) => s.id === setup.stringId)
      ? setup.stringId
      : (strings[0]?.id ?? ""),
  );
  const [compareId, setCompareId] = useState(strings[1]?.id ?? strings[0]?.id ?? "");
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
    return strings.filter((s) => {
      if (material !== "all" && s.material !== material) return false;
      if (tensionFilter === "soft" && s.recommendedTensionLbs > 50) return false;
      if (tensionFilter === "mid" && (s.recommendedTensionLbs < 50 || s.recommendedTensionLbs > 54))
        return false;
      if (tensionFilter === "firm" && s.recommendedTensionLbs < 55) return false;
      if (tensionFilter === "target" && !tensionRangeOverlaps(s, targetTension, 2)) return false;
      if (!q) return true;
      return matchesEquipmentSearch(
        q,
        s.brand,
        s.name,
        s.material,
        s.shape,
        s.bestFor,
        s.feel,
      );
    });
  }, [strings, deferredQuery, material, tensionFilter, targetTension]);

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
    ? (gaugeById[compare.id] ?? compare.gaugesMm[0] ?? 1.25)
    : 1.25;
  const compareOutcome = compare
    ? tensionOutcome(
        compare,
        Math.min(
          compare.tensionRangeLbs[1],
          Math.max(compare.tensionRangeLbs[0], tension),
        ),
        compareGauge,
      )
    : null;
  const inSetup = selected != null && selected.id === setup.stringId;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="space-y-4">
        <div className="flex flex-col gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search RPM, ALU Power, Hyper-G…"
            aria-label="Search strings"
            className="w-full rounded-md border border-[var(--line)] bg-black/20 px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
          />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <select
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              aria-label="Material"
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
              <label className="col-span-2 flex items-center gap-2 sm:col-span-1">
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
              <p className="col-span-2 self-center text-xs text-[var(--muted)] sm:col-span-1">
                Filter by recommended tension or overlap with your number.
              </p>
            )}
          </div>
        </div>

        <p className="text-xs text-[var(--muted)]">
          {filtered.length} string{filtered.length === 1 ? "" : "s"}
          {material !== "all" || deferredQuery || tensionFilter !== "all"
            ? " match"
            : " in catalog"}
        </p>

        <ul className="max-h-[28rem] divide-y divide-[var(--line)] overflow-y-auto border-y border-[var(--line)]">
          {filtered.map((s) => {
            const active = s.id === selected?.id;
            const saved = s.id === setup.stringId;
            const [rLo, rHi] = s.tensionRangeLbs;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(s.id)}
                  aria-pressed={active}
                  className={`flex w-full flex-col gap-1 px-2 py-3 text-left transition ${
                    active ? "bg-[var(--accent-dim)]" : "hover:bg-white/[0.03]"
                  }`}
                >
                  <span className="flex items-center gap-2 font-[family-name:var(--font-display)] text-sm tracking-tight">
                    {s.brand} {s.name}
                    {saved ? (
                      <span className="rounded bg-sky-400/20 px-1.5 py-0.5 text-[10px] font-sans font-semibold uppercase tracking-wider text-sky-300">
                        Setup
                      </span>
                    ) : null}
                  </span>
                  <span className="text-xs text-[var(--muted)]">
                    {materialLabel(s.material)} · {shapeLabel(s.shape)} ·{" "}
                    {rLo}–{rHi} lbs
                  </span>
                  <span className="flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[10px] tabular-nums text-[var(--foreground)]/70">
                    <span style={{ color: "#7dd3fc" }}>Sp {s.spin}</span>
                    <span style={{ color: "#c8f560" }}>Ctl {s.control}</span>
                    <span style={{ color: "#f4a261" }}>Pwr {s.power}</span>
                    <span style={{ color: "#e9c46a" }}>Dur {s.durability}</span>
                    <span>Tm {s.tensionMaintenance}</span>
                    <span>Stf {stringStiffness(s)}</span>
                  </span>
                </button>
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="px-2 py-8 text-sm text-[var(--muted)]">
              No strings match. Try another material, clear tension filter, or widen the query.
            </li>
          )}
        </ul>
      </div>

      {selected && selectedOutcome && (
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
              onClick={() =>
                setString(
                  selected.id,
                  `${selected.brand} ${selected.name}`,
                  tension,
                  gauge,
                )
              }
              className="mt-4 rounded-md px-4 py-2 text-sm font-medium transition hover:brightness-110"
              style={{
                background: inSetup ? "rgba(125,211,252,0.12)" : "var(--accent)",
                color: inSetup ? "#7dd3fc" : "#0b1a14",
                boxShadow: inSetup ? "0 0 0 1px #7dd3fc" : "none",
              }}
            >
              {inSetup ? "Saved in my setup" : "Save to my setup"}
            </button>
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
            <div className="mb-3 flex items-end justify-between gap-4">
              <label className="flex-1">
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
                  className="mt-3 w-full"
                />
              </label>
              <p className="font-[family-name:var(--font-display)] text-2xl tabular-nums">
                {tension}
                <span className="ml-1 text-sm text-[var(--muted)]">lbs</span>
              </p>
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setTensionById((prev) => ({
                    ...prev,
                    [selected.id]: selected.recommendedTensionLbs,
                  }));
                  if (inSetup) setTensionStore(selected.recommendedTensionLbs);
                }}
                className="rounded-md px-2.5 py-1 text-xs transition hover:bg-white/5"
                style={{ boxShadow: "0 0 0 1px var(--line)" }}
              >
                Use recommended ({selected.recommendedTensionLbs})
              </button>
              <button
                type="button"
                onClick={() => {
                  setTensionById((prev) => ({ ...prev, [selected.id]: lo }));
                  if (inSetup) setTensionStore(lo);
                }}
                className="rounded-md px-2.5 py-1 text-xs transition hover:bg-white/5"
                style={{ boxShadow: "0 0 0 1px var(--line)" }}
              >
                Soft end ({lo})
              </button>
              <button
                type="button"
                onClick={() => {
                  setTensionById((prev) => ({ ...prev, [selected.id]: hi }));
                  if (inSetup) setTensionStore(hi);
                }}
                className="rounded-md px-2.5 py-1 text-xs transition hover:bg-white/5"
                style={{ boxShadow: "0 0 0 1px var(--line)" }}
              >
                Firm end ({hi})
              </button>
            </div>
            <TensionCurve string={selected} tension={tension} gaugeMm={gauge} />
          </div>

          <section className="border-t border-[var(--line)] pt-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="font-[family-name:var(--font-display)] text-lg tracking-tight">
                  Compare at {tension} lbs
                </h4>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Scores adjust with tension + each string&apos;s selected/reference gauge.
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
