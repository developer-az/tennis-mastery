import { NextResponse } from "next/server";
import { GRIPS } from "@/data/equipment/grips";

export async function GET() {
  return NextResponse.json({
    meta: {
      source: "Strokeform curated grip catalog",
      count: GRIPS.length,
      overgrips: GRIPS.filter((g) => g.kind === "overgrip").length,
      replacement: GRIPS.filter((g) => g.kind === "replacement").length,
    },
    grips: GRIPS,
  });
}
