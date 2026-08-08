import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { GearLab } from "@/components/gear/GearLab";
import { loadRackets } from "@/lib/equipment/rackets";
import { STRINGS } from "@/data/equipment/strings";
import { GRIPS } from "@/data/equipment/grips";

export const metadata: Metadata = {
  title: "Gear Lab — Strokeform",
  description:
    "Understand modern tennis rackets, strings, overgrips, and replacement grips — launch angle, swing path, spin potential, tension, and feel visualized.",
};

export default async function GearPage() {
  const { rackets, meta } = await loadRackets();

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-[var(--line)] px-6 py-4 md:px-10">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-[family-name:var(--font-display)] text-lg tracking-tight">
            STROKEFORM
          </Link>
          <span className="hidden text-xs text-[var(--muted)] sm:inline">Gear lab</span>
        </div>
        <nav className="flex items-center gap-4 text-sm text-[var(--muted)]">
          <Link href="/lab" className="transition hover:text-[var(--foreground)]">
            Form lab
          </Link>
          <Link href="/" className="transition hover:text-[var(--foreground)]">
            Home
          </Link>
        </nav>
      </header>

      <section className="relative overflow-hidden border-b border-[var(--line)] px-6 py-14 md:px-10 md:py-20">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 70% 80% at 85% 20%, rgba(45,106,79,0.4), transparent 55%),
              radial-gradient(ellipse 50% 60% at 10% 80%, rgba(244,162,97,0.08), transparent 50%),
              repeating-linear-gradient(-18deg, transparent, transparent 36px, rgba(200,245,96,0.03) 36px, rgba(200,245,96,0.03) 37px)
            `,
          }}
          aria-hidden
        />
        <div className="relative z-10 max-w-2xl">
          <p
            className="font-[family-name:var(--font-display)] text-5xl tracking-tight md:text-6xl"
            style={{ animation: "rise 0.8s ease-out both" }}
          >
            GEAR LAB
          </p>
          <h1
            className="mt-4 text-xl text-[var(--foreground)]/90 md:text-2xl"
            style={{ animation: "rise 0.8s ease-out 0.1s both" }}
          >
            Make racket, string, and grip feel finally visual.
          </h1>
          <p
            className="mt-4 max-w-lg text-[var(--muted)] leading-relaxed"
            style={{ animation: "rise 0.8s ease-out 0.2s both" }}
          >
            Search your setup. See launch angle and swing path for modern frames, spin and
            tension tradeoffs for strings, and what makes each overgrip or replacement grip
            unique in the hand.
          </p>
        </div>
      </section>

      <Suspense
        fallback={
          <div className="mx-auto w-full max-w-6xl px-6 py-16 text-sm text-[var(--muted)] md:px-10">
            Loading gear lab…
          </div>
        }
      >
        <GearLab rackets={rackets} racketMeta={meta} strings={STRINGS} grips={GRIPS} />
      </Suspense>

      <footer className="border-t border-[var(--line)] px-6 py-8 text-xs text-[var(--muted)] md:px-10">
        <p>
          Racket specs powered by the{" "}
          <a
            href="https://www.racqix.com/en/tennis-racquet-dataset"
            className="underline decoration-[var(--line)] underline-offset-2 hover:text-[var(--foreground)]"
            target="_blank"
            rel="noreferrer"
          >
            Racqix Tennis Racquet Dataset
          </a>
          . Launch/swing-path and string/grip scores are coaching-grade models for learning,
          not laboratory certificates.
        </p>
      </footer>

      <style>{`
        @keyframes rise {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
