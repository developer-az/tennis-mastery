import { Suspense } from "react";
import type { Metadata } from "next";
import { GearLab } from "@/components/gear/GearLab";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { CourtLoading } from "@/components/ui/CourtState";
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
          <div className="mx-auto w-full max-w-6xl px-6 py-10 md:px-10">
            <CourtLoading
              label="Loading gear lab…"
              detail="Catalog specs, intelligence sources, and your bag comparison."
            />
          </div>
        }
      >
        <GearLab rackets={rackets} racketMeta={meta} strings={STRINGS} grips={GRIPS} />
      </Suspense>

      <SiteFooter
        note={
          'Specs advise; logged feel decides. Racket numbers from the Racqix catalog; launch, path, skill span, and quirks are Strokeform coaching models — not laboratory certificates.'
        }
      />
    </div>
  );
}
