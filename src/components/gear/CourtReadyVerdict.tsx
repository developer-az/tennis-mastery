"use client";

import type { SetupPlayability } from "@/lib/equipment/playability";
import { courtReadyLabel, courtReadyTone } from "@/lib/equipment/playability";

export function CourtReadyVerdict({
  playability,
  compact = false,
}: {
  playability: SetupPlayability;
  compact?: boolean;
}) {
  const tone = courtReadyTone(playability.band);
  const label = courtReadyLabel(playability.band);

  return (
    <section
      className="sf-intel-panel"
      aria-label="Court-ready verdict"
      style={{ boxShadow: `inset 3px 0 0 ${tone}` }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="sf-kicker" style={{ color: tone }}>
            Combined physics
          </p>
          <h3
            className={`mt-2 font-[family-name:var(--font-display)] font-semibold tracking-tight ${
              compact ? "text-lg md:text-xl" : "text-xl md:text-2xl"
            }`}
          >
            {label}
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
            {playability.headline}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p
            className="font-[family-name:var(--font-display)] text-3xl tabular-nums tracking-tight"
            style={{ color: tone }}
          >
            {playability.score}
          </p>
          <p className="sf-kicker sf-kicker-muted">court-ready</p>
        </div>
      </div>

      {!compact ? (
        <p className="mt-4 text-sm leading-relaxed text-[var(--foreground)]/90">
          {playability.howItHits}
        </p>
      ) : (
        <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-[var(--foreground)]/90">
          {playability.howItHits}
        </p>
      )}

      {playability.trajectory ? (
        <p className="mt-3 font-[family-name:var(--font-mono)] text-[11px] leading-relaxed text-[var(--muted)]">
          {playability.trajectory}
        </p>
      ) : null}

      {playability.specLine ? (
        <p className="mt-1 font-[family-name:var(--font-mono)] text-[11px] text-[var(--muted)]">
          {playability.specLine}
        </p>
      ) : null}

      {playability.missing.length > 0 ? (
        <p className="mt-3 text-xs text-[var(--amber)]">
          Still need {playability.missing.join(", ")} for a full bag calculation.
        </p>
      ) : null}

      {playability.flags.length > 0 ? (
        <ul className={`mt-5 grid gap-2 ${compact ? "" : "md:grid-cols-2"}`}>
          {playability.flags.map((f) => {
            const flagTone =
              f.severity === "stop"
                ? "var(--danger)"
                : f.severity === "caution"
                  ? "var(--amber)"
                  : "var(--accent)";
            return (
              <li
                key={f.id}
                className="px-3 py-2.5"
                style={{
                  boxShadow: `inset 2px 0 0 ${flagTone}, inset 0 0 0 1px var(--line)`,
                }}
              >
                <p className="sf-kicker" style={{ color: flagTone }}>
                  {f.severity === "ok" ? "in window" : f.severity}
                </p>
                <p className="mt-1 text-sm font-medium text-[var(--foreground)]">{f.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{f.why}</p>
                {!compact ? (
                  <p className="mt-1 text-xs leading-relaxed text-[var(--foreground)]/80">{f.physics}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {playability.factors.length > 0 && !compact ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {playability.factors.map((f) => (
            <span key={f.id} className="sf-intel-chip" title={f.note}>
              {f.label}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
