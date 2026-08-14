import Link from "next/link";
import type { Metadata } from "next";
import { PlayerProfileLab } from "@/components/profile/PlayerProfileLab";

export const metadata: Metadata = {
  title: "Player Profile — Strokeform",
  description:
    "Persistent player memory: grips, constraints, decision log, sessions, matched pairs, and one-lever discipline.",
};

export default function ProfilePage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-[var(--line)] px-6 py-4 md:px-10">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-[family-name:var(--font-display)] text-lg tracking-tight">
            STROKEFORM
          </Link>
          <span className="hidden text-xs text-[var(--muted)] sm:inline">Player profile</span>
        </div>
        <nav className="flex items-center gap-2 text-sm sm:gap-3">
          <Link
            href="/gear"
            className="rounded-md px-3 py-1.5 text-[var(--foreground)] transition hover:bg-white/5"
            style={{ boxShadow: "0 0 0 1px var(--line)" }}
          >
            Gear
          </Link>
          <Link
            href="/lab"
            className="rounded-md bg-[var(--accent)] px-3 py-1.5 font-medium text-[#0b1a14] transition hover:brightness-110"
          >
            Form lab
          </Link>
          <Link href="/" className="text-[var(--muted)] transition hover:text-[var(--foreground)]">
            Home
          </Link>
        </nav>
      </header>

      <section className="relative overflow-hidden border-b border-[var(--line)] px-6 py-12 md:px-10 md:py-16">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 70% 80% at 15% 30%, rgba(45,106,79,0.35), transparent 55%),
              radial-gradient(ellipse 50% 60% at 90% 70%, rgba(200,245,96,0.06), transparent 50%),
              repeating-linear-gradient(12deg, transparent, transparent 36px, rgba(200,245,96,0.025) 36px, rgba(200,245,96,0.025) 37px)
            `,
          }}
          aria-hidden
        />
        <div className="relative z-10 max-w-2xl">
          <p className="font-[family-name:var(--font-display)] text-5xl tracking-tight md:text-6xl">
            PROFILE
          </p>
          <h1 className="mt-4 text-xl text-[var(--foreground)]/90 md:text-2xl">
            Memory and accountability — the thing that stops starting from zero.
          </h1>
          <p className="mt-4 max-w-lg text-[var(--muted)] leading-relaxed">
            Store your grips and constraints, log why you changed tension, tie sessions to string
            hours, and enforce one lever at a time. Specs advise; your body decides.
          </p>
        </div>
      </section>

      <PlayerProfileLab />
    </div>
  );
}
