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
import { prefersArmFriendlySetup } from "@/lib/player/constraints";
import { EquipmentThumb } from "./EquipmentThumb";
import { InBandImproveSection } from "./InBandImproveSection";
import { CourtReadyVerdict } from "./CourtReadyVerdict";
import { LaunchAngleVisual, SwingPathVisual, StrikeCoachingBullets, strikeZoneForFrame, ForehandGripBevelVisual, FaceAngleAtContactVisual, ContactGeometryVisual } from "./RacketVisuals";
import { LeadTapeRacketDiagram } from "./LeadTapeRacketDiagram";
import { gripImageUrl, racketImageUrl, stringImageUrl } from "@/lib/equipment/media/urls";

export function CombinedSetupPanel({
  rackets,
  strings,
  grips,
  onSelectTab,
}: {
  rackets: RacketProfile[];
  strings: StringProfile[];
  grips: GripProfile[];
  onSelectTab?: (tab: EquipmentTab) => void;
}) {
  const setup = useGearStore((s) => s.setup);
  const setTab = useGearStore((s) => s.setTab);
  const playerGrip = usePlayerStore((s) => s.profile.grips.forehand);
  const armFriendly = usePlayerStore((s) => prefersArmFriendlySetup(s.profile));
  const generatesOwnPower = usePlayerStore((s) => s.profile.preferences.generatesOwnPower);
  const valuesDurability = usePlayerStore((s) => s.profile.preferences.valuesDurability);

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
    () =>
      synthesizeCombinedSetup(setup, racket, string, grip, grips, {
        playerGrip,
        armFriendly,
        generatesOwnPower,
        valuesDurability,
      }),
    [setup, racket, string, grip, grips, playerGrip, armFriendly, generatesOwnPower, valuesDurability],
  );

  const stringAlts = useMemo(
    () => (string ? findSimilarStrings(string, strings, { limit: 4 }) : []),
    [string, strings],
  );

  const go = (tab: EquipmentTab) => {
    if (onSelectTab) onSelectTab(tab);
    else setTab(tab);
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
          Calculate if this bag is court-ready
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
          Frame mass, SW, RA, and pattern plus string, tension, gauge, grip, tape, and your
          arm/grip — not the model name. Fastest path is{" "}
          <Link href="/you" className="text-[var(--accent)] hover:underline">
            You → bag
          </Link>
          .
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
              className="rounded-md px-3 py-1.5 text-xs text-[var(--foreground)] transition hover:bg-[var(--overlay-hover)]"
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
              Completeness {insight.completeness}% · court-ready {insight.playability.score}/100
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link
              href="/lab"
              className="rounded-md bg-[var(--accent)] px-4 py-2 text-xs font-medium text-[var(--accent-ink)] transition hover:brightness-110"
            >
              Lab
            </Link>
            <button
              type="button"
              onClick={() => go("lead-tape")}
              className="rounded-md px-4 py-2 text-xs transition hover:bg-[var(--overlay-hover)]"
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
                  src={racketImageUrl({ slug: setup.racketSlug })}
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
                  src={stringImageUrl({ id: setup.stringId })}
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
                  src={gripImageUrl({ id: setup.gripId })}
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

      <CourtReadyVerdict playability={insight.playability} />

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
                ["Power", insight.scores.power, insight.stockScores.power, insight.scoreDeltas.total.power, "var(--chart-power)"],
                ["Spin", insight.scores.spin, insight.stockScores.spin, insight.scoreDeltas.total.spin, "var(--chart-spin)"],
                ["Control", insight.scores.control, insight.stockScores.control, insight.scoreDeltas.total.control, "var(--chart-control)"],
                ["Comfort", insight.scores.comfort, insight.stockScores.comfort, insight.scoreDeltas.total.comfort, "var(--chart-comfort)"],
              ] as const
            ).map(([label, v, stock, delta, color]) => (
              <div key={label}>
                <p className="text-[10px] uppercase tracking-[0.14em]" style={{ color }}>
                  {label}
                </p>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--foreground)_12%,transparent)]">
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

      <InBandImproveSection plan={insight.inBand} />

      <details className="group space-y-6">
        <summary className="cursor-pointer list-none text-sm text-[var(--muted)] hover:text-[var(--foreground)] [&::-webkit-details-marker]:hidden">
          <span className="underline-offset-2 group-open:text-[var(--foreground)]">Deep coaching &amp; flight visuals</span>
          <span className="ml-2 text-[10px] uppercase tracking-[0.12em] opacity-70">expand</span>
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
              faceClosedDeg={insight.forehand?.face.closedDeg ?? 8}
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
              faceClosedDeg={insight.forehand?.face.closedDeg ?? 8}
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
                <span className="text-[var(--sky)]">Science — </span>
                Grip sets face lean; path loads spin. Opening the face sends the ball up without
                adding drop — that’s how clean hits sail long.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Delta breakdown moved to the compact header */}

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
                  ? "var(--chart-spin)"
                  : tip.score === "power"
                    ? "var(--chart-power)"
                    : tip.score === "comfort"
                      ? "var(--chart-comfort)"
                      : "var(--chart-control)";
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
                          <p className="mt-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--sky)]">
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
                          <p className="mt-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--sky)]">
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
                    <span className="text-[var(--sky)]">Science — </span>
                    {tip.science}
                  </p>
                  <button
                    type="button"
                    onClick={() => go("lead-tape")}
                    className="mt-2 text-[11px] font-medium text-[var(--sky)]"
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
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--sky)]">
            What your numbers mean
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Where this setup sits — not a generic either/or.
          </p>
          <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-[var(--foreground)]/85">
            {insight.scienceNotes.map((n) => (
              <li key={n} className="border-l-2 border-[var(--sky)]/40 pl-3">
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
          <div className="mt-4 grid items-start gap-6 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <LeadTapeRacketDiagram pieces={setup.leadTape?.pieces ?? []} interactive={false} />
            <ul className="min-w-0 space-y-2 text-sm">
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
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--sky)]">
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
                    <span className="ml-2 text-[11px] tabular-nums text-[var(--sky)]">
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
                  className="shrink-0 rounded-md px-2.5 py-1.5 text-[11px] text-[var(--sky)]"
                  style={{ boxShadow: "0 0 0 1px color-mix(in srgb, var(--sky) 40%, transparent)" }}
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
          : "text-[var(--muted)] hover:bg-[var(--overlay-hover)] hover:text-[var(--foreground)]"
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
      className="flex gap-3 rounded-md border border-[var(--line)] bg-[var(--bg-scene)] p-3 text-left transition hover:border-[var(--accent)]/40 hover:bg-[var(--overlay-hover)]"
    >
      {thumb}
      <div className="min-w-0 flex-1">
        <p className="sf-label">{label}</p>
        <p className={`mt-0.5 truncate text-sm ${filled ? "text-[var(--foreground)]" : "text-[var(--muted)]"}`}>
          {title}
        </p>
        <p className="mt-0.5 truncate text-xs text-[var(--muted)]">{meta}</p>
      </div>
    </button>
  );
}
