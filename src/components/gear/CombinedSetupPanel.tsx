"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import type { GripProfile, RacketProfile, StringProfile } from "@/types/equipment";
import { synthesizeCombinedSetup } from "@/lib/equipment/setupSynthesis";
import { useGearStore } from "@/store/gearStore";

export function CombinedSetupPanel({
  rackets,
  strings,
  grips,
}: {
  rackets: RacketProfile[];
  strings: StringProfile[];
  grips: GripProfile[];
}) {
  const setup = useGearStore((s) => s.setup);
  const setTab = useGearStore((s) => s.setTab);

  const racket = useMemo(
    () => rackets.find((r) => r.slug === setup.racketSlug) ?? null,
    [rackets, setup.racketSlug],
  );
  const string = useMemo(
    () => strings.find((s) => s.id === setup.stringId) ?? null,
    [strings, setup.stringId],
  );
  const grip = useMemo(
    () => grips.find((g) => g.id === setup.gripId) ?? null,
    [grips, setup.gripId],
  );

  const insight = useMemo(
    () => synthesizeCombinedSetup(setup, racket, string, grip),
    [setup, racket, string, grip],
  );

  const go = (tab: "rackets" | "strings" | "grips" | "lead-tape") => {
    setTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState(null, "", url.toString());
  };

  if (!insight.hasAny) {
    return (
      <div
        className="mb-8 border border-[var(--line)] bg-[var(--panel)]/80 px-5 py-6"
        style={{ animation: "rise 0.5s ease-out both" }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
          Combined setup
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl tracking-tight">
          Build a full bag, then see how it plays together
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
          Individual racket, string, grip, and lead-tape reads are useful — but launch angle,
          playstyle, and tradeoffs only make sense when they are molded into one setup. Save pieces
          below, then return here for the composite.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {(
            [
              ["rackets", "Pick a racket"],
              ["strings", "Pick a string"],
              ["grips", "Pick a grip"],
              ["lead-tape", "Add lead tape"],
            ] as const
          ).map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              onClick={() => go(tab)}
              className="rounded-md px-3 py-1.5 text-xs text-[var(--foreground)] transition hover:bg-white/5"
              style={{ boxShadow: "0 0 0 1px var(--line)" }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="mb-8 border border-[var(--line)] bg-[var(--panel)]/90 px-5 py-6 md:px-6"
      style={{ animation: "rise 0.5s ease-out both" }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            Combined setup
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl tracking-tight md:text-3xl">
            {insight.playstyle}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
            {insight.playstyleDetail || insight.summary}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Completeness {insight.completeness}% — mold all four pieces for the most honest read.
          </p>
        </div>
        <Link
          href="/lab"
          className="shrink-0 rounded-md bg-[var(--accent)] px-4 py-2 text-xs font-medium text-[#0b1a14] transition hover:brightness-110"
        >
          Test form with this gear
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Combined launch"
          value={
            insight.launchAngleDeg != null ? `${insight.launchAngleDeg.toFixed(1)}°` : "—"
          }
          hint={
            insight.baseLaunchDeg != null && insight.launchAngleDeg != null
              ? `Frame base ${insight.baseLaunchDeg.toFixed(1)}° → molded ${insight.launchAngleDeg.toFixed(1)}°`
              : "Save a racket for launch"
          }
        />
        <Stat
          label="Combined swing path"
          value={
            insight.swingPathDeg != null ? `~${insight.swingPathDeg.toFixed(0)}°` : "—"
          }
          hint={
            insight.hasTape || insight.hasString
              ? `String ${insight.deltas.stringPath >= 0 ? "+" : ""}${insight.deltas.stringPath}° · tape ${insight.deltas.tapePath >= 0 ? "+" : ""}${insight.deltas.tapePath}°`
              : "Path from frame + bed + tape"
          }
        />
        <Stat
          label="Launch deltas"
          value={
            insight.hasRacket
              ? `${fmtDelta(insight.deltas.stringLaunch + insight.deltas.gripLaunch + insight.deltas.tapeLaunch)}°`
              : "—"
          }
          hint={`String ${fmtDelta(insight.deltas.stringLaunch)} · grip ${fmtDelta(insight.deltas.gripLaunch)} · tape ${fmtDelta(insight.deltas.tapeLaunch)}`}
        />
        <Stat
          label="Molded scores"
          value={
            insight.scores.power != null
              ? `${insight.scores.power} / ${insight.scores.spin} / ${insight.scores.control}`
              : "—"
          }
          hint="Power / spin / control (weighted across bag)"
        />
      </div>

      {(insight.scores.power != null || insight.scores.comfort != null) && (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              ["Power", insight.scores.power],
              ["Spin", insight.scores.spin],
              ["Control", insight.scores.control],
              ["Comfort", insight.scores.comfort],
            ] as const
          ).map(([label, v]) => (
            <div key={label} className="border-t border-[var(--line)] pt-2">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">{label}</p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-[var(--accent)]"
                  style={{ width: `${Math.max(0, Math.min(100, v ?? 0))}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-[var(--foreground)]/80">{v ?? "—"}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
            Pros of this mold
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[var(--foreground)]/90">
            {insight.pros.map((p) => (
              <li key={p} className="border-l-2 border-[var(--accent)]/50 pl-3">
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--amber)]">
            Tradeoffs / cons
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[var(--foreground)]/85">
            {insight.cons.map((c) => (
              <li key={c} className="border-l-2 border-[var(--amber)]/40 pl-3">
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Chip active={insight.hasRacket} onClick={() => go("rackets")}>
          {insight.hasRacket ? `Frame · ${setup.racketLabel}` : "Add racket"}
        </Chip>
        <Chip active={insight.hasString} onClick={() => go("strings")}>
          {insight.hasString
            ? `String · ${setup.stringLabel}${setup.tensionLbs != null ? ` @ ${setup.tensionLbs}` : ""}`
            : "Add string"}
        </Chip>
        <Chip active={insight.hasGrip} onClick={() => go("grips")}>
          {insight.hasGrip ? `Grip · ${setup.gripLabel}` : "Add grip"}
        </Chip>
        <Chip active={insight.hasTape} onClick={() => go("lead-tape")}>
          {insight.hasTape
            ? `Tape · +${(setup.leadTape?.pieces ?? []).reduce((n, p) => n + p.massG, 0)}g`
            : "Customize tape"}
        </Chip>
      </div>
    </div>
  );
}

function fmtDelta(n: number): string {
  if (Math.abs(n) < 0.05) return "0";
  return `${n > 0 ? "+" : ""}${n.toFixed(1)}`;
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="border border-[var(--line)] bg-black/10 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p>
    </div>
  );
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-2.5 py-1.5 text-xs transition ${
        active
          ? "bg-[var(--accent-dim)] text-[var(--accent)]"
          : "text-[var(--muted)] hover:bg-white/5 hover:text-[var(--foreground)]"
      }`}
      style={active ? undefined : { boxShadow: "0 0 0 1px var(--line)" }}
    >
      {children}
    </button>
  );
}
