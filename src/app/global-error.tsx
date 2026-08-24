"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
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
    <html lang="en">
      <body className="flex min-h-dvh flex-col items-center justify-center bg-[#0a1812] px-6 text-[#eef3ef]">
        <div className="max-w-md border border-white/10 bg-[#0d1c16] p-8">
          <p className="text-[10px] font-semibold tracking-[0.18em] text-[#c5e85a] uppercase">
            Strokeform
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Something broke on court</h1>
          <p className="mt-3 text-sm leading-relaxed text-[#9aada3]">
            The mold engines hit an unexpected fault. Your bag data on this device is untouched —
            retry, or return to your court.
          </p>
          {process.env.NODE_ENV === "development" && error?.message ? (
            <p className="mt-3 break-words font-mono text-[11px] text-[#e07a6a]">{error.message}</p>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={reset}
              className="inline-flex min-h-11 items-center bg-[#c5e85a] px-5 text-sm font-semibold text-[#0a160f]"
            >
              Try again
            </button>
            <Link
              href="/you"
              className="inline-flex min-h-11 items-center px-5 text-sm font-semibold text-[#9aada3]"
            >
              Your court →
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
