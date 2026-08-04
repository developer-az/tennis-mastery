import Link from "next/link";
import { CoachLab } from "@/components/layout/CoachLab";

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
        <Link
          href="/"
          className="text-xs text-[var(--muted)] transition hover:text-[var(--foreground)]"
        >
          ← Home
        </Link>
      </header>
      <CoachLab />
    </div>
  );
}
