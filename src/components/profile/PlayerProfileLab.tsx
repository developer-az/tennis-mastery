"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePlayerStore, setupSummaryFromGear } from "@/store/playerStore";
import { useGearStore } from "@/store/gearStore";
import { derivePatterns, recentBodyTrend, decisionAccountabilityScore } from "@/lib/player/patterns";
import { bedStatus } from "@/lib/player/stringHours";
import { problemOptions, rankedLeversFor, PROBLEM_LABELS, type ProblemId } from "@/lib/player/levers";
import {
  armFriendlyNudge,
  checkRecommendation,
  stiffnessFromComfort,
} from "@/lib/player/constraints";
import type {
  BodyArea,
  DecisionResult,
  LeverKind,
  SessionFeel,
} from "@/types/playerProfile";
import type { ForehandGripKind } from "@/lib/equipment/forehandMold";
import { GRIP_SIZES } from "@/lib/equipment/gripSize";

const FH_GRIPS: { id: ForehandGripKind; label: string }[] = [
  { id: "eastern", label: "Eastern" },
  { id: "semi-western", label: "Semi-western" },
  { id: "western", label: "Western" },
  { id: "extreme-western", label: "Extreme western" },
];

const BH_GRIPS = [
  { id: "one-hand-from-sw" as const, label: "1HBH off back of SW" },
  { id: "one-hand-eastern" as const, label: "1HBH eastern" },
  { id: "two-hand-eastern" as const, label: "2HBH eastern" },
  { id: "two-hand-semi" as const, label: "2HBH semi" },
];

const SERVE_GRIPS = [
  { id: "continental" as const, label: "Continental" },
  { id: "eastern" as const, label: "Eastern" },
  { id: "semi-western" as const, label: "Semi-western" },
];

const BODY_AREAS: BodyArea[] = ["elbow", "wrist", "shoulder", "hand", "skin", "blisters", "back"];
const FEELS: SessionFeel[] = ["great", "ok", "pushy", "flying", "dumping", "framing", "other"];
const RESULTS: Exclude<DecisionResult, "pending">[] = [
  "confirmed",
  "rejected",
  "mixed",
  "abandoned",
];

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-[var(--line)] bg-[var(--panel)]/70 px-5 py-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
        {eyebrow}
      </p>
      <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl tracking-tight">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
      {children}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-md border border-[var(--line)] bg-black/20 px-3 py-2 text-sm outline-none focus:border-[var(--accent)] ${props.className ?? ""}`}
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-md border border-[var(--line)] bg-black/20 px-3 py-2 text-sm outline-none focus:border-[var(--accent)] ${props.className ?? ""}`}
    />
  );
}

