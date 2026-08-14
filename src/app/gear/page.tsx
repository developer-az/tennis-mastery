import { Suspense } from "react";
import type { Metadata } from "next";
import { GearLab } from "@/components/gear/GearLab";
import { loadRackets } from "@/lib/equipment/rackets";
import { STRINGS } from "@/data/equipment/strings";
import { GRIPS } from "@/data/equipment/grips";

export const metadata: Metadata = {
  title: "Gear Lab — Strokeform",
  description:
    "Understand modern tennis rackets, strings, overgrips, and lead tape — compare to your setup, filter by gauge and feel, and visualize launch angle and swing path.",
};

export default async function GearPage() {
  const { rackets, meta } = await loadRackets();

  return (
    <div className="flex flex-1 flex-col">
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
    </div>
  );
}
