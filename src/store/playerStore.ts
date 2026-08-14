"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  type BodyArea,
  type BodyConstraint,
  type DecisionEntry,
  type DecisionResult,
  type LeverKind,
  type MatchedPair,
  type PendingLeverChange,
  type PlayerGrips,
  type PlayerPreferences,
  type PlayerProfile,
  type SessionEntry,
  type SessionFeel,
  type StringBedHours,
  emptyProfile,
  exampleCoachingProfile,
} from "@/types/playerProfile";
import { rankedLeversFor, type ProblemId } from "@/lib/player/levers";
import { profileLooksStarted } from "@/lib/player/onboarding";

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function touch(profile: PlayerProfile): PlayerProfile {
  return { ...profile, updatedAt: new Date().toISOString() };
}

interface PlayerState {
  profile: PlayerProfile;
  hydrated: boolean;
  onboardingComplete: boolean;
  onboardingStep: number;
  setHydrated: (v: boolean) => void;
  setOnboardingStep: (step: number) => void;
  completeOnboarding: () => void;
  restartOnboarding: () => void;
  adoptExampleProfile: () => void;
  resetProfile: () => void;
  setDisplayName: (name: string) => void;
  setGrips: (patch: Partial<PlayerGrips>) => void;
  setPreferences: (patch: Partial<PlayerPreferences>) => void;
  setBodyFeedbackNotes: (notes: string) => void;
  upsertConstraint: (c: BodyConstraint) => void;
  removeConstraint: (id: string) => void;
  toggleConstraint: (id: string) => void;
  /** Start one-lever workflow for a problem */
  startLeverWorkflow: (problem: ProblemId) => void;
  chooseLever: (lever: LeverKind) => void;
  clearPendingLever: () => void;
  /**
   * Log a setup change. Requires reason + prediction.
   * If a pending lever is locked to a different lever, returns false.
   */
  logDecision: (input: {
    setupSummary: string;
    lever: LeverKind;
    changeSummary: string;
    reason: string;
    prediction: string;
  }) => { ok: true; id: string } | { ok: false; error: string };
  resolveDecision: (
    id: string,
    result: Exclude<DecisionResult, "pending">,
    resultNote: string,
    bodyRead: string,
  ) => void;
  logSession: (input: {
    setupSummary: string;
    racketSlug: string | null;
    stringId: string | null;
    tensionLbs: number | null;
    hoursOnBed: number;
    feltGood: string;
    brokeDown: string;
    bodyCheck: SessionEntry["bodyCheck"];
    overallFeel: SessionFeel;
    notes: string;
    /** If string bed should accrue hours */
    stringLabel?: string | null;
  }) => string;
  resetStringBed: (stringId: string, stringLabel: string, tensionLbs: number | null) => void;
  upsertMatchedPair: (pair: Omit<MatchedPair, "id"> & { id?: string }) => void;
  removeMatchedPair: (id: string) => void;
  /** True when another lever change is blocked until result is logged */
  isLeverLocked: (attempting?: LeverKind) => boolean;
  pendingLockMessage: () => string | null;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      profile: emptyProfile(),
      hydrated: false,
      onboardingComplete: false,
      onboardingStep: 0,
      setHydrated: (v) => set({ hydrated: v }),
      setOnboardingStep: (step) => set({ onboardingStep: Math.max(0, step) }),
      completeOnboarding: () => set({ onboardingComplete: true, onboardingStep: 0 }),
      restartOnboarding: () => set({ onboardingComplete: false, onboardingStep: 0 }),
      adoptExampleProfile: () =>
        set({
          profile: exampleCoachingProfile(),
          onboardingComplete: true,
          onboardingStep: 0,
        }),
      resetProfile: () =>
        set({
          profile: emptyProfile(),
          onboardingComplete: false,
          onboardingStep: 0,
        }),
      setDisplayName: (name) =>
        set((s) => ({ profile: touch({ ...s.profile, displayName: name }) })),
      setGrips: (patch) =>
        set((s) => ({
          profile: touch({ ...s.profile, grips: { ...s.profile.grips, ...patch } }),
        })),
      setPreferences: (patch) =>
        set((s) => ({
          profile: touch({
            ...s.profile,
            preferences: { ...s.profile.preferences, ...patch },
          }),
        })),
      setBodyFeedbackNotes: (notes) =>
        set((s) => ({ profile: touch({ ...s.profile, bodyFeedbackNotes: notes }) })),
      upsertConstraint: (c) =>
        set((s) => {
          const rest = s.profile.constraints.filter((x) => x.id !== c.id);
          return { profile: touch({ ...s.profile, constraints: [...rest, c] }) };
        }),
      removeConstraint: (id) =>
        set((s) => ({
          profile: touch({
            ...s.profile,
            constraints: s.profile.constraints.filter((c) => c.id !== id),
          }),
        })),
      toggleConstraint: (id) =>
        set((s) => ({
          profile: touch({
            ...s.profile,
            constraints: s.profile.constraints.map((c) =>
              c.id === id ? { ...c, active: !c.active } : c,
            ),
          }),
        })),
      startLeverWorkflow: (problem) => {
        const ranked = rankedLeversFor(problem);
        set((s) => {
          const openDecision = s.profile.decisions.find((d) => d.result === "pending");
          const lockedLever = s.profile.pendingLever?.chosenLever ?? openDecision?.lever ?? null;
          const pending: PendingLeverChange = {
            problem,
            offeredLevers: ranked.map((r) => ({
              lever: r.lever,
              action: r.action,
              why: r.why,
            })),
            chosenLever: lockedLever,
            lockedUntilLogged:
              (s.profile.pendingLever?.lockedUntilLogged && Boolean(s.profile.pendingLever?.chosenLever)) ||
              Boolean(openDecision),
          };
          return { profile: touch({ ...s.profile, pendingLever: pending }) };
        });
      },
      chooseLever: (lever) =>
        set((s) => {
          if (!s.profile.pendingLever) return s;
          return {
            profile: touch({
              ...s.profile,
              pendingLever: {
                ...s.profile.pendingLever,
                chosenLever: lever,
                lockedUntilLogged: true,
              },
            }),
          };
        }),
      clearPendingLever: () =>
        set((s) => {
          const openDecision = s.profile.decisions.find((d) => d.result === "pending");
          if (!openDecision) {
            return { profile: touch({ ...s.profile, pendingLever: null }) };
          }
          return {
            profile: touch({
              ...s.profile,
              pendingLever: {
                problem: s.profile.pendingLever?.problem ?? "manual",
                offeredLevers: s.profile.pendingLever?.offeredLevers ?? [],
                chosenLever: openDecision.lever,
                lockedUntilLogged: true,
              },
            }),
          };
        }),
      logDecision: (input) => {
        const reason = input.reason.trim();
        const prediction = input.prediction.trim();
        if (!reason || !prediction) {
          return { ok: false, error: "Reason and prediction are required (one line each)." };
        }
        const pending = get().profile.pendingLever;
        if (
          pending?.lockedUntilLogged &&
          pending.chosenLever &&
          pending.chosenLever !== input.lever
        ) {
          return {
            ok: false,
            error: `One lever at a time: finish logging a result for “${pending.chosenLever}” before changing “${input.lever}”.`,
          };
        }
        const id = uid("dec");
        const entry: DecisionEntry = {
          id,
          createdAt: new Date().toISOString(),
          setupSummary: input.setupSummary,
          lever: input.lever,
          changeSummary: input.changeSummary,
          reason,
          prediction,
          result: "pending",
          resultNote: "",
          resolvedAt: null,
          bodyRead: "",
        };
        set((s) => ({
          profile: touch({
            ...s.profile,
            decisions: [entry, ...s.profile.decisions],
            pendingLever: s.profile.pendingLever
              ? {
                  ...s.profile.pendingLever,
                  chosenLever: input.lever,
                  lockedUntilLogged: true,
                }
              : {
                  problem: "manual",
                  offeredLevers: [],
                  chosenLever: input.lever,
                  lockedUntilLogged: true,
                },
          }),
        }));
        return { ok: true, id };
      },
      resolveDecision: (id, result, resultNote, bodyRead) =>
        set((s) => {
          const decisions = s.profile.decisions.map((d) =>
            d.id === id
              ? {
                  ...d,
                  result,
                  resultNote: resultNote.trim(),
                  bodyRead: bodyRead.trim(),
                  resolvedAt: new Date().toISOString(),
                }
              : d,
          );
          const stillPending = decisions.some((d) => d.result === "pending");
          return {
            profile: touch({
              ...s.profile,
              decisions,
              pendingLever: stillPending ? s.profile.pendingLever : null,
            }),
          };
        }),
      logSession: (input) => {
        const id = uid("ses");
        const entry: SessionEntry = {
          id,
          createdAt: new Date().toISOString(),
          setupSummary: input.setupSummary,
          racketSlug: input.racketSlug,
          stringId: input.stringId,
          tensionLbs: input.tensionLbs,
          hoursOnBed: input.hoursOnBed,
          feltGood: input.feltGood.trim(),
          brokeDown: input.brokeDown.trim(),
          bodyCheck: input.bodyCheck,
          overallFeel: input.overallFeel,
          notes: input.notes.trim(),
        };

        set((s) => {
          let stringBeds = [...s.profile.stringBeds];
          if (input.stringId && input.hoursOnBed > 0) {
            const idx = stringBeds.findIndex((b) => b.stringId === input.stringId);
            const now = new Date().toISOString();
            if (idx >= 0) {
              const prev = stringBeds[idx];
              stringBeds[idx] = {
                ...prev,
                hours: prev.hours + input.hoursOnBed,
                lastPlayedAt: now,
                tensionLbs: input.tensionLbs ?? prev.tensionLbs,
                stringLabel: input.stringLabel ?? prev.stringLabel,
              };
            } else {
              const bed: StringBedHours = {
                stringId: input.stringId,
                stringLabel: input.stringLabel ?? input.stringId,
                tensionLbs: input.tensionLbs,
                hours: input.hoursOnBed,
                installedAt: now,
                lastPlayedAt: now,
              };
              stringBeds = [bed, ...stringBeds];
            }
          }

          // Fold notable body feedback into evolving notes
          const bodyBits: string[] = [];
          for (const [area, status] of Object.entries(input.bodyCheck) as [
            BodyArea,
            NonNullable<SessionEntry["bodyCheck"][BodyArea]>,
          ][]) {
            if (status && status !== "ok") {
              bodyBits.push(`${area}: ${status}`);
            }
          }
          let bodyFeedbackNotes = s.profile.bodyFeedbackNotes;
          if (bodyBits.length || input.brokeDown.trim()) {
            const line = `[${new Date().toLocaleDateString()}] ${bodyBits.join(", ") || "body ok"}${
              input.brokeDown.trim() ? ` — ${input.brokeDown.trim()}` : ""
            }`;
            bodyFeedbackNotes = [line, bodyFeedbackNotes].filter(Boolean).join("\n").slice(0, 4000);
          }

          return {
            profile: touch({
              ...s.profile,
              sessions: [entry, ...s.profile.sessions],
              stringBeds,
              bodyFeedbackNotes,
            }),
          };
        });
        return id;
      },
      resetStringBed: (stringId, stringLabel, tensionLbs) =>
        set((s) => {
          const now = new Date().toISOString();
          const rest = s.profile.stringBeds.filter((b) => b.stringId !== stringId);
          const bed: StringBedHours = {
            stringId,
            stringLabel,
            tensionLbs,
            hours: 0,
            installedAt: now,
            lastPlayedAt: now,
          };
          return { profile: touch({ ...s.profile, stringBeds: [bed, ...rest] }) };
        }),
      upsertMatchedPair: (pair) =>
        set((s) => {
          const id = pair.id ?? uid("pair");
          const next: MatchedPair = { ...pair, id };
          const rest = s.profile.matchedPairs.filter((p) => p.id !== id);
          return {
            profile: touch({ ...s.profile, matchedPairs: [next, ...rest] }),
          };
        }),
      removeMatchedPair: (id) =>
        set((s) => ({
          profile: touch({
            ...s.profile,
            matchedPairs: s.profile.matchedPairs.filter((p) => p.id !== id),
          }),
        })),
      isLeverLocked: (attempting) => {
        const profile = get().profile;
        const openDecision = profile.decisions.find((d) => d.result === "pending");
        const chosenLever = profile.pendingLever?.chosenLever ?? openDecision?.lever;
        if (!openDecision || !chosenLever) return false;
        if (!attempting) return true;
        return attempting !== chosenLever;
      },
      pendingLockMessage: () => {
        const open = get().profile.decisions.find((d) => d.result === "pending");
        if (!open) return null;
        return `One lever locked: resolve “${open.changeSummary}” (prediction vs result + body read) before the next change.`;
      },
    }),
    {
      name: "strokeform-player-profile-v1",
      partialize: (s) => ({
        profile: s.profile,
        onboardingComplete: s.onboardingComplete,
        onboardingStep: s.onboardingStep,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.setHydrated(true);
        if (!state.onboardingComplete && profileLooksStarted(state.profile)) {
          state.completeOnboarding();
        }
      },
    },
  ),
);

export function setupSummaryFromGear(setup: {
  racketLabel: string | null;
  stringLabel: string | null;
  tensionLbs: number | null;
  gripLabel: string | null;
  gripSize: string | null;
}): string {
  const parts = [
    setup.racketLabel,
    setup.stringLabel
      ? `${setup.stringLabel}${setup.tensionLbs != null ? ` @ ${setup.tensionLbs} lbs` : ""}`
      : null,
    setup.gripLabel || setup.gripSize,
  ].filter(Boolean);
  return parts.join(" · ") || "Unset setup";
}