export function PlayerProfileLab() {
  const profile = usePlayerStore((s) => s.profile);
  const hydrated = usePlayerStore((s) => s.hydrated);
  const setHydrated = usePlayerStore((s) => s.setHydrated);
  const adoptExampleProfile = usePlayerStore((s) => s.adoptExampleProfile);
  const resetProfile = usePlayerStore((s) => s.resetProfile);
  const setDisplayName = usePlayerStore((s) => s.setDisplayName);
  const setGrips = usePlayerStore((s) => s.setGrips);
  const setPreferences = usePlayerStore((s) => s.setPreferences);
  const setBodyFeedbackNotes = usePlayerStore((s) => s.setBodyFeedbackNotes);
  const toggleConstraint = usePlayerStore((s) => s.toggleConstraint);
  const startLeverWorkflow = usePlayerStore((s) => s.startLeverWorkflow);
  const chooseLever = usePlayerStore((s) => s.chooseLever);
  const clearPendingLever = usePlayerStore((s) => s.clearPendingLever);
  const logDecision = usePlayerStore((s) => s.logDecision);
  const resolveDecision = usePlayerStore((s) => s.resolveDecision);
  const logSession = usePlayerStore((s) => s.logSession);
  const resetStringBed = usePlayerStore((s) => s.resetStringBed);
  const upsertMatchedPair = usePlayerStore((s) => s.upsertMatchedPair);
  const removeMatchedPair = usePlayerStore((s) => s.removeMatchedPair);
  const pendingLockMessage = usePlayerStore((s) => s.pendingLockMessage);

  const gear = useGearStore((s) => s.setup);

  useEffect(() => {
    // Persist may already have rehydrated before mount
    if (usePlayerStore.persist.hasHydrated()) setHydrated(true);
  }, [setHydrated]);

  const patterns = useMemo(() => derivePatterns(profile), [profile]);
  const accountability = useMemo(
    () => decisionAccountabilityScore(profile.decisions),
    [profile.decisions],
  );
  const bodyTrend = useMemo(() => recentBodyTrend(profile.sessions), [profile.sessions]);
  const nudge = armFriendlyNudge(profile);
  const gearSummary = setupSummaryFromGear(gear);

  const liveFlags = useMemo(() => {
    const material = gear.stringLabel ?? "";
    const fullPoly = /poly/i.test(material) && !/hybrid/i.test(material);
    return checkRecommendation(profile, {
      frameComfort: gear.racketComfort,
      frameStiffness: stiffnessFromComfort(gear.racketComfort),
      tensionLbs: gear.tensionLbs ?? undefined,
      stringMaterial: material,
      fullPoly,
      stringComfort: gear.stringComfort,
    });
  }, [profile, gear]);

  // Decision form
  const [decLever, setDecLever] = useState<LeverKind>("tension");
  const [decChange, setDecChange] = useState("");
  const [decReason, setDecReason] = useState("");
  const [decPrediction, setDecPrediction] = useState("");
  const [decError, setDecError] = useState<string | null>(null);

  // Session form
  const [hours, setHours] = useState("1.5");
  const [feltGood, setFeltGood] = useState("");
  const [brokeDown, setBrokeDown] = useState("");
  const [overallFeel, setOverallFeel] = useState<SessionFeel>("ok");
  const [sessionNotes, setSessionNotes] = useState("");
  const [bodyCheck, setBodyCheck] = useState<SessionEntryBody>({});

  // Resolve form
  const [resolveNotes, setResolveNotes] = useState<Record<string, { note: string; body: string }>>(
    {},
  );

  // Pair form
  const [pairLabel, setPairLabel] = useState("Matched CX200s");
  const [pairA, setPairA] = useState(gear.racketSlug ?? "");
  const [pairB, setPairB] = useState("");
  const [pairGrip, setPairGrip] = useState(
    profile.grips.targetBuildNote || "L3 + sleeve + Tourna",
  );

  const [problem, setProblem] = useState<ProblemId>("balls_flying");

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-16 text-sm text-[var(--muted)] md:px-10">
        Loading player memory…
      </div>
    );
  }

  const lockMsg = pendingLockMessage();
  const hasPendingDecision = profile.decisions.some((d) => d.result === "pending");
  const canClearPendingWorkflow = Boolean(profile.pendingLever && !hasPendingDecision);

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6 px-6 py-10 md:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            Memory & accountability
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl tracking-tight md:text-4xl">
            Player profile
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[var(--muted)] leading-relaxed">
            Grips, constraints, decisions, and sessions — so the app knows you months from now,
            not just today. Body feedback always beats model predictions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => adoptExampleProfile()}
            className="rounded-md px-3 py-2 text-xs transition hover:bg-white/5"
            style={{ boxShadow: "0 0 0 1px var(--line)" }}
          >
            Load coaching starter
          </button>
          <button
            type="button"
            onClick={() => resetProfile()}
            className="rounded-md px-3 py-2 text-xs text-[var(--muted)] transition hover:bg-white/5"
          >
            Clear profile
          </button>
        </div>
      </div>

      <p className="rounded-md border border-[var(--line)] bg-black/20 px-4 py-3 text-xs leading-relaxed text-[var(--muted)]">
        Coaching-grade models, not Hawk-Eye. Logged real-world feedback outweighs spec-derived
        predictions. After every change, give your body&apos;s read — the app is here to make you
        a better observer of yourself, not to replace feel with math.
      </p>

      {lockMsg && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {lockMsg}
        </p>
      )}

      {nudge && (
        <p className="rounded-md border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-4 py-3 text-sm">
          {nudge}
        </p>
      )}

      {liveFlags.length > 0 && (
        <div className="space-y-2">
          {liveFlags.map((f) => (
            <p
              key={f.id}
              className={`rounded-md border px-4 py-3 text-sm ${
                f.severity === "block" || f.severity === "hard"
                  ? "border-red-400/40 bg-red-500/10"
                  : "border-[var(--line)] bg-black/20 text-[var(--muted)]"
              }`}
            >
              <span className="font-medium text-[var(--foreground)]">{f.title}.</span> {f.detail}
            </p>
          ))}
        </div>
      )}

      <Section eyebrow="Identity" title="Who you are on court">
        <div>
          <FieldLabel>Display name</FieldLabel>
          <TextInput
            value={profile.displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel>Forehand grip</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {FH_GRIPS.map((g) => (
                <Chip
                  key={g.id}
                  active={profile.grips.forehand === g.id}
                  onClick={() => setGrips({ forehand: g.id })}
                  label={g.label}
                />
              ))}
            </div>
          </div>
          <div>
            <FieldLabel>Backhand</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {BH_GRIPS.map((g) => (
                <Chip
                  key={g.id}
                  active={profile.grips.backhand === g.id}
                  onClick={() => setGrips({ backhand: g.id })}
                  label={g.label}
                />
              ))}
            </div>
            <TextInput
              className="mt-2"
              value={profile.grips.backhandNote}
              onChange={(e) => setGrips({ backhandNote: e.target.value })}
              placeholder="e.g. one-hander off the back of SW"
            />
          </div>
          <div>
            <FieldLabel>Serve</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {SERVE_GRIPS.map((g) => (
                <Chip
                  key={g.id}
                  active={profile.grips.serve === g.id}
                  onClick={() => setGrips({ serve: g.id })}
                  label={g.label}
                />
              ))}
            </div>
          </div>
          <div>
            <FieldLabel>Slice</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {SERVE_GRIPS.map((g) => (
                <Chip
                  key={`sl-${g.id}`}
                  active={profile.grips.slice === g.id}
                  onClick={() => setGrips({ slice: g.id })}
                  label={g.label}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel>Target grip size</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {GRIP_SIZES.map((o) => (
                <Chip
                  key={o.code}
                  active={profile.grips.targetSize === o.code}
                  onClick={() => setGrips({ targetSize: o.code })}
                  label={o.label}
                />
              ))}
            </div>
          </div>
          <div>
            <FieldLabel>Grip build note</FieldLabel>
            <TextInput
              value={profile.grips.targetBuildNote}
              onChange={(e) => setGrips({ targetBuildNote: e.target.value })}
              placeholder="4 3/8 + Tourna over a sleeve"
            />
          </div>
        </div>
        <div>
          <FieldLabel>Preferences</FieldLabel>
          <div className="flex flex-wrap gap-3 text-sm">
            {(
              [
                ["generatesOwnPower", "I generate my own power"],
                ["valuesDurability", "Value durability & reps"],
                ["likesDampener", "Like a dampener"],
                ["prefersArmFriendly", "Prefer arm-friendly gear"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={profile.preferences[key]}
                  onChange={(e) => setPreferences({ [key]: e.target.checked })}
                />
                {label}
              </label>
            ))}
          </div>
          <TextArea
            className="mt-2"
            rows={2}
            value={profile.preferences.notes}
            onChange={(e) => setPreferences({ notes: e.target.value })}
            placeholder="Preference notes…"
          />
        </div>
      </Section>

      <Section eyebrow="Constraints" title="Guardrails that never get forgotten">
        {profile.constraints.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            No constraints yet. Load the coaching starter or add via body notes after sessions.
          </p>
        ) : (
          <ul className="space-y-2">
            {profile.constraints.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-start justify-between gap-3 border border-[var(--line)] px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {c.label}{" "}
                    <span className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                      {c.severity} · {c.area}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[var(--muted)]">{c.detail}</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleConstraint(c.id)}
                  className="text-xs text-[var(--accent)]"
                >
                  {c.active ? "Active" : "Paused"}
                </button>
              </li>
            ))}
          </ul>
        )}
        <div>
          <FieldLabel>Evolving body feedback</FieldLabel>
          <TextArea
            rows={4}
            value={profile.bodyFeedbackNotes}
            onChange={(e) => setBodyFeedbackNotes(e.target.value)}
            placeholder="Framing on full BHs… felt pushy… balls flying at 50…"
          />
          <p className="mt-2 text-xs text-[var(--muted)]">{bodyTrend}</p>
        </div>
      </Section>

      <Section eyebrow="Patterns" title="What your history already knows">
        <p className="text-xs text-[var(--muted)]">
          Decisions closed {accountability.closed} · pending {accountability.pending} · confirmed{" "}
          {accountability.confirmed}
        </p>
        {patterns.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            Log a few decisions and sessions — patterns surface here (e.g. low tension → fly, frame
            abandons for comfort).
          </p>
        ) : (
          <ul className="space-y-2">
            {patterns.map((p) => (
              <li
                key={p.id}
                className={`rounded-md border px-3 py-2 text-sm ${
                  p.severity === "strong"
                    ? "border-[var(--accent)]/40 bg-[var(--accent)]/10"
                    : p.severity === "warn"
                      ? "border-amber-500/30 bg-amber-500/10"
                      : "border-[var(--line)]"
                }`}
              >
                <p className="font-medium">{p.title}</p>
                <p className="mt-1 text-[var(--muted)]">{p.detail}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section eyebrow="One lever" title="Fix one problem — change only one thing">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <FieldLabel>What&apos;s broken?</FieldLabel>
            <select
              className="w-full rounded-md border border-[var(--line)] bg-black/20 px-3 py-2 text-sm"
              value={problem}
              onChange={(e) => setProblem(e.target.value as ProblemId)}
            >
              {problemOptions().map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => startLeverWorkflow(problem)}
            className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[#0b1a14]"
          >
            Rank levers
          </button>
          {canClearPendingWorkflow && (
            <button
              type="button"
              onClick={() => clearPendingLever()}
              className="rounded-md px-3 py-2 text-xs text-[var(--muted)]"
            >
              Clear workflow
            </button>
          )}
        </div>
        {profile.pendingLever && (
          <div className="space-y-2">
            <p className="text-xs text-[var(--muted)]">
              Problem:{" "}
              {PROBLEM_LABELS[profile.pendingLever.problem as ProblemId] ??
                profile.pendingLever.problem}
              {profile.pendingLever.chosenLever
                ? ` · locked on ${profile.pendingLever.chosenLever}`
                : " · pick one lever"}
            </p>
            {rankedLeversFor(
              (profile.pendingLever.problem as ProblemId) in PROBLEM_LABELS
                ? (profile.pendingLever.problem as ProblemId)
                : problem,
            ).map((r, i) => (
              <button
                key={r.lever + r.action}
                type="button"
                onClick={() => {
                  chooseLever(r.lever);
                  setDecLever(r.lever);
                  setDecChange(r.action);
                }}
                className={`block w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                  profile.pendingLever?.chosenLever === r.lever
                    ? "border-[var(--accent)] bg-[var(--accent)]/15"
                    : "border-[var(--line)] hover:bg-white/5"
                }`}
              >
                <span className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                  #{i + 1} {r.label}
                </span>
                <p className="font-medium">{r.action}</p>
                <p className="text-[var(--muted)]">{r.why}</p>
              </button>
            ))}
            <p className="text-xs text-[var(--muted)]">
              Next: log the decision below with reason + prediction, then hit and resolve with a
              body read before another lever unlocks.
            </p>
          </div>
        )}
      </Section>

      <Section eyebrow="Decision log" title="Timestamped change · reason · prediction · result">
        <p className="text-xs text-[var(--muted)]">
          Current Gear Lab setup: <span className="text-[var(--foreground)]">{gearSummary}</span>
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel>Lever</FieldLabel>
            <select
              className="w-full rounded-md border border-[var(--line)] bg-black/20 px-3 py-2 text-sm"
              value={decLever}
              onChange={(e) => setDecLever(e.target.value as LeverKind)}
            >
              {(
                [
                  "tension",
                  "string",
                  "gauge",
                  "tip-tape",
                  "handle-tape",
                  "grip-layer",
                  "grip-size",
                  "frame",
                  "swing",
                  "other",
                ] as LeverKind[]
              ).map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>What changed</FieldLabel>
            <TextInput
              value={decChange}
              onChange={(e) => setDecChange(e.target.value)}
              placeholder="Dropped to 52 lbs"
            />
          </div>
          <div>
            <FieldLabel>Reason (required)</FieldLabel>
            <TextInput
              value={decReason}
              onChange={(e) => setDecReason(e.target.value)}
              placeholder="Felt pushy / no depth"
            />
          </div>
          <div>
            <FieldLabel>Prediction (required)</FieldLabel>
            <TextInput
              value={decPrediction}
              onChange={(e) => setDecPrediction(e.target.value)}
              placeholder="Should add depth without flying"
            />
          </div>
        </div>
        {decError && <p className="text-sm text-red-300">{decError}</p>}
        <button
          type="button"
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[#0b1a14]"
          onClick={() => {
            const res = logDecision({
              setupSummary: gearSummary,
              lever: decLever,
              changeSummary: decChange.trim() || `${decLever} change`,
              reason: decReason,
              prediction: decPrediction,
            });
            if (!res.ok) {
              setDecError(res.error);
              return;
            }
            setDecError(null);
            setDecReason("");
            setDecPrediction("");
            setDecChange("");
          }}
        >
          Log decision
        </button>

        <ul className="mt-4 space-y-3">
          {profile.decisions.length === 0 && (
            <li className="text-sm text-[var(--muted)]">No decisions yet.</li>
          )}
          {profile.decisions.map((d) => (
            <li key={d.id} className="border border-[var(--line)] px-3 py-3 text-sm">
              <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                {new Date(d.createdAt).toLocaleString()} · {d.lever} · {d.result}
              </p>
              <p className="mt-1 font-medium">{d.changeSummary}</p>
              <p className="text-[var(--muted)]">
                Why: {d.reason} · Predict: {d.prediction}
              </p>
              <p className="text-xs text-[var(--muted)]">{d.setupSummary}</p>
              {d.result === "pending" ? (
                <div className="mt-3 space-y-2 border-t border-[var(--line)] pt-3">
                  <p className="text-xs font-semibold text-[var(--accent)]">
                    Log result vs prediction (body read required)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {RESULTS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        className="rounded-md px-2 py-1 text-xs"
                        style={{ boxShadow: "0 0 0 1px var(--line)" }}
                        onClick={() => {
                          const notes = resolveNotes[d.id] ?? { note: "", body: "" };
                          if (!notes.body.trim()) {
                            setResolveNotes((prev) => ({
                              ...prev,
                              [d.id]: {
                                ...notes,
                                body: notes.body || "(add body read)",
                              },
                            }));
                            return;
                          }
                          resolveDecision(d.id, r, notes.note, notes.body);
                        }}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <TextInput
                    placeholder="Result note"
                    value={resolveNotes[d.id]?.note ?? ""}
                    onChange={(e) =>
                      setResolveNotes((prev) => ({
                        ...prev,
                        [d.id]: {
                          note: e.target.value,
                          body: prev[d.id]?.body ?? "",
                        },
                      }))
                    }
                  />
                  <TextInput
                    placeholder="Body read (arm / hand / feel) — required"
                    value={resolveNotes[d.id]?.body ?? ""}
                    onChange={(e) =>
                      setResolveNotes((prev) => ({
                        ...prev,
                        [d.id]: {
                          note: prev[d.id]?.note ?? "",
                          body: e.target.value,
                        },
                      }))
                    }
                  />
                </div>
              ) : (
                <p className="mt-2 text-[var(--muted)]">
                  Result: {d.resultNote || "—"} · Body: {d.bodyRead || "—"}
                </p>
              )}
            </li>
          ))}
        </ul>
      </Section>

      <Section eyebrow="Sessions" title="Post-session log — feel tied to setup & string hours">
        <p className="text-xs text-[var(--muted)]">Logging against: {gearSummary}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel>Hours this session</FieldLabel>
            <TextInput value={hours} onChange={(e) => setHours(e.target.value)} />
          </div>
          <div>
            <FieldLabel>Overall feel</FieldLabel>
            <select
              className="w-full rounded-md border border-[var(--line)] bg-black/20 px-3 py-2 text-sm"
              value={overallFeel}
              onChange={(e) => setOverallFeel(e.target.value as SessionFeel)}
            >
              {FEELS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>What felt good</FieldLabel>
            <TextInput value={feltGood} onChange={(e) => setFeltGood(e.target.value)} />
          </div>
          <div>
            <FieldLabel>What broke down</FieldLabel>
            <TextInput value={brokeDown} onChange={(e) => setBrokeDown(e.target.value)} />
          </div>
        </div>
        <div>
          <FieldLabel>Body check</FieldLabel>
          <div className="flex flex-wrap gap-3">
            {BODY_AREAS.map((area) => (
              <label key={area} className="text-xs">
                <span className="mr-1 text-[var(--muted)]">{area}</span>
                <select
                  className="rounded border border-[var(--line)] bg-black/20 px-1 py-1"
                  value={bodyCheck[area] ?? ""}
                  onChange={(e) => {
                    const v = e.target.value as
                      | ""
                      | "ok"
                      | "whisper"
                      | "pain"
                      | "blister";
                    setBodyCheck((prev) => {
                      const next = { ...prev };
                      if (!v) delete next[area];
                      else next[area] = v;
                      return next;
                    });
                  }}
                >
                  <option value="">—</option>
                  <option value="ok">ok</option>
                  <option value="whisper">whisper</option>
                  <option value="pain">pain</option>
                  <option value="blister">blister</option>
                </select>
              </label>
            ))}
          </div>
        </div>
        <TextArea
          rows={2}
          value={sessionNotes}
          onChange={(e) => setSessionNotes(e.target.value)}
          placeholder="Notes (dampener, framing, opponent feedback…)"
        />
        <button
          type="button"
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[#0b1a14]"
          onClick={() => {
            const h = Math.max(0, Number.parseFloat(hours) || 0);
            logSession({
              setupSummary: gearSummary,
              racketSlug: gear.racketSlug,
              stringId: gear.stringId,
              tensionLbs: gear.tensionLbs,
              hoursOnBed: h,
              feltGood,
              brokeDown,
              bodyCheck,
              overallFeel,
              notes: sessionNotes,
              stringLabel: gear.stringLabel,
            });
            setFeltGood("");
            setBrokeDown("");
            setSessionNotes("");
            setBodyCheck({});
          }}
        >
          Save session
        </button>

        <div className="mt-4 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            String bed hours
          </p>
          {profile.stringBeds.length === 0 && (
            <p className="text-sm text-[var(--muted)]">No beds tracked yet — hours accrue on session log.</p>
          )}
          {profile.stringBeds.map((b) => {
            const st = bedStatus(b);
            return (
              <div
                key={b.stringId + b.installedAt}
                className={`flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm ${
                  st.status === "likely_dead"
                    ? "border-red-400/40 bg-red-500/10"
                    : st.status === "aging"
                      ? "border-amber-500/30 bg-amber-500/10"
                      : "border-[var(--line)]"
                }`}
              >
                <div>
                  <p className="font-medium">{b.stringLabel}</p>
                  <p className="text-xs text-[var(--muted)]">{st.message}</p>
                </div>
                <button
                  type="button"
                  className="text-xs text-[var(--accent)]"
                  onClick={() => resetStringBed(b.stringId, b.stringLabel, b.tensionLbs)}
                >
                  Fresh restring
                </button>
              </div>
            );
          })}
        </div>

        <ul className="mt-4 space-y-2">
          {profile.sessions.slice(0, 8).map((s) => (
            <li key={s.id} className="border border-[var(--line)] px-3 py-2 text-sm">
              <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                {new Date(s.createdAt).toLocaleString()} · {s.overallFeel} · +{s.hoursOnBed}h
              </p>
              <p className="font-medium">{s.setupSummary}</p>
              <p className="text-[var(--muted)]">
                Good: {s.feltGood || "—"} · Broke: {s.brokeDown || "—"}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section eyebrow="Matched pair" title="Two frames, one build — grip & specs locked together">
        <p className="text-xs text-[var(--muted)]">
          Target build: {profile.grips.targetBuildNote || "set above"} · size{" "}
          {profile.grips.targetSize ?? "—"}. Blister log sessions feed whether the build worked.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel>Pair label</FieldLabel>
            <TextInput value={pairLabel} onChange={(e) => setPairLabel(e.target.value)} />
          </div>
          <div>
            <FieldLabel>Shared grip build</FieldLabel>
            <TextInput value={pairGrip} onChange={(e) => setPairGrip(e.target.value)} />
          </div>
          <div>
            <FieldLabel>Frame A slug</FieldLabel>
            <TextInput
              value={pairA}
              onChange={(e) => setPairA(e.target.value)}
              placeholder={gear.racketSlug ?? "cx-200-..."}
            />
          </div>
          <div>
            <FieldLabel>Frame B slug</FieldLabel>
            <TextInput value={pairB} onChange={(e) => setPairB(e.target.value)} />
          </div>
        </div>
        <button
          type="button"
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[#0b1a14]"
          onClick={() => {
            if (!pairA || !pairB) return;
            upsertMatchedPair({
              label: pairLabel || "Matched pair",
              frameASlug: pairA,
              frameBSlug: pairB,
              sharedStringId: gear.stringId,
              sharedTensionLbs: gear.tensionLbs,
              sharedGaugeMm: gear.gaugeMm,
              sharedSwingweight: gear.racketSwingweight,
              sharedGripBuild: pairGrip || profile.grips.targetBuildNote,
              notes: "Keep string, tension, SW, and grip build matched.",
            });
          }}
        >
          Save pair from current setup
        </button>
        <ul className="space-y-2">
          {profile.matchedPairs.map((p) => {
            const matchHints: string[] = [];
            if (gear.stringId && p.sharedStringId && gear.stringId !== p.sharedStringId) {
              matchHints.push("string differs from pair target");
            }
            if (
              gear.tensionLbs != null &&
              p.sharedTensionLbs != null &&
              Math.abs(gear.tensionLbs - p.sharedTensionLbs) >= 1
            ) {
              matchHints.push("tension off pair target");
            }
            return (
              <li
                key={p.id}
                className="flex flex-wrap items-start justify-between gap-2 border border-[var(--line)] px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{p.label}</p>
                  <p className="text-[var(--muted)]">
                    {p.frameASlug} ↔ {p.frameBSlug}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {p.sharedStringId ?? "string?"} @ {p.sharedTensionLbs ?? "?"} lbs · SW{" "}
                    {p.sharedSwingweight ?? "?"} · grip: {p.sharedGripBuild}
                  </p>
                  {matchHints.length > 0 && (
                    <p className="mt-1 text-xs text-amber-200">
                      Current Gear setup: {matchHints.join("; ")}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  className="text-xs text-[var(--muted)]"
                  onClick={() => removeMatchedPair(p.id)}
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-[var(--muted)]">
          Form Lab uses your stored FH grip for face angle.{" "}
          <Link href="/lab" className="text-[var(--accent)] underline-offset-2 hover:underline">
            Open Form Lab
          </Link>
        </p>
      </Section>
    </div>
  );
}

type SessionEntryBody = Partial<
  Record<BodyArea, "ok" | "whisper" | "pain" | "blister">
>;

function Chip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md px-2.5 py-1.5 text-xs transition"
      style={{
        background: active ? "var(--accent)" : "transparent",
        color: active ? "#0b1a14" : "var(--foreground)",
        boxShadow: active ? "none" : "0 0 0 1px var(--line)",
        fontWeight: active ? 600 : 400,
      }}
    >
      {label}
    </button>
  );
}
