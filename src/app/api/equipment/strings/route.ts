import { NextResponse } from "next/server";
import { STRINGS } from "@/data/equipment/strings";
import { withStringImages } from "@/lib/equipment/media/urls";

export async function GET() {
  return NextResponse.json(
    {
      meta: {
        source: "Strokeform curated modern string catalog",
        count: STRINGS.length,
      },
      strings: withStringImages(STRINGS),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
