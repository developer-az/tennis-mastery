"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import type { EquipmentTab, GripProfile, RacketProfile, StringProfile } from "@/types/equipment";
import { synthesizeCombinedSetup } from "@/lib/equipment/setupSynthesis";
import { LEAD_TAPE_ZONES } from "@/lib/equipment/leadTape";
import { useGearStore } from "@/store/gearStore";
import { EquipmentThumb } from "./EquipmentThumb";
import { LaunchAngleVisual, SwingPathVisual } from "./RacketVisuals";

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

  const go = (tab: EquipmentTab) => {
    setTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState(null, "", `${url.pathname}?${url.searchParams.toString()}`);
  };

  const tapeByZone = useMemo(() => {
    const map: Partial<Record<string, number>> = {};
    for (const p of setup.leadTape?.pieces ?? []) {
      map[p.zone] = (map[p.zone] ?? 0) + p.massG;
    }
    return map;
  }, [setup.leadTape]);

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
          on the other tabs, then return here for the composite.
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
    <div className="mb-8 space-y-6" style={{ animation: "rise 0.5s ease-out both" }}>
      <div className="border border-[var(--line)] bg-[var(--panel)]/90 px-5 py-6 md:px-6">
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

        {/* Product strip */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <PieceCard
            label="Frame"
            filled={insight.hasRacket}
            onClick={() => go("rackets")}
            thumb={
              setup.racketSlug ? (
                <EquipmentThumb
                  src={`/api/equipment/rackets/${setup.racketSlug}/image`}
                  alt={setup.racketLabel ?? "Racket"}
                  size="md"
                />
              ) : null
            }
            title={setup.racketLabel ?? "Add a racket"}
            meta={
              insight.baseLaunchDeg != null
                ? `Stock ${insight.baseLaunchDeg.toFixed(1)}° launch`
                : "Needed for launch base"
            }
          />
          <PieceCard
            label="String"
            filled={insight.hasString}
            onClick={() => go("strings")}
            thumb={
              setup.stringId ? (
                <EquipmentThumb
                  src={`/api/equipment/strings/${setup.stringId}/image`}
                  alt={setup.stringLabel ?? "String"}
                  size="md"
                />
              ) : null
            }
            title={setup.stringLabel ?? "Add a string"}
            meta={
              setup.tensionLbs != null
                ? `${setup.tensionLbs} lbs${setup.gaugeMm != null ? ` · ${setup.gaugeMm} mm` : ""}`
                : "Tension + gauge shift launch"
            }
          />
          <PieceCard
            label="Grip"
            filled={insight.hasGrip}
            onClick={() => go("grips")}
            thumb={
              setup.gripId ? (
                <EquipmentThumb
                  src={`/api/equipment/grips/${setup.gripId}/image`}
                  alt={setup.gripLabel ?? "Grip"}
                  size="md"
                />
              ) : null
            }
            title={setup.gripLabel ?? "Add a grip"}
            meta="Handle feel & sweat"
          />
          <PieceCard
            label="Lead tape"
            filled={insight.hasTape}
            onClick={() => go("lead-tape")}
            thumb={
              <div
                className="flex h-20 w-16 items-center justify-center rounded-md text-lg font-medium text-[var(--accent)]"
                style={{ boxShadow: "inset 0 0 0 1px var(--line)" }}
              >
                {insight.hasTape
                  ? `+${(setup.leadTape?.pieces ?? []).reduce((n, p) => n + p.massG, 0)}g`
                  : "0g"}
              </div>
            }
            title={insight.hasTape ? "Custom balance" : "No tape yet"}
            meta={
              insight.hasTape
                ? Object.entries(tapeByZone)
                    .map(([z, g]) => `${LEAD_TAPE_ZONES[z as keyof typeof LEAD_TAPE_ZONES]?.label?.split(" ")[0] ?? z} ${g}g`)
                    .join(" · ")
                : "Optional SW / launch tweak"
            }
          />
        </div>
      </div>

      {/* Launch + path visuals */}
      <div className="grid gap-6 border border-[var(--line)] bg-[var(--panel)]/90 p-5 md:grid-cols-2 md:p-6">
        {insight.launchAngleDeg != null ? (
          <LaunchAngleVisual degrees={insight.launchAngleDeg} />
        ) : (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Combined launch
            </p>
            <p className="mt-3 text-sm text-[var(--muted)]">Save a racket to unlock the launch diagram.</p>
            <button
              type="button"
              onClick={() => go("rackets")}
              className="mt-3 text-xs font-medium text-[var(--accent)]"
            >
              Choose frame →
            </button>
          </div>
        )}
        {insight.swingPathDeg != null ? (
          <SwingPathVisual degrees={insight.swingPathDeg} />
        ) : (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--amber)]">
              Combined swing path
            </p>
            <p className="mt-3 text-sm text-[var(--muted)]">Needs a frame base to draw the path.</p>
          </div>
        )}
      </div>

      {/* Delta breakdown */}
      <div className="grid gap-4 border border-[var(--line)] bg-[var(--panel)]/90 p-5 sm:grid-cols-2 lg:grid-cols-4 md:p-6">
        <Stat
          label="Combined launch"
          value={
            insight.launchAngleDeg != null ? `${insight.launchAngleDeg.toFixed(1)}°` : "—"
          }
          hint={
            insight.baseLaunchDeg != null && insight.launchAngleDeg != null
              ? `Frame ${insight.baseLaunchDeg.toFixed(1)}° → molded ${insight.launchAngleDeg.toFixed(1)}°`
              : "Save a racket for launch"
          }
        />
        <Stat
          label="Combined swing path"
          value={insight.swingPathDeg != null ? `~${insight.swingPathDeg.toFixed(0)}°` : "—"}
          hint={`String ${fmtDelta(insight.deltas.stringPath)}° · tape ${fmtDelta(insight.deltas.tapePath)}°`}
        />
        <Stat
          label="Launch mold deltas"
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
          hint="Power / spin / control"
        />
      </div>

      {(insight.scores.power != null || insight.scores.comfort != null) && (
        <div className="grid grid-cols-2 gap-3 border border-[var(--line)] bg-[var(--panel)]/90 p-5 sm:grid-cols-4 md:p-6">
          {(
            [
              ["Power", insight.scores.power],
              ["Spin", insight.scores.spin],
              ["Control", insight.scores.control],
              ["Comfort", insight.scores.comfort],
            ] as const
          ).map(([label, v]) => (
            <div key={label}>
              <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">{label}</p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-500"
                  style={{ width: `${Math.max(0, Math.min(100, v ?? 0))}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-[var(--foreground)]/80">{v ?? "—"}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tape zone diagram when present */}
      {insight.hasTape ? (
        <div className="border border-[var(--line)] bg-[var(--panel)]/90 p-5 md:p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
            Lead tape map
          </p>
          <div className="mt-4 flex flex-wrap items-start gap-6">
            <svg viewBox="0 0 120 180" className="h-44 w-28 shrink-0" aria-hidden>
              <ellipse cx="60" cy="48" rx="38" ry="42" fill="none" stroke="rgba(232,239,233,0.35)" strokeWidth="2" />
              <path d="M48 88 L48 150 L72 150 L72 88" fill="none" stroke="rgba(232,239,233,0.35)" strokeWidth="2" />
              {Object.entries(LEAD_TAPE_ZONES).map(([zone, z]) => {
                const g = tapeByZone[zone] ?? 0;
                if (g <= 0) return null;
                return (
                  <circle
                    key={zone}
                    cx={z.x * 120}
                    cy={z.y * 180}
                    r={4 + Math.min(6, g)}
                    fill="#c8f560"
                    opacity={0.85}
                  >
                    <title>{`${z.label}: ${g}g`}</title>
                  </circle>
                );
              })}
            </svg>
            <ul className="min-w-0 flex-1 space-y-2 text-sm">
              {Object.entries(tapeByZone).map(([zone, g]) => (
                <li key={zone} className="flex justify-between gap-3 border-b border-[var(--line)] pb-1.5">
                  <span className="text-[var(--foreground)]/90">
                    {LEAD_TAPE_ZONES[zone as keyof typeof LEAD_TAPE_ZONES]?.label ?? zone}
                  </span>
                  <span className="text-[var(--accent)]">+{g}g</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 border border-[var(--line)] bg-[var(--panel)]/90 p-5 md:grid-cols-2 md:p-6">
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

      <div className="flex flex-wrap gap-2">
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

function PieceCard({
  label,
  title,
  meta,
  filled,
  onClick,
  thumb,
}: {
  label: string;
  title: string;
  meta: string;
  filled: boolean;
  onClick: () => void;
  thumb: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex gap-3 rounded-md border border-[var(--line)] bg-black/15 p-3 text-left transition hover:border-[var(--accent)]/40 hover:bg-white/[0.03]"
    >
      {thumb}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">{label}</p>
        <p className={`mt-0.5 truncate text-sm ${filled ? "text-[var(--foreground)]" : "text-[var(--muted)]"}`}>
          {title}
        </p>
        <p className="mt-0.5 truncate text-xs text-[var(--muted)]">{meta}</p>
      </div>
    </button>
  );
}
