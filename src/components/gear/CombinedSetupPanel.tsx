"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import type { EquipmentTab, GripProfile, RacketProfile, StringProfile } from "@/types/equipment";
import { synthesizeCombinedSetup } from "@/lib/equipment/setupSynthesis";
import { LEAD_TAPE_ZONES } from "@/lib/equipment/leadTape";
import { findSimilarStrings } from "@/lib/equipment/strings";
import { gripSizeLabel } from "@/lib/equipment/gripSize";
import { summarizeGripLayers } from "@/lib/equipment/gripStack";
import { useGearStore } from "@/store/gearStore";
import { usePlayerStore } from "@/store/playerStore";
import { EquipmentThumb } from "./EquipmentThumb";
import { LaunchAngleVisual, SwingPathVisual, StrikeCoachingBullets, strikeZoneForFrame, ForehandGripBevelVisual, FaceAngleAtContactVisual, ContactGeometryVisual } from "./RacketVisuals";

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
  const playerGrip = usePlayerStore((s) => s.profile.grips.forehand);

  const racket = useMemo(
    () => rackets.find((r) => r.slug === setup.racketSlug) ?? null,
    [rackets, setup.racketSlug],
  );
  const string = useMemo(
    () => strings.find((s) => s.id === setup.stringId) ?? null,
    [strings, setup.stringId],
  );
  const grip = useMemo(() => {
    const outerId =
      setup.gripLayers?.[setup.gripLayers.length - 1]?.id ?? setup.gripId;
    return outerId ? grips.find((g) => g.id === outerId) ?? null : null;
  }, [grips, setup.gripId, setup.gripLayers]);

  const gripStackLabel = useMemo(
    () =>
      summarizeGripLayers(setup.gripLayers ?? [], setup.gripSize) ||
      setup.gripLabel,
    [setup.gripLayers, setup.gripSize, setup.gripLabel],
  );

  const insight = useMemo(
    () => synthesizeCombinedSetup(setup, racket, string, grip, grips, { playerGrip }),
    [setup, racket, string, grip, grips, playerGrip],
  );

  const stringAlts = useMemo(
    () => (string ? findSimilarStrings(string, strings, { limit: 4 }) : []),
    [string, strings],
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
          Build a bag, then see how it plays
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
          Fastest path is{" "}
          <Link href="/you" className="text-[var(--accent)] hover:underline">
            You → setup
          </Link>
          . Or pick pieces here to research.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {(
            [
              ["rackets", "Pick a racket"],
              ["strings", "Pick a string"],
              ["grips", "Pick a grip"],
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
              Completeness {insight.completeness}%
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link
              href="/lab"
              className="rounded-md bg-[var(--accent)] px-4 py-2 text-xs font-medium text-[#0b1a14] transition hover:brightness-110"
            >
              Lab
            </Link>
            <button
              type="button"
              onClick={() => go("lead-tape")}
              className="rounded-md px-4 py-2 text-xs transition hover:bg-white/5"
              style={{ boxShadow: "0 0 0 1px var(--line)" }}
            >
              Tune
            </button>
            <Link
              href="/you"
              className="rounded-md px-4 py-2 text-xs text-[var(--muted)]"
            >
              You
            </Link>
          </div>
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
                  alt={gripStackLabel ?? "Grip"}
                  size="md"
                />
              ) : null
            }
            title={gripStackLabel ?? "Add grip / overgrips"}
            meta={
              setup.gripSize
                ? `${gripSizeLabel(setup.gripSize)} · size + stack in math`
                : "Size L0–L5 + up to 3 overgrips"
            }
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Launch"
          value={
            insight.launchAngleDeg != null ? `${insight.launchAngleDeg.toFixed(1)}°` : "—"
          }
          hint={
            insight.baseLaunchDeg != null && insight.launchAngleDeg != null
              ? `Stock ${insight.baseLaunchDeg.toFixed(1)}° → molded`
              : "Needs a frame"
          }
        />
        <Stat
          label="Swing path"
          value={insight.swingPathDeg != null ? `${insight.swingPathDeg.toFixed(0)}°` : "—"}
          hint={`String ${fmtDelta(insight.deltas.stringPath)} · tape ${fmtDelta(insight.deltas.tapePath)}`}
        />
        <Stat
          label="Net clear"
          value={insight.flight ? `+${insight.flight.netClearIn.toFixed(0)}"` : "—"}
          hint={
            insight.flight
              ? `Plow ${insight.flight.plow} · topspin ${insight.flight.topspin}`
              : "Save a racket"
          }
        />
        <Stat
          label="Depth / fly"
          value={
            insight.flight
              ? `${insight.flight.depth} / ${insight.flight.flyRisk}`
              : "—"
          }
          hint="Depth score · fly risk"
        />
      </div>

      <details className="group space-y-6">
        <summary className="cursor-pointer text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
          How this was calculated
        </summary>
        <div className="mt-4 space-y-6">

      {/* Launch + path visuals — from ideal strike on the bed */}
      <div className="border border-[var(--line)] bg-[var(--panel)]/90 p-5 md:p-6">
        <div className="grid gap-6 md:grid-cols-2">
          {insight.launchAngleDeg != null ? (
            <LaunchAngleVisual
              degrees={insight.launchAngleDeg}
              pathDeg={insight.swingPathDeg ?? undefined}
              spin={insight.scores.spin}
              power={insight.scores.power}
              control={insight.scores.control}
              flight={insight.flight}
              zone={
                racket
                  ? strikeZoneForFrame({
                      ...racket,
                      idealLaunchAngleDeg: insight.launchAngleDeg ?? racket.idealLaunchAngleDeg,
                      idealSwingPathDeg: insight.swingPathDeg ?? racket.idealSwingPathDeg,
                    })
                  : strikeZoneForFrame({
                      idealLaunchAngleDeg: insight.launchAngleDeg,
                      idealSwingPathDeg: insight.swingPathDeg,
                      spin: insight.scores.spin,
                      control: insight.scores.control,
                      power: insight.scores.power,
                    })
              }
              label="Flight vs net — this setup"
            />
          ) : (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                Molded strike launch vs net
              </p>
              <p className="mt-3 text-sm text-[var(--muted)]">Save a racket to unlock the strike-launch diagram.</p>
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
            <SwingPathVisual
              degrees={insight.swingPathDeg}
              zone={
                racket
                  ? strikeZoneForFrame({
                      ...racket,
                      idealLaunchAngleDeg: insight.launchAngleDeg ?? racket.idealLaunchAngleDeg,
                      idealSwingPathDeg: insight.swingPathDeg,
                    })
                  : strikeZoneForFrame({
                      idealLaunchAngleDeg: insight.launchAngleDeg,
                      idealSwingPathDeg: insight.swingPathDeg,
                      spin: insight.scores.spin,
                      control: insight.scores.control,
                      power: insight.scores.power,
                    })
              }
              label="Where to strike with this mold"
            />
          ) : (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--amber)]">
                Where to strike
              </p>
              <p className="mt-3 text-sm text-[var(--muted)]">Needs a frame base to draw strike heights.</p>
            </div>
          )}
        </div>
        <StrikeCoachingBullets
          launchDeg={insight.launchAngleDeg}
          pathDeg={insight.swingPathDeg}
          spin={insight.scores.spin}
          control={insight.scores.control}
          power={insight.scores.power}
          headSizeSqIn={racket?.headSizeSqIn}
          zone={
            racket
              ? strikeZoneForFrame({
                  ...racket,
                  idealLaunchAngleDeg: insight.launchAngleDeg ?? racket.idealLaunchAngleDeg,
                  idealSwingPathDeg: insight.swingPathDeg ?? racket.idealSwingPathDeg,
                })
              : undefined
          }
        />
      </div>

      {insight.forehand ? (
        <div className="border border-[var(--line)] bg-[var(--panel)]/90 p-5 md:p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--amber)]">
            Forehand grip & face
          </p>
          <p className="mt-1 max-w-2xl text-xs text-[var(--muted)]">
            Best bevel and how closed the face should be for this path and leave.
          </p>
          <div className="mt-5 grid gap-6 md:grid-cols-2">
            <ForehandGripBevelVisual advice={insight.forehand} />
            <FaceAngleAtContactVisual advice={insight.forehand} />
          </div>
          <div className="mt-6 border-t border-[var(--line)] pt-5">
            <ContactGeometryVisual advice={insight.forehand} />
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                Practice this grip + face
              </p>
              <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-[var(--foreground)]/85">
                {insight.forehand.practice.map((p) => (
                  <li key={p} className="border-l-2 border-[var(--accent)]/40 pl-2.5">
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--amber)]">
                Don’t do this
              </p>
              <p className="mt-2 text-xs leading-relaxed text-[var(--foreground)]/85">
                {insight.forehand.avoid}
              </p>
              <p className="mt-3 text-[11px] leading-relaxed text-[var(--muted)]">
                <span className="text-sky-300/90">Science — </span>
                Grip sets face lean; path loads spin. Opening the face sends the ball up without
                adding drop — that’s how clean hits sail long.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Delta breakdown moved to the compact header */}

      {(insight.scores.power != null || insight.scores.comfort != null) && (
        <div className="border border-[var(--line)] bg-[var(--panel)]/90 p-5 md:p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
            Molded scores
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Frame + string + grip + tape. Deltas vs stock frame.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                ["Power", insight.scores.power, insight.stockScores.power, insight.scoreDeltas.total.power, "#f4a261"],
                ["Spin", insight.scores.spin, insight.stockScores.spin, insight.scoreDeltas.total.spin, "#7dd3fc"],
                ["Control", insight.scores.control, insight.stockScores.control, insight.scoreDeltas.total.control, "#c8f560"],
                ["Comfort", insight.scores.comfort, insight.stockScores.comfort, insight.scoreDeltas.total.comfort, "#e9c46a"],
              ] as const
            ).map(([label, v, stock, delta, color]) => (
              <div key={label}>
                <p className="text-[10px] uppercase tracking-[0.14em]" style={{ color }}>
                  {label}
                </p>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{
                      width: `${Math.max(0, Math.min(100, v ?? 0))}%`,
                      background: color,
                    }}
                  />
                </div>
                <p className="mt-1 font-[family-name:var(--font-display)] text-xl tabular-nums tracking-tight">
                  {v ?? "—"}
                  {stock != null && Math.abs(delta) >= 0.5 ? (
                    <span className="ml-1.5 text-xs text-[var(--muted)]">
                      {stock}
                      <span style={{ color }}>
                        {" "}
                        {delta > 0 ? "+" : ""}
                        {Math.round(delta)}
                      </span>
                    </span>
                  ) : null}
                </p>
              </div>
            ))}
          </div>
          {(insight.hasString || insight.hasGrip || insight.hasTape) && (
            <p className="mt-3 text-[11px] tabular-nums text-[var(--muted)]">
              Shifts — string P/S/C{" "}
              {fmtDelta(insight.scoreDeltas.string.power)}/
              {fmtDelta(insight.scoreDeltas.string.spin)}/
              {fmtDelta(insight.scoreDeltas.string.control)}
              {" · "}grip{" "}
              {fmtDelta(insight.scoreDeltas.grip.power)}/
              {fmtDelta(insight.scoreDeltas.grip.spin)}/
              {fmtDelta(insight.scoreDeltas.grip.control)}
              {" · "}tape{" "}
              {fmtDelta(insight.scoreDeltas.tape.power)}/
              {fmtDelta(insight.scoreDeltas.tape.spin)}/
              {fmtDelta(insight.scoreDeltas.tape.control)}
            </p>
          )}
        </div>
      )}

      {insight.tuneTips.length > 0 ? (
        <div className="border border-[var(--line)] bg-[var(--panel)]/90 p-5 md:p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
            Perfect the mold
          </p>
          <p className="mt-1 max-w-2xl text-xs text-[var(--muted)]">
            String dials and lead-tape placements. Raising one score usually costs another.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {insight.tuneTips.map((tip) => {
              const accent =
                tip.score === "spin"
                  ? "#7dd3fc"
                  : tip.score === "power"
                    ? "#f4a261"
                    : tip.score === "comfort"
                      ? "#e9c46a"
                      : "#c8f560";
              const verdictLabel =
                tip.verdict === "low"
                  ? "Room to raise"
                  : tip.verdict === "high"
                    ? "May be hot — can dial back"
                    : "In a healthy band";
              return (
                <article
                  key={tip.score}
                  className="rounded-md p-3"
                  style={{ boxShadow: "inset 0 0 0 1px var(--line)" }}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <h3
                      className="font-[family-name:var(--font-display)] text-lg capitalize tracking-tight"
                      style={{ color: accent }}
                    >
                      {tip.score}
                      {tip.current != null ? (
                        <span className="ml-2 text-sm tabular-nums text-[var(--foreground)]/80">
                          {tip.current}
                        </span>
                      ) : null}
                    </h3>
                    <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                      {verdictLabel}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                        String / grip — raise
                      </p>
                      <ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-[var(--foreground)]/85">
                        {tip.raise.slice(0, 3).map((r) => (
                          <li key={r}>· {r}</li>
                        ))}
                      </ul>
                      {tip.tapeRaise?.length ? (
                        <>
                          <p className="mt-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-300">
                            Lead tape — raise
                          </p>
                          <ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-[var(--foreground)]/85">
                            {tip.tapeRaise.slice(0, 2).map((r) => (
                              <li key={r}>· {r}</li>
                            ))}
                          </ul>
                        </>
                      ) : null}
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--amber)]">
                        String / grip — lower
                      </p>
                      <ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-[var(--foreground)]/85">
                        {tip.lower.slice(0, 3).map((r) => (
                          <li key={r}>· {r}</li>
                        ))}
                      </ul>
                      {tip.tapeLower?.length ? (
                        <>
                          <p className="mt-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-300/80">
                            Lead tape — lower
                          </p>
                          <ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-[var(--foreground)]/85">
                            {tip.tapeLower.slice(0, 2).map((r) => (
                              <li key={r}>· {r}</li>
                            ))}
                          </ul>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-3 border-t border-[var(--line)] pt-2 text-xs leading-relaxed text-[var(--muted)]">
                    <span className="text-[var(--amber)]">Tradeoff — </span>
                    {tip.tradeoff}
                  </p>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--foreground)]/70">
                    <span className="text-sky-300/90">Science — </span>
                    {tip.science}
                  </p>
                  <button
                    type="button"
                    onClick={() => go("lead-tape")}
                    className="mt-2 text-[11px] font-medium text-sky-300"
                  >
                    Open lead tape lab →
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      ) : null}

      {insight.weakPoints.length > 0 ? (
        <div className="border border-[var(--line)] bg-[var(--panel)]/90 p-5 md:p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--amber)]">
            Frame weak points
          </p>
          <p className="mt-1 max-w-2xl text-xs text-[var(--muted)]">
            What holds this mold back — and what to practice.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {insight.weakPoints.map((wp) => (
              <article
                key={wp.title}
                className="rounded-md p-3"
                style={{ boxShadow: "inset 0 0 0 1px var(--line)" }}
              >
                <h3 className="font-[family-name:var(--font-display)] text-lg tracking-tight text-[var(--amber)]">
                  {wp.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--foreground)]/90">
                  <span className="text-[var(--amber)]">Holding you back — </span>
                  {wp.holdingBack}
                </p>
                <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                  Practice this
                </p>
                <ul className="mt-1.5 space-y-1.5 text-xs leading-relaxed text-[var(--foreground)]/85">
                  {wp.practice.map((p) => (
                    <li key={p} className="border-l-2 border-[var(--accent)]/40 pl-2.5">
                      {p}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          {insight.gripBuildNote ? (
            <p className="mt-4 border-t border-[var(--line)] pt-3 text-xs leading-relaxed text-[var(--muted)]">
              <span className="text-[var(--amber)]">Handle build — </span>
              {insight.gripBuildNote}
            </p>
          ) : null}
        </div>
      ) : null}

      {insight.scienceNotes.length > 0 ? (
        <div className="border border-[var(--line)] bg-[var(--panel)]/90 p-5 md:p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-300">
            What your numbers mean
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Where this setup sits — not a generic either/or.
          </p>
          <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-[var(--foreground)]/85">
            {insight.scienceNotes.map((n) => (
              <li key={n} className="border-l-2 border-sky-400/40 pl-3">
                {n}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

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

      {stringAlts.length > 0 ? (
        <div className="border border-[var(--line)] bg-[var(--panel)]/90 p-5 md:p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-300">
            Similar string feel — shop around
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Close substitutes if your exact bed is pricey or out of stock. Search the shop query
            online at a local stringer or retailer.
          </p>
          <ul className="mt-3 space-y-2">
            {stringAlts.map((a) => (
              <li
                key={a.string.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-2 text-sm last:border-0"
              >
                <div className="min-w-0">
                  <p className="font-[family-name:var(--font-display)] tracking-tight">
                    {a.string.brand} {a.string.name}
                    <span className="ml-2 text-[11px] tabular-nums text-sky-300/90">
                      {a.score}% match
                    </span>
                  </p>
                  <p className="text-[11px] text-[var(--muted)]">{a.why}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(a.shopQuery);
                    go("strings");
                  }}
                  className="shrink-0 rounded-md px-2.5 py-1.5 text-[11px] text-sky-300"
                  style={{ boxShadow: "0 0 0 1px rgba(125,211,252,0.35)" }}
                  title="Copy shop search and open Strings"
                >
                  Copy “{a.shopQuery}”
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => go("strings")}
            className="mt-3 text-xs font-medium text-[var(--accent)]"
          >
            Browse strings →
          </button>
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

        </div>
      </details>

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
          {insight.hasGrip
            ? `Grip · ${gripStackLabel ?? setup.gripLabel}`
            : "Add grip / overgrips"}
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
