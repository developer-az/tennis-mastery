import type { Metadata } from "next";
import { YouHub } from "@/components/you/YouHub";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { loadRackets } from "@/lib/equipment/rackets";
import { STRINGS } from "@/data/equipment/strings";
import { GRIPS } from "@/data/equipment/grips";

export const metadata: Metadata = {
  title: "You",
  description: "Your grips, bag, sessions, and stats — remembered.",
};

export default async function YouPage() {
  const { rackets } = await loadRackets();
  return (
    <div className="flex flex-1 flex-col">
      <YouHub rackets={rackets} strings={STRINGS} grips={GRIPS} />
      <SiteFooter />
    </div>
  );
}
