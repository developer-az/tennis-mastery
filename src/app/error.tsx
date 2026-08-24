"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-20">
      <div className="sf-intel-panel">
        <p className="sf-kicker">Fault</p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
          That play didn&apos;t clear the net
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
          Strokeform hit an unexpected error. Retry this surface, or jump back to a known-good rail.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={reset} className="sf-btn sf-btn-primary">
            Retry
          </button>
          <Link href="/you" className="sf-btn sf-btn-secondary">
            Your court
          </Link>
          <Link href="/lab" className="sf-btn sf-btn-ghost">
            Form lab
          </Link>
        </div>
      </div>
    </div>
  );
}
