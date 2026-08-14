import { Suspense } from "react";
import Link from "next/link";
import { CoachLab } from "@/components/layout/CoachLab";
import { LabUrlSync } from "@/components/lab/LabUrlSync";

export default function LabPage() {
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between border-b border-[var(--line)] bg-[var(--panel)]/90 px-4 py-3 backdrop-blur md:px-6">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-base tracking-tight md:text-lg"
          >
            STROKEFORM
          </Link>
          <span className="hidden text-xs text-[var(--muted)] sm:inline">
            Biomechanics lab
          </span>
        </div>
        <nav className="flex items-center gap-2 text-xs sm:gap-3">
          <Link
            href="/profile"
            className="rounded-md px-3 py-1.5 text-[var(--foreground)] transition hover:bg-white/5"
            style={{ boxShadow: "0 0 0 1px var(--line)" }}
          >
            Profile
          </Link>
          <Link
            href="/gear?tab=overview"
            className="rounded-md bg-[var(--accent)] px-3 py-1.5 font-medium text-[#0b1a14] transition hover:brightness-110"
          >
            My setup
          </Link>
          <Link
            href="/gear?tab=rackets"
            className="rounded-md px-3 py-1.5 text-[var(--foreground)] transition hover:bg-white/5"
            style={{ boxShadow: "0 0 0 1px var(--line)" }}
          >
            Return to Gear lab
          </Link>
          <Link
            href="/"
            className="hidden text-[var(--muted)] transition hover:text-[var(--foreground)] sm:inline"
          >
            Home
          </Link>
        </nav>
      </header>
      <Suspense fallback={null}>
        <LabUrlSync />
      </Suspense>
      <CoachLab />
    </div>
  );
}
