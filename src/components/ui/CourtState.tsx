"use client";

import Link from "next/link";

export function CourtLoading({
  label = "Loading your court…",
  detail,
}: {
  label?: string;
  detail?: string;
}) {
  return (
    <div className="sf-court-state" role="status" aria-live="polite">
      <div className="sf-court-state-rail" aria-hidden />
      <p className="sf-kicker">Strokeform</p>
      <p className="mt-3 font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
        {label}
      </p>
      {detail ? (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--muted)]">{detail}</p>
      ) : (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--muted)]">
          Pulling mold physics, bag state, and coaching rails.
        </p>
      )}
      <div className="sf-court-pulse mt-5" aria-hidden />
    </div>
  );
}

export function CourtEmpty({
  kicker = "Empty court",
  title,
  body,
  primary,
  secondary,
}: {
  kicker?: string;
  title: string;
  body: string;
  primary?: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <div className="sf-court-state sf-intel-panel !shadow-none">
      <div className="sf-court-state-rail" aria-hidden />
      <p className="sf-kicker">{kicker}</p>
      <h2 className="mt-3 font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight md:text-2xl">
        {title}
      </h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--muted)]">{body}</p>
      {(primary || secondary) && (
        <div className="mt-6 flex flex-wrap gap-3">
          {primary ? (
            <Link href={primary.href} className="sf-btn sf-btn-primary">
              {primary.label}
            </Link>
          ) : null}
          {secondary ? (
            <Link href={secondary.href} className="sf-btn sf-btn-secondary">
              {secondary.label}
            </Link>
          ) : null}
        </div>
      )}
    </div>
  );
}
