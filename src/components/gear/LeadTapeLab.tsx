"use client";

import { useCallback, useMemo, useState } from "react";
import type { GripProfile, LeadTapePiece, LeadTapeZone, RacketProfile, StringProfile } from "@/types/equipment";
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
  synthesizeCombinedSetup,
} from "@/lib/equipment/setupSynthesis";
import { useGearStore } from "@/store/gearStore";
import { usePlayerStore } from "@/store/playerStore";
import { prefersArmFriendlySetup } from "@/lib/player/constraints";
import { LaunchAngleVisual, strikeZoneForFrame } from "./RacketVisuals";
import { MoldTowardPanel } from "./MoldTowardPanel";
import { LeadTapeRacketDiagram } from "./LeadTapeRacketDiagram";

const ZONE_ORDER: LeadTapeZone[] = ["tip", "twelve", "three", "nine", "throat", "handle"];

const ZONE_PLAIN: Record<LeadTapeZone, string> = {
  tip: "Tip — more plow",
  twelve: "12 o’clock — more plow",
  three: "3 o’clock — more stable",
  nine: "9 o’clock — more stable",
  throat: "Neck — a bit more control",
  handle: "Handle — quicker whip",
};

export function LeadTapeLab({
  rackets,
  strings = [],
  grips = [],
}: {
  rackets: RacketProfile[];
  strings?: StringProfile[];
  grips?: GripProfile[];
}) {
  const setup = useGearStore((s) => s.setup);
  const setLeadTapePieces = useGearStore((s) => s.setLeadTapePieces);
  const profile = usePlayerStore((s) => s.profile);
  const pieces = useMemo(() => setup.leadTape?.pieces ?? [], [setup.leadTape?.pieces]);

  const baseRacket = useMemo(() => {
    if (setup.racketSlug) {
      const found = rackets.find((r) => r.slug === setup.racketSlug);
      if (found) return found;
    }
    return rackets[0] ?? null;
  }, [rackets, setup.racketSlug]);

  const bagString = useMemo(
    () => (setup.stringId ? strings.find((s) => s.id === setup.stringId) ?? null : null),
    [strings, setup.stringId],
  );
  const bagGrip = useMemo(() => {
    const outerId = setup.gripLayers?.[setup.gripLayers.length - 1]?.id ?? setup.gripId;
    return outerId ? grips.find((g) => g.id === outerId) ?? null : null;
  }, [grips, setup.gripId, setup.gripLayers]);

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

  /** Frame+tape-only flight (isolated lab view) */
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

  /** Full bag mold — string + grip + tape (matches You / Combined Setup) */
  const bagInsight = useMemo(() => {
    if (!baseRacket) return null;
    return synthesizeCombinedSetup(setup, baseRacket, bagString, bagGrip, grips, {
      playerGrip: profile.grips.forehand,
      armFriendly: prefersArmFriendlySetup(profile),
    });
  }, [setup, baseRacket, bagString, bagGrip, grips, profile]);

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
    updatePieces(pieces.map((p) => (p.id === id ? { ...p, zone, x: z.x, y: z.y } : p)));
  };

  if (!baseRacket || !effect || !baseline) {
    return <p className="text-sm text-[var(--muted)]">Load a racket catalog to customize lead tape.</p>;
  }

  const hasTape = pieces.length > 0;
  const totalG = pieces.reduce((n, p) => n + p.massG, 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:items-start">
      <div className="space-y-4">
        <header>
          <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-tight md:text-3xl">
            {baseRacket.brand} {baseRacket.model}
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Place tape by hand on the hoop, or mold toward a target frame on the right. Tip/12 adds plow; 3
            and 9 add stability; neck solidifies; handle speeds the whip.
          </p>
        </header>

        <div className="grid grid-cols-3 gap-2">
          <Stat
            label="Weight"
            value={`${effect.weightG} g`}
            delta={hasTape ? `+${effect.addedMassG} g` : null}
          />
          <Stat
            label="Swingweight"
            value={`${effect.swingweight}`}
            delta={
              hasTape
                ? `${effect.deltaSwingweight >= 0 ? "+" : ""}${effect.deltaSwingweight}`
                : null
            }
          />
          <Stat
            label="Balance"
            value={`${effect.balanceMm} mm`}
            delta={
              hasTape
                ? `${effect.deltaBalanceMm >= 0 ? "+" : ""}${effect.deltaBalanceMm} mm`
                : null
            }
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-[var(--muted)]">Strip</span>
          {LEAD_TAPE_MASS_PRESETS.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={massPreset === m}
              onClick={() => setMassPreset(m)}
              className="rounded px-2.5 py-1 text-xs tabular-nums"
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
            className="ml-auto text-[11px] text-[var(--muted)] disabled:opacity-40"
          >
            Clear {hasTape ? `${totalG} g` : ""}
          </button>
        </div>

        <div className="mx-auto w-full max-w-sm">
          <LeadTapeRacketDiagram
            pieces={pieces}
            selectedZone={selectedZone}
            interactive
            onZoneClick={addAtZone}
          />
        </div>

        <p className="text-center text-[11px] text-[var(--muted)]">{ZONE_PLAIN[selectedZone]}</p>

        {hasTape ? (
          <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)] text-sm">
            {pieces.map((p) => (
              <li key={p.id} className="flex items-center gap-2 py-2">
                <span className="w-10 tabular-nums text-[var(--accent)]">{p.massG} g</span>
                <select
                  value={p.zone}
                  aria-label={`Move ${p.massG}g strip`}
                  onChange={(e) => movePieceToZone(p.id, e.target.value as LeadTapeZone)}
                  className="sf-select min-w-0 flex-1"
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
                  className="text-xs text-[var(--muted)] hover:text-[var(--amber)]"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="space-y-4">
        <details open className="rounded-md border border-[var(--line)]">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-[var(--foreground)] hover:text-[var(--accent)] [&::-webkit-details-marker]:hidden">
            Mold toward a target frame
            <span className="ml-2 text-[11px] font-normal text-[var(--muted)]">
              calculated tip / handle plan
            </span>
          </summary>
          <div className="border-t border-[var(--line)] px-3 pb-3 pt-2">
            <MoldTowardPanel
              rackets={rackets}
              stock={baseRacket}
              onApplyPlan={(plan: TapeTowardPlan) => {
                updatePieces(plan.pieces);
              }}
            />
          </div>
        </details>

        {effect.hints.length > 0 ? (
          <section className="rounded-md border border-[var(--line)] px-4 py-3">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
              What changed
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-[var(--foreground)]/85">
              {effect.hints.slice(0, 3).map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <details className="rounded-md border border-[var(--line)]">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm text-[var(--muted)] hover:text-[var(--foreground)] [&::-webkit-details-marker]:hidden">
            Ball flight with this tape
            <span className="ml-2 tabular-nums text-[11px]">
              {bagInsight?.launchAngleDeg != null
                ? `${bagInsight.launchAngleDeg.toFixed(1)}° leave (full bag)`
                : `${effect.launchAngleDeg.toFixed(1)}° leave`}
              {bagInsight?.flight
                ? ` · +${bagInsight.flight.netClearIn.toFixed(1)}″ net`
                : tapedFlight
                  ? ` · +${tapedFlight.netClearIn.toFixed(1)}″ net`
                  : ""}
            </span>
          </summary>
          <div className="border-t border-[var(--line)] px-3 py-3 space-y-3">
            {bagInsight?.launchAngleDeg != null && bagInsight.flight ? (
              <>
                <p className="text-[10px] font-semibold tracking-[0.12em] text-[var(--accent)] uppercase">
                  Full bag mold (string · grip · tape)
                </p>
                <LaunchAngleVisual
                  degrees={bagInsight.launchAngleDeg}
                  pathDeg={bagInsight.swingPathDeg ?? undefined}
                  spin={bagInsight.scores.spin}
                  power={bagInsight.scores.power}
                  control={bagInsight.scores.control}
                  flight={bagInsight.flight}
                  zone={strikeZoneForFrame({
                    ...baseRacket,
                    idealLaunchAngleDeg: bagInsight.launchAngleDeg,
                    idealSwingPathDeg: bagInsight.swingPathDeg,
                    spin: bagInsight.scores.spin,
                    control: bagInsight.scores.control,
                    power: bagInsight.scores.power,
                  })}
                  label="Side view — your court"
                  compact
                />
                <p className="text-xs tabular-nums text-[var(--muted)]">
                  Leave {bagInsight.launchAngleDeg.toFixed(1)}°
                  {bagInsight.deltas.tapeLaunch
                    ? ` (tape ${bagInsight.deltas.tapeLaunch >= 0 ? "+" : ""}${bagInsight.deltas.tapeLaunch}°)`
                    : ""}
                  {" · "}path {bagInsight.swingPathDeg?.toFixed(0) ?? "—"}°
                  {bagInsight.deltas.tapePath
                    ? ` (tape ${bagInsight.deltas.tapePath >= 0 ? "+" : ""}${bagInsight.deltas.tapePath}°)`
                    : ""}
                </p>
              </>
            ) : (
              <>
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
                  label="Side view — frame + tape"
                  compact
                />
                <p className="text-xs tabular-nums text-[var(--muted)]">
                  Stock {baseline.launchAngleDeg}° leave
                  {hasTape
                    ? ` → ${effect.launchAngleDeg}° (${effect.deltaLaunchDeg >= 0 ? "+" : ""}${effect.deltaLaunchDeg}°)`
                    : ""}
                  {" · "}
                  path {baseline.swingPathDeg}°
                  {hasTape
                    ? ` → ${effect.swingPathDeg}° (${effect.deltaSwingPathDeg >= 0 ? "+" : ""}${effect.deltaSwingPathDeg}°)`
                    : ""}
                </p>
              </>
            )}
          </div>
        </details>
      </div>
    </div>
  );
}

function Stat({ label, value, delta }: { label: string; value: string; delta: string | null }) {
  return (
    <div className="rounded-md border border-[var(--line)] px-2.5 py-2">
      <p className="text-[10px] tracking-[0.12em] text-[var(--muted)] uppercase">{label}</p>
      <p className="mt-0.5 font-[family-name:var(--font-display)] text-lg tabular-nums">{value}</p>
      <p className="text-[11px] tabular-nums text-[var(--accent)]">{delta ?? "stock"}</p>
    </div>
  );
}
