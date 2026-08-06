import { NextResponse } from "next/server";
import { STRINGS } from "@/data/equipment/strings";

export async function GET() {
  return NextResponse.json({
    meta: {
      source: "Strokeform curated modern string catalog",
      count: STRINGS.length,
      note: "Scores are coaching-grade composites at mid recommended tension.",
    },
    strings: STRINGS,
  });
}
