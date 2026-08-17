"use client";

import { useCallback, useMemo, useState } from "react";
import type { LeadTapePiece, LeadTapeZone, RacketProfile } from "@/types/equipment";
import {
  LEAD_TAPE_MASS_PRESETS,
  LEAD_TAPE_ZONES,
  computeLeadTapeEffect,
  createLeadTapePiece,
} from "@/lib/equipment/leadTape";
import type { TapeTowardPlan } from "@/lib/equipment/leadTapePlan";
import {
  computeFlightMetrics,
  scoreDeltasFromTape,
} from "@/lib/equipment/setupSynthesis";
import { useGearStore } from "@/store/gearStore";
import { LaunchAngleVisual, SwingPathVisual, StrikeCoachingBullets, strikeZoneForFrame } from "./RacketVisuals";
import { MoldTowardPanel } from "./MoldTowardPanel";
import { LeadTapeRacketDiagram } from "./LeadTapeRacketDiagram";

const ZONE_ORDER: LeadTapeZone[] = ["tip", "twelve", "three", "nine", "throat", "handle"];

export function LeadTapeLab({ rackets }: { rackets: RacketProfile[] }) {
  const setup = useGearStore((s) => s.setup);
  const setLeadTapePieces = useGearStore((s) => s.setLeadTapePieces);
  const pieces = useMemo(() => setup.leadTape?.pieces ?? [], [setup.leadTape?.pieces]);

  const baseRacket = useMemo(() => {
    if (setup.racketSlug) {
      const found = rackets.find((r) => r.slug === setup.racketSlug);
      if (found) return found;
    }
    return rackets[0] ?? null;
  }, [rackets, setup.racketSlug]);

  const [massPreset, setMassPreset] = useState<(typeof LEAD_TAPE_MASS_PRESETS)[number]>(1);
  const [selectedZone, setSelectedZone] = useState<LeadTapeZone>("twelve");

  const effect = useMemo(
    () => (baseRacket ? computeLeadTapeEffect(baseRacket, pieces) : null),
    [baseRacket, pieces],
  );
  const baseline = useMemo(
    () => (baseRacket ? computeLeadTapeEffect(baseRacket, []) : null),
    [baseRacket],
  );

  const tapedFlight = useMemo(() => {
    if (!baseRacket || !effect) return null;
    const zs = effect.zoneSummary;
    const tipG = (zs.tip ?? 0) + (zs.twelve ?? 0);
    const handleG = zs.handle ?? 0;
    const sideG = (zs.three ?? 0) + (zs.nine ?? 0);
    const throatG = zs.throat ?? 0;
    const sd = scoreDeltasFromTape({
      tipG,
      handleG,
      sideG,
      throatG,
      deltaSw: effect.deltaSwingweight,
      deltaPath: effect.deltaSwingPathDeg,
    });
    return computeFlightMetrics({
      launchDeg: effect.launchAngleDeg,
      pathDeg: effect.swingPathDeg,
      power: Math.round(baseRacket.power + sd.power),
      spin: Math.round(baseRacket.spin + sd.spin),
      control: Math.round(baseRacket.control + sd.control),
      swingweight: effect.swingweight,
      tipG,
      handleG,
      sideG,
    });
  }, [baseRacket, effect]);

  const updatePieces = useCallback(
    (next: LeadTapePiece[]) => setLeadTapePieces(next),
    [setLeadTapePieces],
  );

  const addAtZone = (zone: LeadTapeZone) => {
    updatePieces([...pieces, createLeadTapePiece(massPreset, zone)]);
    setSelectedZone(zone);
  };

  const removePiece = (id: string) => updatePieces(pieces.filter((p) => p.id !== id));
  const clearAll = () => updatePieces([]);

  const movePieceToZone = (id: string, zone: LeadTapeZone) => {
    const z = LEAD_TAPE_ZONES[zone];
    updatePieces(
      pieces.map((p) => (p.id === id ? { ...p, zone, x: z.x, y: z.y } : p)),
    );
  };

  if (!baseRacket || !effect || !baseline) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Load a racket catalog to customize lead tape.
      </p>
    );
  }

  const hasTape = pieces.length > 0;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <div className="space-y-5">
        <header>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            Lead tape lab
          </p>
          <h3 className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-tight md:text-4xl">
            Customize {baseRacket.brand} {baseRacket.model}
          </h3>
          <p className="mt-2 max-w-lg text-sm text-[var(--muted)]">
            {setup.racketSlug
              ? "Using your saved frame. Place tape by hand, or mold toward a pro/target frame with a calculated plan."
              : "Save a racket to My setup for your exact frame — demo base shown below. Mold-toward works best on your saved frame."}
          </p>
        </header>

        <MoldTowardPanel
          rackets={rackets}
          stock={baseRacket}
          onApplyPlan={(plan: TapeTowardPlan) => {
            updatePieces(plan.pieces);
          }}
        />

        <details className="group rounded-md border border-[var(--line)] open:bg-[var(--panel)]/40">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm text-[var(--muted)] hover:text-[var(--foreground)] [&::-webkit-details-marker]:hidden">
            <span className="font-medium text-[var(--foreground)]/90">Place tape by hand</span>
            <span className="ml-2 text-xs">— pick strip mass, tap hoop zones</span>
          </summary>
          <div className="space-y-5 border-t border-[var(--line)] px-4 py-4">

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[var(--muted)]">Strip mass</span>
          {LEAD_TAPE_MASS_PRESETS.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={massPreset === m}
              onClick={() => setMassPreset(m)}
              className="rounded-md px-3 py-1.5 text-sm tabular-nums transition"
              style={{
                background: massPreset === m ? "var(--accent-dim)" : "transparent",
                color: massPreset === m ? "var(--accent)" : "var(--foreground)",
                boxShadow: "0 0 0 1px var(--line)",
              }}
            >
              {m} g
            </button>
          ))}
          <button
            type="button"
            onClick={clearAll}
            disabled={!hasTape}
            className="ml-auto rounded-md px-3 py-1.5 text-xs text-[var(--muted)] transition hover:text-[var(--foreground)] disabled:opacity-40"
            style={{ boxShadow: "0 0 0 1px var(--line)" }}
          >
            Clear all
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ZONE_ORDER.map((zone) => {
            const massHere = pieces
              .filter((p) => p.zone === zone)
              .reduce((n, p) => n + p.massG, 0);
            const active = selectedZone === zone;
            return (
              <button
                key={zone}
                type="button"
                onClick={() => addAtZone(zone)}
                className="rounded-md px-3 py-2.5 text-left transition hover:bg-white/[0.04]"
                style={{
                  boxShadow: active
                    ? "inset 0 0 0 1px var(--accent)"
                    : "inset 0 0 0 1px var(--line)",
                  background: active ? "var(--accent-dim)" : "transparent",
                }}
                title={LEAD_TAPE_ZONES[zone].hint}
              >
                <span className="block text-xs font-medium text-[var(--foreground)]">
                  + {LEAD_TAPE_ZONES[zone].label}
                </span>
                <span className="mt-0.5 block text-[10px] tabular-nums text-[var(--muted)]">
                  {massHere > 0 ? `${massHere} g here` : `adds ${massPreset} g`}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative mx-auto w-full max-w-md">
          <LeadTapeRacketDiagram
            pieces={pieces}
            selectedZone={selectedZone}
            interactive
            onZoneClick={addAtZone}
          />
        </div>

        {hasTape ? (
          <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)] text-sm">
            {pieces.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 py-2.5">
                <span className="tabular-nums text-[var(--accent)]">{p.massG} g</span>
                <select
                  value={p.zone}
                  aria-label={`Move ${p.massG}g strip`}
                  onChange={(e) => movePieceToZone(p.id, e.target.value as LeadTapeZone)}
                  className="min-w-0 flex-1 rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 py-1.5 text-xs outline-none focus:border-[var(--accent)]"
                >
                  {ZONE_ORDER.map((z) => (
                    <option key={z} value={z}>
                      {LEAD_TAPE_ZONES[z].label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removePiece(p.id)}
                  className="text-xs text-[var(--muted)] transition hover:text-[var(--amber)]"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--muted)]">
            No tape yet — stock frame specs shown on the right. Add strips to see the deltas.
          </p>
        )}
          </div>
        </details>
      </div>

      <div className="space-y-6">
        <section
          className="rounded-md px-4 py-4"
          style={{ boxShadow: "inset 0 0 0 1px var(--line)" }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            With tape vs stock frame
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Stock = no lead tape. Values update as you add or move strips.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[18rem] text-left text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                  <th className="py-2 pr-3 font-medium">Metric</th>
                  <th className="px-2 py-2 font-medium">Stock</th>
                  <th className="px-2 py-2 font-medium">With tape</th>
                  <th className="px-2 py-2 font-medium">Delta</th>
                </tr>
              </thead>
              <tbody>
                <CompareRow
                  label="Weight"
                  stock={`${baseRacket.weightG ?? "—"} g`}
                  withTape={`${effect.weightG} g`}
                  delta={
                    hasTape ? `+${effect.addedMassG} g` : "—"
                  }
                  highlight={hasTape}
                />
                <CompareRow
                  label="Swingweight"
                  stock={`${baseRacket.swingweight ?? "—"}`}
                  withTape={`${effect.swingweight}`}
                  delta={
                    hasTape
                      ? `${effect.deltaSwingweight >= 0 ? "+" : ""}${effect.deltaSwingweight}`
                      : "—"
                  }
                  highlight={hasTape}
                />
                <CompareRow
                  label="Balance"
                  stock={`${baseRacket.balanceMm ?? "—"} mm`}
                  withTape={`${effect.balanceMm} mm`}
                  delta={
                    hasTape
                      ? `${effect.deltaBalanceMm >= 0 ? "+" : ""}${effect.deltaBalanceMm} mm`
                      : "—"
                  }
                  highlight={hasTape}
                />
                <CompareRow
                  label="Launch angle"
                  stock={`${baseline.launchAngleDeg}°`}
                  withTape={`${effect.launchAngleDeg}°`}
                  delta={
                    hasTape
                      ? `${effect.deltaLaunchDeg >= 0 ? "+" : ""}${effect.deltaLaunchDeg}°`
                      : "—"
                  }
                  highlight={hasTape}
                />
                <CompareRow
                  label="Swing path"
                  stock={`${baseline.swingPathDeg}°`}
                  withTape={`${effect.swingPathDeg}°`}
                  delta={
                    hasTape
                      ? `${effect.deltaSwingPathDeg >= 0 ? "+" : ""}${effect.deltaSwingPathDeg}°`
                      : "—"
                  }
                  highlight={hasTape}
                />
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
              Strike launch — stock vs taped
            </p>
            <LaunchAngleVisual
              degrees={effect.launchAngleDeg}
              pathDeg={effect.swingPathDeg}
              spin={baseRacket.spin}
              power={baseRacket.power}
              control={baseRacket.control}
              flight={tapedFlight}
              zone={strikeZoneForFrame({
                ...baseRacket,
                idealLaunchAngleDeg: effect.launchAngleDeg,
                idealSwingPathDeg: effect.swingPathDeg,
              })}
              label="Flight vs net — with tape"
            />
            <p className="mt-2 text-xs tabular-nums text-[var(--muted)]">
              Stock {baseline.launchAngleDeg}° off the bed
              {hasTape
                ? ` → taped ${effect.launchAngleDeg}° (${effect.deltaLaunchDeg >= 0 ? "+" : ""}${effect.deltaLaunchDeg}°)`
                : " · add tape to change"}
            </p>
          </div>
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
              Path through contact — stock vs taped
            </p>
            <SwingPathVisual
              degrees={effect.swingPathDeg}
              zone={strikeZoneForFrame({
                ...baseRacket,
                idealLaunchAngleDeg: effect.launchAngleDeg,
                idealSwingPathDeg: effect.swingPathDeg,
              })}
              label="Where to strike (taped mold)"
            />
            <p className="mt-2 text-xs tabular-nums text-[var(--muted)]">
              Stock {baseline.swingPathDeg}°
              {hasTape
                ? ` → taped ${effect.swingPathDeg}° (${effect.deltaSwingPathDeg >= 0 ? "+" : ""}${effect.deltaSwingPathDeg}°)`
                : " · add tape to change"}
            </p>
          </div>
        </div>
        <StrikeCoachingBullets
          launchDeg={effect.launchAngleDeg}
          pathDeg={effect.swingPathDeg}
          spin={baseRacket?.spin}
          control={baseRacket?.control}
          power={baseRacket?.power}
          headSizeSqIn={baseRacket?.headSizeSqIn}
          zone={strikeZoneForFrame({
            ...baseRacket,
            idealLaunchAngleDeg: effect.launchAngleDeg,
            idealSwingPathDeg: effect.swingPathDeg,
          })}
        />

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--amber)]">
            What this tape does
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[var(--muted)]">
            {effect.hints.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
          {hasTape && selectedZone ? (
            <p className="mt-3 text-sm text-[var(--foreground)]/85">
              <span className="text-[var(--accent)]">Last zone focus — </span>
              {LEAD_TAPE_ZONES[selectedZone].hint}
            </p>
          ) : null}
          <p className="mt-4 text-xs text-[var(--muted)]">
            Coaching-grade model for learning — not a TWU lab measurement. Layout saves with My
            setup in this browser.
          </p>
        </div>
      </div>
    </div>
  );
}

function CompareRow({
  label,
  stock,
  withTape,
  delta,
  highlight,
}: {
  label: string;
  stock: string;
  withTape: string;
  delta: string;
  highlight: boolean;
}) {
  return (
    <tr className="border-t border-[var(--line)]">
      <td className="py-2.5 pr-3 text-[var(--muted)]">{label}</td>
      <td className="px-2 py-2.5 tabular-nums text-[var(--foreground)]/70">{stock}</td>
      <td className="px-2 py-2.5 tabular-nums text-[var(--foreground)]">{withTape}</td>
      <td
        className="px-2 py-2.5 tabular-nums font-medium"
        style={{ color: highlight ? "var(--accent)" : "var(--muted)" }}
      >
        {delta}
      </td>
    </tr>
  );
}
