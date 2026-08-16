"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { GripProfile, RacketProfile, StringProfile } from "@/types/equipment";
import { usePlayerStore } from "@/store/playerStore";
import { hasAnyGear, setupSummary, useGearStore } from "@/store/gearStore";
import { derivePatterns, recentBodyTrend } from "@/lib/player/patterns";
import { synthesizeCombinedSetup } from "@/lib/equipment/setupSynthesis";
import { prefersArmFriendlySetup } from "@/lib/player/constraints";
import { fhGripLabel, gripPreviewLine } from "@/lib/player/onboarding";
import { SetupWizard } from "@/components/onboarding/SetupWizard";
import { InBandImproveSection } from "@/components/gear/InBandImproveSection";
import { strikeZoneForFrame } from "@/components/gear/RacketVisuals";
import { SetupVisualStory } from "./SetupVisualStory";
import { BagTab } from "./BagTab";
import { AfterPlayTab } from "./AfterPlayTab";
import { HistoryTab } from "./HistoryTab";

type HubTab = "today" | "bag" | "play" | "history";

export function YouHub({
  rackets,
  strings,
  grips,
}: {
  rackets: RacketProfile[];
  strings: StringProfile[];
  grips: GripProfile[];
}) {
  const profile = usePlayerStore((s) => s.profile);
  const hydrated = usePlayerStore((s) => s.hydrated);
  const setHydrated = usePlayerStore((s) => s.setHydrated);
  const onboardingComplete = usePlayerStore((s) => s.onboardingComplete);
  const restartOnboarding = usePlayerStore((s) => s.restartOnboarding);
  const setup = useGearStore((s) => s.setup);

  const [tab, setTab] = useState<HubTab>("today");

  useEffect(() => {
    if (usePlayerStore.persist.hasHydrated()) setHydrated(true);
  }, [setHydrated]);

  const showWizard = hydrated && !onboardingComplete;

  const racket = useMemo(
    () => rackets.find((r) => r.slug === setup.racketSlug) ?? null,
    [rackets, setup.racketSlug],
  );
  const string = useMemo(
    () => strings.find((s) => s.id === setup.stringId) ?? null,
    [strings, setup.stringId],
  );
  const grip = useMemo(() => {
    const outerId = setup.gripLayers?.[setup.gripLayers.length - 1]?.id ?? setup.gripId;
    return outerId ? grips.find((g) => g.id === outerId) ?? null : null;
  }, [grips, setup.gripId, setup.gripLayers]);
  const armFriendly = prefersArmFriendlySetup(profile);

  const insight = useMemo(
    () =>
      synthesizeCombinedSetup(setup, racket, string, grip, grips, {
        playerGrip: profile.grips.forehand,
        armFriendly,
      }),
    [setup, racket, string, grip, grips, profile.grips.forehand, armFriendly],
  );
  const strikeZone = useMemo(
    () =>
      strikeZoneForFrame({
        ...(racket ?? {}),
        idealLaunchAngleDeg: insight.launchAngleDeg,
        idealSwingPathDeg: insight.swingPathDeg,
        spin: insight.scores.spin,
        control: insight.scores.control,
        power: insight.scores.power,
      }),
    [racket, insight.launchAngleDeg, insight.swingPathDeg, insight.scores],
  );
  const patterns = useMemo(() => derivePatterns(profile).slice(0, 3), [profile]);
  const pending = profile.decisions.filter((d) => d.result === "pending");

  if (!hydrated) {
    return (
      <div className="px-6 py-16 text-sm text-[var(--muted)] md:px-10">Loading your court…</div>
    );
  }

  if (showWizard) {
    return <SetupWizard rackets={rackets} strings={strings} grips={grips} />;
  }

  const name = profile.displayName.trim() || "You";
  const preview = gripPreviewLine(profile.grips.forehand);

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8 md:px-8 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            Your court
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl tracking-tight">
            {name}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => restartOnboarding()}
          className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          Redo setup
        </button>
      </div>

      <div
        className="mt-6 flex gap-1 overflow-x-auto pb-1"
        role="tablist"
        aria-label="You"
      >
        {(
          [
            ["today", "Today"],
            ["bag", "Bag"],
            ["play", "After play"],
            ["history", "History"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`shrink-0 rounded-md px-3.5 py-2 text-sm ${
              tab === id
                ? "bg-[var(--accent)] font-medium text-[#0b1a14]"
                : "text-[var(--muted)] hover:bg-white/5"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {tab === "today" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              {profile.grips.forehand && (
                <span className="rounded-md bg-[var(--accent-dim)] px-2.5 py-1 text-xs text-[var(--accent)]">
                  FH {fhGripLabel(profile.grips.forehand)}
                </span>
              )}
              {profile.grips.backhand && (
                <span className="rounded-md px-2.5 py-1 text-xs" style={{ boxShadow: "0 0 0 1px var(--line)" }}>
                  BH set
                </span>
              )}
              {profile.constraints.filter((c) => c.active).map((c) => (
                <span
                  key={c.id}
                  className="rounded-md px-2.5 py-1 text-xs text-amber-100"
                  style={{ boxShadow: "0 0 0 1px rgba(244,162,97,0.35)" }}
                >
                  {c.label}
                </span>
              ))}
              <p className="text-xs text-[var(--muted)]">
                Coaching models · logged feel outweighs spec math
              </p>
            </div>
            {preview ? <p className="text-sm text-[var(--muted)]">{preview}</p> : null}

            <div className="border border-[var(--line)] bg-[var(--panel)]/70 px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Bag</p>
                  <p className="mt-0.5 text-sm">{hasAnyGear(setup) ? setupSummary(setup) : "No bag yet"}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={() => setTab("bag")} className="text-xs text-[var(--accent)]">
                    Tweak bag
                  </button>
                  <Link href="/lab" className="text-xs text-[var(--accent)]">
                    Lab
                  </Link>
                  <Link href="/gear?tab=lead-tape" className="text-xs text-[var(--accent)]">
                    Tape
                  </Link>
                </div>
              </div>
            </div>

            {insight.hasAny ? (
              <SetupVisualStory
                scores={insight.scores}
                stock={insight.stockScores}
                role={insight.playstyle}
                flight={insight.flight}
                launchDeg={insight.launchAngleDeg}
                pathDeg={insight.swingPathDeg}
                zone={strikeZone}
                forehand={insight.forehand}
                pieces={setup.leadTape?.pieces ?? []}
                hasRacket={insight.hasRacket}
              />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Launch" value="—" />
                <Stat label="Path" value="—" />
                <Stat label="Net clear" value="—" />
                <Stat label="Depth / fly" value="—" />
              </div>
            )}

            {insight.hasAny ? <InBandImproveSection plan={insight.inBand} compact /> : null}

            {pending.length > 0 && (
              <button
                type="button"
                onClick={() => setTab("history")}
                className="w-full rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-left text-sm"
              >
                Resolve pending decision: {pending[0].changeSummary}
              </button>
            )}

            <button
              type="button"
              onClick={() => setTab("play")}
              className="w-full rounded-md bg-[var(--accent)] py-3 text-sm font-medium text-[#0b1a14]"
            >
              Log last session
            </button>

            {patterns.length > 0 && (
              <div className="space-y-2">
                {patterns.map((p) => (
                  <p key={p.id} className="border border-[var(--line)] px-3 py-2 text-sm">
                    <span className="font-medium">{p.title}.</span>{" "}
                    <span className="text-[var(--muted)]">{p.detail}</span>
                  </p>
                ))}
              </div>
            )}
            <p className="text-xs text-[var(--muted)]">{recentBodyTrend(profile.sessions)}</p>
          </div>
        )}

        {tab === "bag" && (
          <BagTab rackets={rackets} strings={strings} grips={grips} />
        )}
        {tab === "play" && <AfterPlayTab />}
        {tab === "history" && <HistoryTab />}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[var(--line)] bg-[var(--panel)]/50 px-3 py-3">
      <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-xl">{value}</p>
    </div>
  );
}
