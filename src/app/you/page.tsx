import type { Metadata } from "next";
import { YouHub } from "@/components/you/YouHub";
import { loadRackets } from "@/lib/equipment/rackets";
import { STRINGS } from "@/data/equipment/strings";
import { GRIPS } from "@/data/equipment/grips";

export const metadata: Metadata = {
  title: "You — Strokeform",
  description: "Your grips, bag, sessions, and stats — remembered.",
};

export default async function YouPage() {
  const { rackets } = await loadRackets();
  return <YouHub rackets={rackets} strings={STRINGS} grips={GRIPS} />;
}
