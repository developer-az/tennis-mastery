"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { GripProfile, RacketProfile, StringProfile } from "@/types/equipment";
import { usePlayerStore } from "@/store/playerStore";
import { hasAnyGear, setupSummary, useGearStore } from "@/store/gearStore";
import { derivePatterns, recentBodyTrend } from "@/lib/player/patterns";
import { synthesizeCombinedSetup, previewSetupWithString } from "@/lib/equipment/setupSynthesis";
import { prefersArmFriendlySetup } from "@/lib/player/constraints";
import { fhGripLabel, gripPreviewLine } from "@/lib/player/onboarding";
import { PlayerCardSheet } from "@/components/you/PlayerCardSheet";
import { InBandImproveSection } from "@/components/gear/InBandImproveSection";
import { SyncStatusPill } from "@/components/auth/SyncStatusPill";
import { strikeZoneForFrame } from "@/components/gear/RacketVisuals";
import { SetupVisualStory } from "./SetupVisualStory";
import { YouStringCompare } from "./YouStringCompare";
import { BagTab } from "./BagTab";
import { AfterPlayTab } from "./AfterPlayTab";
import { HistoryTab } from "./HistoryTab";
import { WorkOnThis } from "./WorkOnThis";
import { CourtEmpty, CourtLoading } from "@/components/ui/CourtState";

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
  const setup = useGearStore((s) => s.setup);

  const [tab, setTab] = useState<HubTab>("today");
  const [playerCardOpen, setPlayerCardOpen] = useState(false);
  const bagKey = `${setup.stringId ?? ""}|${setup.racketSlug ?? ""}|${setup.tensionLbs ?? ""}|${setup.gaugeMm ?? ""}|${JSON.stringify(setup.leadTape ?? null)}`;
  const [preview, setPreview] = useState<{ bagKey: string; id: string | null }>({
    bagKey,
    id: null,
  });
  const previewStringId = preview.bagKey === bagKey ? preview.id : null;
  const setPreviewStringId = (id: string | null) => setPreview({ bagKey, id });

  useEffect(() => {
    if (usePlayerStore.persist.hasHydrated()) setHydrated(true);
  }, [setHydrated]);

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

  const previewString = useMemo(
    () => (previewStringId ? strings.find((s) => s.id === previewStringId) ?? null : null),
    [previewStringId, strings],
  );
  const activeString = previewString ?? string;
  const stringPreviewing = Boolean(
    previewString && (!string || previewString.id !== string.id),
  );
  const activeSetup = useMemo(
    () => (previewString ? previewSetupWithString(setup, previewString) : setup),
    [previewString, setup],
  );

  const insight = useMemo(
    () =>
      synthesizeCombinedSetup(setup, racket, string, grip, grips, {
        playerGrip: profile.grips.forehand,
        armFriendly,
      }),
    [setup, racket, string, grip, grips, profile.grips.forehand, armFriendly],
  );

  const displayInsight = useMemo(
    () =>
      stringPreviewing
        ? synthesizeCombinedSetup(activeSetup, racket, activeString, grip, grips, {
            playerGrip: profile.grips.forehand,
            armFriendly,
          })
        : insight,
    [
      stringPreviewing,
      activeSetup,
      racket,
      activeString,
      grip,
      grips,
      profile.grips.forehand,
      armFriendly,
      insight,
    ],
  );

  const strikeZone = useMemo(
    () =>
      strikeZoneForFrame({
        ...(racket ?? {}),
        idealLaunchAngleDeg: displayInsight.launchAngleDeg,
        idealSwingPathDeg: displayInsight.swingPathDeg,
        spin: displayInsight.scores.spin,
        control: displayInsight.scores.control,
        power: displayInsight.scores.power,
      }),
    [racket, displayInsight.launchAngleDeg, displayInsight.swingPathDeg, displayInsight.scores],
  );
  const patterns = useMemo(() => derivePatterns(profile).slice(0, 3), [profile]);
  const pending = profile.decisions.filter((d) => d.result === "pending");
  const needsGrip = !profile.grips.forehand;
  const needsBag = !hasAnyGear(setup);
  const playerCardLabel = needsGrip || needsBag || !profile.displayName.trim()
    ? "Add your game"
    : "Edit player card";

  if (!hydrated) {
    return <CourtLoading label="Loading your court…" />;
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
            onClick={() => setPlayerCardOpen(true)}
            className="sf-btn-ghost text-xs tracking-[0.06em]"
          >
            {playerCardLabel}
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
            ["play", "Play"],
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
            {needsGrip ? (
              <button
                type="button"
                onClick={() => setPlayerCardOpen(true)}
                className="sf-alert sf-alert-accent w-full text-left"
              >
                Add a grip so Lab can show your face angle. Optional — skip if you just want to browse.
              </button>
            ) : null}
            {needsBag ? (
              <div className="sf-alert flex flex-wrap items-center justify-between gap-3">
                <p>Pick a racket when you want — like walking a store aisle.</p>
                <Link href="/gear?tab=rackets" className="sf-text-link shrink-0">
                  Browse rackets
                </Link>
              </div>
            ) : null}

            <WorkOnThis insight={displayInsight} />

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

            {insight.hasAny || racket ? (
              <>
                {(insight.hasRacket || racket) && (
                  <YouStringCompare
                    setup={setup}
                    string={string}
                    strings={strings}
                    baseline={insight}
                    preview={displayInsight}
                    previewStringId={previewStringId}
                    onSelectPreviewId={setPreviewStringId}
                  />
                )}
                <SetupVisualStory
                  scores={displayInsight.scores}
                  stock={displayInsight.stockScores}
                  role={displayInsight.playstyle}
                  flight={displayInsight.flight}
                  launchDeg={displayInsight.launchAngleDeg}
                  pathDeg={displayInsight.swingPathDeg}
                  zone={strikeZone}
                  forehand={displayInsight.forehand}
                  pieces={setup.leadTape?.pieces ?? []}
                  hasRacket={displayInsight.hasRacket}
                  racket={racket}
                  string={activeString}
                  moldDeltas={displayInsight.deltas}
                  scoreDeltas={displayInsight.scoreDeltas}
                  hasTape={displayInsight.hasTape}
                  previewing={stringPreviewing}
                />
              </>
            ) : (
              <CourtEmpty
                kicker="No mold yet"
                title="Browse a racket when you’re ready"
                body="Save a frame (and optionally a bed) so Strokeform can show leave angle and flight for your court. Setup is optional."
                primary={{ href: "/gear?tab=rackets", label: "Browse rackets" }}
                secondary={{ href: "/lab", label: "Open form lab" }}
              />
            )}

            {displayInsight.hasAny ? (
              <InBandImproveSection plan={displayInsight.inBand} compact />
            ) : null}

            {pending.length > 0 && (
              <button
                type="button"
                onClick={() => setTab("history")}
                className="sf-alert w-full text-left"
              >
                Resolve pending decision: {pending[0].changeSummary}
              </button>
            )}

            <button
              type="button"
              onClick={() => setTab("play")}
              className="sf-btn sf-btn-primary w-full"
            >
              Log last hit
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

      {playerCardOpen ? (
        <PlayerCardSheet
          rackets={rackets}
          strings={strings}
          grips={grips}
          onClose={() => setPlayerCardOpen(false)}
        />
      ) : null}
    </div>
  );
}

