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
        <nav className="flex items-center gap-4 text-xs text-[var(--muted)]">
          <Link href="/gear" className="transition hover:text-[var(--foreground)]">
            Gear lab
          </Link>
          <Link href="/" className="transition hover:text-[var(--foreground)]">
            ← Home
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
