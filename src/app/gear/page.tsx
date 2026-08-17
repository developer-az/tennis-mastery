import { Suspense } from "react";
import type { Metadata } from "next";
import { GearLab } from "@/components/gear/GearLab";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { loadRackets } from "@/lib/equipment/rackets";
import { STRINGS } from "@/data/equipment/strings";
import { GRIPS } from "@/data/equipment/grips";

export const metadata: Metadata = {
  title: "Gear Lab",
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

      <SiteFooter
        note={
          'Racket specs powered by the Racqix Tennis Racquet Dataset. Launch, swing-path, and string/grip scores are coaching-grade models for learning — not laboratory certificates.'
        }
      />
    </div>
  );
}
