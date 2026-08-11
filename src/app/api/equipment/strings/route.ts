import { NextResponse } from "next/server";
import { STRINGS } from "@/data/equipment/strings";
import { withStringImages } from "@/lib/equipment/media/urls";

export async function GET() {
  return NextResponse.json({
    meta: {
      source: "Strokeform curated modern string catalog",
      count: STRINGS.length,
      note: "Scores are coaching-grade composites at mid recommended tension.",
    },
    strings: withStringImages(STRINGS),
  });
}
