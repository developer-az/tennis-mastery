"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { RacketProfile } from "@/types/equipment";
import { matchesEquipmentSearch, searchMatchScore } from "@/lib/equipment/search";
import {
  findBudgetFrameAlternatives,
  planTapeTowardTarget,
  targetFromRacket,
  type TapeTowardPlan,
} from "@/lib/equipment/leadTapePlan";
import { LEAD_TAPE_ZONES } from "@/lib/equipment/leadTape";
import { useGearStore } from "@/store/gearStore";

/**
 * Mold your (often cheaper) frame toward a pro / target retail mold with a
 * coaching-grade lead-tape plan + budget alternatives.
 */
export function MoldTowardPanel({
  rackets,
  stock,
  onApplyPlan,
}: {
  rackets: RacketProfile[];
  stock: RacketProfile;
  onApplyPlan: (plan: TapeTowardPlan) => void;
}) {
  const setupSlug = useGearStore((s) => s.setup.racketSlug);
  const setRacket = useGearStore((s) => s.setRacket);
  const [query, setQuery] = useState("");
  const [targetSlug, setTargetSlug] = useState<string>("");
  const deferred = useDeferredValue(query);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mold = new URL(window.location.href).searchParams.get("mold");
    if (mold && rackets.some((r) => r.slug === mold)) {
      setTargetSlug(mold);
      setQuery("");
    }
  }, [rackets]);

  const proFrames = useMemo(
    () =>
      rackets.filter(
        (r) => (r.atpPlayers?.length ?? 0) + (r.wtaPlayers?.length ?? 0) > 0,
      ),
    [rackets],
  );

  const matches = useMemo(() => {
    const q = deferred.trim();
    const pool = q
      ? rackets.filter((r) =>
          matchesEquipmentSearch(
            q,
            r.brand,
            r.model,
            r.slug,
            r.year,
            r.style,
            [...(r.atpPlayers ?? []), ...(r.wtaPlayers ?? [])].join(" "),
          ),
        )
      : proFrames.length > 0
        ? proFrames
        : rackets;
    const sorted = [...pool];
    sorted.sort((a, b) => {
      if (q) {
        const d =
          searchMatchScore(q, b.brand, b.model, b.slug) -
          searchMatchScore(q, a.brand, a.model, a.slug);
        if (d !== 0) return d;
      }
      const pb =
        (b.atpPlayers?.length ?? 0) +
        (b.wtaPlayers?.length ?? 0) -
        ((a.atpPlayers?.length ?? 0) + (a.wtaPlayers?.length ?? 0));
      if (pb !== 0) return pb;
      return b.year - a.year;
    });
    return sorted.slice(0, 40);
  }, [rackets, deferred, proFrames]);

  const target =
    rackets.find((r) => r.slug === targetSlug) ??
    matches.find((r) => r.slug !== stock.slug) ??
    null;

  const plan = useMemo(() => {
    if (!target || target.slug === stock.slug) return null;
    return planTapeTowardTarget(stock, targetFromRacket(target));
  }, [stock, target]);

  const budgetAlts = useMemo(() => {
    if (!target) return [];
    return findBudgetFrameAlternatives(rackets, target, { limit: 4 }).filter(
      (a) => a.racket.slug !== stock.slug,
    );
  }, [rackets, target, stock.slug]);

  const saveBudgetFrame = (r: RacketProfile, apply?: TapeTowardPlan) => {
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
    if (apply) onApplyPlan(apply);
  };

  return (
    <section
      className="space-y-4 rounded-md border border-[var(--line)] bg-black/15 p-4"
      style={{ animation: "rise 0.4s ease-out both" }}
    >
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
          Mold toward a target
        </p>
        <h4 className="mt-1 font-[family-name:var(--font-display)] text-xl tracking-tight">
          Pro feel on a budget frame
        </h4>
        <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
          Pick a target mold (often a pro&apos;s retail frame). We estimate lead-tape on{" "}
          <span className="text-[var(--foreground)]/85">
            {stock.brand} {stock.model}
          </span>{" "}
          to close weight / SW / balance — and list lighter alternatives you can customize instead.
        </p>
      </header>

      <label className="block">
        <span className="sr-only">Search target frame or pro</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Prestige Pro, Alcaraz, CX 200…"
          inputMode="search"
          enterKeyHint="search"
          className="w-full rounded-md border border-[var(--line)] bg-black/20 px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
        />
      </label>

      <ul className="max-h-40 divide-y divide-[var(--line)] overflow-y-auto overscroll-contain border-y border-[var(--line)]">
        {matches.map((r) => {
          const active = r.slug === (target?.slug ?? "");
          const pros = [...(r.atpPlayers ?? []), ...(r.wtaPlayers ?? [])].slice(0, 3);
          const isStock = r.slug === stock.slug;
          return (
            <li key={r.slug}>
              <button
                type="button"
                disabled={isStock}
                onClick={() => setTargetSlug(r.slug)}
                className={`flex w-full flex-col gap-0.5 px-2 py-2.5 text-left text-sm transition disabled:opacity-40 ${
                  active ? "bg-[var(--accent-dim)]" : "hover:bg-white/[0.03]"
                }`}
              >
                <span className="font-[family-name:var(--font-display)] tracking-tight">
                  {r.brand} {r.model}
                  {isStock ? (
                    <span className="ml-2 text-[10px] uppercase text-[var(--muted)]">Your frame</span>
                  ) : null}
                </span>
                <span className="text-xs text-[var(--muted)]">
                  {r.year}
                  {r.weightG != null ? ` · ${r.weightG}g` : ""}
                  {r.swingweight != null ? ` · SW ${r.swingweight}` : ""}
                  {pros.length ? ` · ${pros.join(", ")}` : ""}
                </span>
              </button>
            </li>
          );
        })}
        {matches.length === 0 ? (
          <li className="px-2 py-6 text-xs text-[var(--muted)]">No target frames match.</li>
        ) : null}
      </ul>

      {plan && target ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <GapChip label="Weight" gap={plan.gaps.weightG} unit="g" />
            <GapChip label="SW" gap={plan.gaps.swingweight} unit="" />
            <GapChip label="Balance" gap={plan.gaps.balanceMm} unit="mm" />
          </div>

          <p className="text-sm leading-relaxed text-[var(--foreground)]/90">{plan.summary}</p>

          {plan.steps.length > 0 ? (
            <ul className="space-y-1.5 text-xs text-[var(--muted)]">
              {plan.steps.map((s, i) => (
                <li
                  key={`${s.zone}-${i}`}
                  className="flex gap-2 border-l-2 border-[var(--accent)]/40 pl-2"
                >
                  <span className="shrink-0 tabular-nums text-[var(--accent)]">
                    +{s.massG}g {LEAD_TAPE_ZONES[s.zone].label.split(" ")[0]}
                  </span>
                  <span>{s.why}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {plan.caveats.map((c) => (
            <p key={c} className="text-xs text-[var(--amber)]">
              {c}
            </p>
          ))}

          {plan.pieces.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onApplyPlan(plan)}
                className="min-h-11 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-ink)] transition hover:brightness-110"
              >
                Apply tape plan to My setup
              </button>
              {!setupSlug || setupSlug !== stock.slug ? (
                <p className="self-center text-[11px] text-[var(--muted)]">
                  Tip: save your budget frame first so the plan sticks to the right racket.
                </p>
              ) : null}
            </div>
          ) : null}

          {plan.remaining.swingweight != null || plan.remaining.weightG != null ? (
            <p className="text-[11px] tabular-nums text-[var(--muted)]">
              After plan ≈ {plan.predicted.weightG}g · SW {plan.predicted.swingweight}
              {plan.predicted.balanceMm != null ? ` · bal ${plan.predicted.balanceMm}mm` : ""}
              {plan.remaining.swingweight != null
                ? ` · remaining SW ${plan.remaining.swingweight >= 0 ? "+" : ""}${plan.remaining.swingweight}`
                : ""}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-[var(--muted)]">Select a different target frame above.</p>
      )}

      {budgetAlts.length > 0 && target ? (
        <div className="border-t border-[var(--line)] pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--amber)]">
            Budget molds toward {target.brand} {target.model}
          </p>
          <p className="mt-1 text-[11px] text-[var(--muted)]">
            Lighter / lower-SW retail frames — save one as your frame, then apply its tape plan.
          </p>
          <ul className="mt-2 space-y-2">
            {budgetAlts.map((a) => (
              <li
                key={a.racket.slug}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md px-2 py-2 text-sm"
                style={{ boxShadow: "inset 0 0 0 1px var(--line)" }}
              >
                <div className="min-w-0">
                  <p className="font-[family-name:var(--font-display)] tracking-tight">
                    {a.racket.brand} {a.racket.model}
                  </p>
                  <p className="text-[11px] text-[var(--muted)]">{a.reason}</p>
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded-md bg-[var(--accent)]/15 px-2.5 py-1.5 text-xs font-medium text-[var(--accent)]"
                  onClick={() => {
                    setTargetSlug(target.slug);
                    saveBudgetFrame(a.racket, a.plan);
                  }}
                >
                  Use + apply ~{a.plan.predicted.addedMassG}g
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function GapChip({
  label,
  gap,
  unit,
}: {
  label: string;
  gap: number | null;
  unit: string;
}) {
  return (
    <div className="rounded-md px-2 py-2" style={{ boxShadow: "inset 0 0 0 1px var(--line)" }}>
      <p className="text-[9px] uppercase tracking-[0.12em] text-[var(--muted)]">{label} gap</p>
      <p className="mt-0.5 font-[family-name:var(--font-display)] text-lg tabular-nums tracking-tight">
        {gap == null ? "—" : `${gap > 0 ? "+" : ""}${gap}${unit ? ` ${unit}` : ""}`}
      </p>
    </div>
  );
}
