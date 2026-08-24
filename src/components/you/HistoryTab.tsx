"use client";

import { useState } from "react";
import { usePlayerStore, setupSummaryFromGear } from "@/store/playerStore";
import { useGearStore } from "@/store/gearStore";
import { problemOptions, rankedLeversFor, PROBLEM_LABELS, type ProblemId } from "@/lib/player/levers";
import type { DecisionResult, LeverKind } from "@/types/playerProfile";

const RESULTS: Exclude<DecisionResult, "pending">[] = [
  "confirmed",
  "rejected",
  "mixed",
  "abandoned",
];

export function HistoryTab() {
  const profile = usePlayerStore((s) => s.profile);
  const toggleConstraint = usePlayerStore((s) => s.toggleConstraint);
  const startLeverWorkflow = usePlayerStore((s) => s.startLeverWorkflow);
  const chooseLever = usePlayerStore((s) => s.chooseLever);
  const clearPendingLever = usePlayerStore((s) => s.clearPendingLever);
  const logDecision = usePlayerStore((s) => s.logDecision);
  const resolveDecision = usePlayerStore((s) => s.resolveDecision);
  const pendingLockMessage = usePlayerStore((s) => s.pendingLockMessage);
  const setup = useGearStore((s) => s.setup);

  const [problem, setProblem] = useState<ProblemId>("balls_flying");
  const [decLever, setDecLever] = useState<LeverKind>("tension");
  const [decChange, setDecChange] = useState("");
  const [decReason, setDecReason] = useState("");
  const [decPrediction, setDecPrediction] = useState("");
  const [decError, setDecError] = useState<string | null>(null);
  const [resolveNotes, setResolveNotes] = useState<Record<string, { note: string; body: string }>>(
    {},
  );

  const lockMsg = pendingLockMessage();
  const summary = setupSummaryFromGear(setup);

  return (
    <div className="space-y-8">
      <p className="text-xs text-[var(--muted)]">
        Advanced: one lever at a time, reasons, predictions. Skip this until you have a bag and a
        few sessions.
      </p>

      {lockMsg && <p className="sf-alert">{lockMsg}</p>}

      <section>
        <h3 className="font-[family-name:var(--font-display)] text-lg">Constraints</h3>
        {profile.constraints.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted)]">None yet — set them in Redo setup.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {profile.constraints.map((c) => (
              <li key={c.id} className="flex justify-between gap-3 border border-[var(--line)] px-3 py-2 text-sm">
                <span>
                  {c.label}
                  <span className="ml-2 text-xs text-[var(--muted)]">{c.detail}</span>
                </span>
                <button type="button" className="text-xs text-[var(--accent)]" onClick={() => toggleConstraint(c.id)}>
                  {c.active ? "On" : "Off"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="font-[family-name:var(--font-display)] text-lg">One lever</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          <select
            className="flex-1 rounded-md border border-[var(--line)] bg-[var(--bg-sunken)] px-3 py-2 text-sm"
            value={problem}
            onChange={(e) => setProblem(e.target.value as ProblemId)}
          >
            {problemOptions().map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => startLeverWorkflow(problem)}
            className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-[var(--accent-ink)]"
          >
            Rank levers
          </button>
        </div>
        {profile.pendingLever && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-[var(--muted)]">
              {PROBLEM_LABELS[profile.pendingLever.problem as ProblemId] ?? profile.pendingLever.problem}
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
                className="block w-full rounded-md border border-[var(--line)] px-3 py-2 text-left text-sm"
              >
                #{i + 1} {r.label} — {r.action}
              </button>
            ))}
            <button type="button" onClick={() => clearPendingLever()} className="text-xs text-[var(--muted)]">
              Clear lock
            </button>
          </div>
        )}
      </section>

      <section>
        <h3 className="font-[family-name:var(--font-display)] text-lg">Decision log</h3>
        <p className="mt-1 text-xs text-[var(--muted)]">{summary}</p>
        <div className="mt-2 grid gap-2">
          <input
            placeholder="What changed"
            value={decChange}
            onChange={(e) => setDecChange(e.target.value)}
            className="rounded-md border border-[var(--line)] bg-[var(--bg-sunken)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
          <input
            placeholder="Reason"
            value={decReason}
            onChange={(e) => setDecReason(e.target.value)}
            className="rounded-md border border-[var(--line)] bg-[var(--bg-sunken)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
          <input
            placeholder="Prediction"
            value={decPrediction}
            onChange={(e) => setDecPrediction(e.target.value)}
            className="rounded-md border border-[var(--line)] bg-[var(--bg-sunken)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
        </div>
        {decError && <p className="mt-2 text-sm text-red-300">{decError}</p>}
        <button
          type="button"
          className="mt-3 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-ink)]"
          onClick={() => {
            const res = logDecision({
              setupSummary: summary,
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
            setDecChange("");
            setDecReason("");
            setDecPrediction("");
          }}
        >
          Log decision
        </button>
        <ul className="mt-4 space-y-3">
          {profile.decisions.map((d) => (
            <li key={d.id} className="border border-[var(--line)] px-3 py-2 text-sm">
              <p className="sf-label">
                {new Date(d.createdAt).toLocaleDateString()} · {d.lever} · {d.result}
              </p>
              <p className="font-medium">{d.changeSummary}</p>
              <p className="text-[var(--muted)]">
                Why: {d.reason} · Predict: {d.prediction}
              </p>
              {d.result === "pending" ? (
                <div className="mt-2 space-y-2">
                  <input
                    placeholder="Result note"
                    value={resolveNotes[d.id]?.note ?? ""}
                    onChange={(e) =>
                      setResolveNotes((p) => ({
                        ...p,
                        [d.id]: { note: e.target.value, body: p[d.id]?.body ?? "" },
                      }))
                    }
                    className="w-full rounded-md border border-[var(--line)] bg-[var(--bg-sunken)] px-2 py-1.5 text-xs"
                  />
                  <input
                    placeholder="Body read (required)"
                    value={resolveNotes[d.id]?.body ?? ""}
                    onChange={(e) =>
                      setResolveNotes((p) => ({
                        ...p,
                        [d.id]: { note: p[d.id]?.note ?? "", body: e.target.value },
                      }))
                    }
                    className="w-full rounded-md border border-[var(--line)] bg-[var(--bg-sunken)] px-2 py-1.5 text-xs"
                  />
                  <div className="flex flex-wrap gap-1">
                    {RESULTS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        className="rounded px-2 py-1 text-xs"
                        style={{ boxShadow: "0 0 0 1px var(--line)" }}
                        onClick={() => {
                          const notes = resolveNotes[d.id] ?? { note: "", body: "" };
                          if (!notes.body.trim()) return;
                          resolveDecision(d.id, r, notes.note, notes.body);
                        }}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-1 text-[var(--muted)]">
                  {d.resultNote} · Body: {d.bodyRead}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
