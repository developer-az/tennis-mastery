"use client";

/**
 * Compact dials for tension, gauge, and grip size once products are saved.
 * Keeps fine-tuning out of the product-picking flow.
 */

import { useMemo } from "react";
import type { StringProfile } from "@/types/equipment";
import { GRIP_SIZES, type GripSizeCode } from "@/lib/equipment/gripSize";
import { gaugeLabel, tensionOutcome } from "@/lib/equipment/strings";
import { useGearStore } from "@/store/gearStore";

export function SetupDials({
  strings,
  compact = false,
  /** When true, hide string tension/gauge (Strings tab owns those dials). */
  hideStringDials = false,
}: {
  strings: StringProfile[];
  compact?: boolean;
  hideStringDials?: boolean;
}) {
  const setup = useGearStore((s) => s.setup);
  const setTension = useGearStore((s) => s.setTension);
  const setGauge = useGearStore((s) => s.setGauge);
  const setGripSize = useGearStore((s) => s.setGripSize);

  const string = useMemo(
    () => (setup.stringId ? strings.find((s) => s.id === setup.stringId) ?? null : null),
    [strings, setup.stringId],
  );

  const hasString = Boolean(setup.stringId) && !hideStringDials;
  const hasGrip =
    (setup.gripLayers?.length ?? 0) > 0 || Boolean(setup.gripId);
  const overgripCount =
    setup.gripLayers?.filter((l) => l.kind === "overgrip").length ??
    (setup.gripId ? 1 : 0);
  if (!hasString && !hasGrip) return null;

  const tension =
    setup.tensionLbs ?? string?.recommendedTensionLbs ?? 52;
  const [lo, hi] = string?.tensionRangeLbs ?? [44, 62];
  const gauges = string?.gaugesMm?.length
    ? string.gaugesMm
    : setup.gaugeMm != null
      ? [setup.gaugeMm]
      : [1.25];
  const gauge = setup.gaugeMm ?? gauges[0];
  const outcome = string ? tensionOutcome(string, tension, gauge) : null;

  return (
    <div
      className={`border border-[var(--line)] bg-[var(--panel)]/95 ${
        compact ? "px-3 py-3" : "px-4 py-4 md:px-5"
      }`}
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            Dial your setup
          </p>
          {!compact ? (
            <p className="mt-1 text-xs text-[var(--muted)]">
              Tension, gauge, and grip size — change here without re-picking products.
            </p>
          ) : null}
        </div>
        {outcome ? (
          <p className="text-[11px] tabular-nums text-[var(--muted)]">
            Bed · Sp {outcome.spin} · Ctl {outcome.control} · Pwr {outcome.power}
          </p>
        ) : null}
      </div>

      {outcome ? (
        <p className="mt-2 text-[11px] leading-relaxed text-[var(--muted)]">
          <span className="text-[var(--sky)]">Science — </span>
          {outcome.dwellHint} {outcome.launchHint}
          {string && setup.tensionLbs != null
            ? ` Midpoint ${string.recommendedTensionLbs} lbs; ±2 lbs is a clean A/B step.`
            : ""}
        </p>
      ) : null}

      <div
        className={`mt-3 grid gap-4 ${
          hasString && hasGrip ? "sm:grid-cols-3" : hasString ? "sm:grid-cols-2" : ""
        }`}
      >
        {hasString ? (
          <>
            <label className="block min-w-0">
              <span className="mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                Tension
                <span className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={Math.min(lo, tension) - 2}
                    max={Math.max(hi, tension) + 2}
                    step={0.5}
                    value={tension}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (Number.isFinite(v)) setTension(v);
                    }}
                    className="w-16 rounded border border-[var(--line)] bg-black/30 px-1.5 py-0.5 text-right text-xs tabular-nums text-[var(--accent)] outline-none focus:border-[var(--accent)]"
                    aria-label="String tension in pounds (number)"
                  />
                  <span className="text-[var(--muted)]">lbs</span>
                </span>
              </span>
              <input
                type="range"
                min={Math.min(lo, tension)}
                max={Math.max(hi, tension)}
                step={0.5}
                value={tension}
                onChange={(e) => setTension(parseFloat(e.target.value))}
                className="w-full accent-[var(--accent)]"
                aria-label="String tension in pounds"
              />
              <span className="mt-1 flex justify-between text-[10px] tabular-nums text-[var(--muted)]">
                <span>{lo}</span>
                <span>rec {string?.recommendedTensionLbs ?? "—"}</span>
                <span>{hi}</span>
              </span>
            </label>

            <div className="min-w-0">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                Gauge
              </p>
              <div className="flex flex-wrap gap-1.5">
                {gauges.map((g) => {
                  const active = Math.abs(g - gauge) < 0.001;
                  return (
                    <button
                      key={g}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setGauge(g)}
                      className="min-h-10 rounded-md px-2.5 py-1.5 text-sm tabular-nums transition"
                      style={{
                        background: active ? "var(--accent-dim)" : "transparent",
                        color: active ? "var(--accent)" : "var(--foreground)",
                        boxShadow: "0 0 0 1px var(--line)",
                      }}
                    >
                      {g.toFixed(2)}
                      <span className="ml-1 text-[10px] text-[var(--muted)]">
                        {gaugeLabel(g)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        ) : null}

        {hasGrip ? (
          <div className="min-w-0 sm:col-span-1">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
              Grip size
            </p>
            <div className="flex flex-wrap gap-1.5">
              {GRIP_SIZES.map((g) => {
                const active = setup.gripSize === g.code;
                return (
                  <button
                    key={g.code}
                    type="button"
                    title={g.hint}
                    aria-pressed={active}
                    onClick={() =>
                      setGripSize(active ? null : (g.code as GripSizeCode))
                    }
                    className="min-h-10 rounded-md px-2 py-1.5 text-xs font-medium transition sm:text-sm"
                    style={{
                      background: active ? "rgba(244,162,97,0.18)" : "transparent",
                      color: active ? "var(--amber)" : "var(--foreground)",
                      boxShadow: active
                        ? "0 0 0 1px var(--amber)"
                        : "0 0 0 1px var(--line)",
                    }}
                  >
                    {g.code}
                  </button>
                );
              })}
            </div>
            {setup.gripSize ? (
              <p className="mt-1.5 text-[11px] text-[var(--muted)]">
                {GRIP_SIZES.find((x) => x.code === setup.gripSize)?.label}
                {" — "}
                {GRIP_SIZES.find((x) => x.code === setup.gripSize)?.hint}
                {overgripCount > 0
                  ? ` · ${overgripCount} overgrip${overgripCount === 1 ? "" : "s"} in stack`
                  : ""}
              </p>
            ) : (
              <p className="mt-1.5 text-[11px] text-[var(--muted)]">
                Pick the handle size stamped on your frame — stack overgrips on the Grips tab.
              </p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
