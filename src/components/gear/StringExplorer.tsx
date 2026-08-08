"use client";

import { useDeferredValue, useMemo, useState } from "react";
import type { StringProfile } from "@/types/equipment";
import { materialLabel, shapeLabel, tensionOutcome } from "@/lib/equipment/strings";
import { useGearStore } from "@/store/gearStore";
import { SpinPotentialRing, TensionCurve } from "./StringVisuals";
import { ScoreMeter } from "./ScoreMeter";

export function StringExplorer({ strings }: { strings: StringProfile[] }) {
  const setup = useGearStore((s) => s.setup);
  const setString = useGearStore((s) => s.setString);
  const setTensionStore = useGearStore((s) => s.setTension);
  const setGaugeStore = useGearStore((s) => s.setGauge);

  const [query, setQuery] = useState("");
  const [material, setMaterial] = useState("all");
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
    const q = deferredQuery.trim().toLowerCase();
    return strings.filter((s) => {
      if (material !== "all" && s.material !== material) return false;
      if (!q) return true;
      return `${s.brand} ${s.name} ${s.material} ${s.shape} ${s.bestFor}`.toLowerCase().includes(q);
    });
  }, [strings, deferredQuery, material]);

  const selected = filtered.find((s) => s.id === selectedId) ?? filtered[0] ?? null;
  const compare = strings.find((s) => s.id === compareId) ?? strings[0];
  const tension = selected
    ? (tensionById[selected.id] ?? selected.recommendedTensionLbs)
    : 52;
  const gauge = selected
    ? (gaugeById[selected.id] ?? selected.gaugesMm[0] ?? 1.25)
    : 1.25;
  const [lo, hi] = selected ? selected.tensionRangeLbs : ([48, 58] as [number, number]);
  const selectedOutcome = selected ? tensionOutcome(selected, tension) : null;
  const compareOutcome = compare
    ? tensionOutcome(
        compare,
        Math.min(
          compare.tensionRangeLbs[1],
          Math.max(compare.tensionRangeLbs[0], tension),
        ),
      )
    : null;
  const inSetup = selected != null && selected.id === setup.stringId;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search RPM, ALU Power, Hyper-G…"
            aria-label="Search strings"
            className="w-full flex-1 rounded-md border border-[var(--line)] bg-black/20 px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
          />
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
        </div>

        <p className="text-xs text-[var(--muted)]">
          {filtered.length} string{filtered.length === 1 ? "" : "s"}
          {material !== "all" || deferredQuery ? " match" : " in catalog"}
        </p>

        <ul className="max-h-[28rem] divide-y divide-[var(--line)] overflow-y-auto border-y border-[var(--line)]">
          {filtered.map((s) => {
            const active = s.id === selected?.id;
            const saved = s.id === setup.stringId;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(s.id)}
                  aria-pressed={active}
                  className={`flex w-full flex-col gap-0.5 px-2 py-3 text-left transition ${
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
                    {materialLabel(s.material)} · {shapeLabel(s.shape)} · spin {s.spin}
                  </span>
                </button>
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="px-2 py-8 text-sm text-[var(--muted)]">
              No strings match that search. Try another material or clear the query.
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

          {selected.gaugesMm.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                Gauge
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
                      {g} mm
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-[var(--muted)]">
                Thinner gauges usually bite more for spin; thicker lasts longer and feels firmer.
              </p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <ScoreMeter label="Durability" value={selected.durability} accent="#e9c46a" />
            <ScoreMeter
              label="Tension maintenance"
              value={selected.tensionMaintenance}
              accent="#f4a261"
            />
          </div>

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
            <TensionCurve string={selected} tension={tension} />
          </div>

          <section className="border-t border-[var(--line)] pt-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="font-[family-name:var(--font-display)] text-lg tracking-tight">
                  Compare at {tension} lbs
                </h4>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Scores adjust with the tension slider (compare clamped to each string&apos;s range).
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
                  label={selected.name}
                  spin={selectedOutcome.spin}
                  control={selectedOutcome.control}
                  power={selectedOutcome.power}
                  comfort={selectedOutcome.comfort}
                />
                <CompareColumn
                  label={compare.name}
                  spin={compareOutcome.spin}
                  control={compareOutcome.control}
                  power={compareOutcome.power}
                  comfort={compareOutcome.comfort}
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
}: {
  label: string;
  spin: number;
  control: number;
  power: number;
  comfort: number;
}) {
  return (
    <div className="space-y-3 border-t border-[var(--line)] pt-3">
      <p className="text-sm font-medium">{label}</p>
      <ScoreMeter label="Spin @ tension" value={spin} accent="#7dd3fc" />
      <ScoreMeter label="Control @ tension" value={control} />
      <ScoreMeter label="Power @ tension" value={power} accent="#f4a261" />
      <ScoreMeter label="Comfort @ tension" value={comfort} accent="#e9c46a" />
    </div>
  );
}
