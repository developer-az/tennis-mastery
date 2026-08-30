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
    "Calculate how a tennis setup plays from frame specs, string, tension, grip, and tape — and whether the bag is court-ready.",
};

export default async function GearPage() {
  const { rackets, meta } = await loadRackets();

  return (
    <div className="flex flex-1 flex-col">
      <Suspense
        fallback={
          <div className="sf-page">
            <CourtLoading
              label="Loading gear lab…"
              detail="Frame specs, string physics, and whether your bag is court-ready."
            />
          </div>
        }
      >
        <GearLab rackets={rackets} racketMeta={meta} strings={STRINGS} grips={GRIPS} />
      </Suspense>

      <SiteFooter
        note={
          "Specs advise; logged feel decides. Play scores and court-ready verdicts come from mass, SW, RA, pattern, string, and tension — not the model name. Launch, path, and quirks are Strokeform coaching models, not laboratory certificates."
        }
      />
    </div>
  );
}
