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
import { SyncStatusPill } from "@/components/auth/SyncStatusPill";
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
    <div className="mx-auto w-full max-w-5xl px-5 py-8 md:px-8 md:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--line)] pb-6">
        <div>
          <p className="sf-kicker">Your court</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight md:text-4xl">
            {name}
          </h1>
        </div>
        <div className="flex flex-col items-end gap-2">
          <SyncStatusPill />
          <button
            type="button"
            onClick={() => restartOnboarding()}
            className="sf-btn-ghost text-xs tracking-[0.06em]"
          >
            Redo setup
          </button>
        </div>
      </div>

      <div
        className="mt-0 flex gap-0 overflow-x-auto border-b border-[var(--line)]"
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
            className={`relative shrink-0 px-4 py-3.5 text-sm font-medium tracking-[0.03em] transition ${
              tab === id
                ? "text-[var(--foreground)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {label}
            <span
              className={`absolute inset-x-3 bottom-0 h-px ${
                tab === id ? "bg-[var(--accent)]" : "bg-transparent"
              }`}
              aria-hidden
            />
          </button>
        ))}
      </div>

      <div className="mt-8">
        {tab === "today" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              {profile.grips.forehand && (
                <span className="border border-[var(--accent)]/35 bg-[var(--accent-dim)] px-2.5 py-1 text-xs text-[var(--accent)]">
                  FH {fhGripLabel(profile.grips.forehand)}
                </span>
              )}
              {profile.grips.backhand && (
                <span className="border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--muted)]">
                  BH set
                </span>
              )}
              {profile.constraints.filter((c) => c.active).map((c) => (
                <span
                  key={c.id}
                  className="border border-[var(--amber)]/40 px-2.5 py-1 text-xs text-[var(--amber)]"
                >
                  {c.label}
                </span>
              ))}
              <p className="text-xs text-[var(--muted)]">
                Coaching models · logged feel outweighs spec math
              </p>
            </div>
            {preview ? <p className="text-sm text-[var(--muted)]">{preview}</p> : null}

            <div className="sf-panel px-4 py-3.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="sf-label">Bag</p>
                  <p className="mt-0.5 text-sm">{hasAnyGear(setup) ? setupSummary(setup) : "No bag yet"}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={() => setTab("bag")} className="sf-text-link">
                    Tweak bag
                  </button>
                  <Link href="/lab" className="sf-text-link">
                    Lab
                  </Link>
                  <Link href="/gear?tab=lead-tape" className="sf-text-link">
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
                racket={racket}
                string={string}
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
              className="sf-btn sf-btn-primary w-full"
            >
              Log last session
            </button>

            {patterns.length > 0 && (
              <div className="space-y-2">
                {patterns.map((p) => (
                  <p key={p.id} className="sf-panel px-3 py-2.5 text-sm">
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
    <div className="sf-panel px-3 py-3">
      <p className="sf-label">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold">{value}</p>
    </div>
  );
}
