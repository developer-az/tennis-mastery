import { NextResponse } from "next/server";
import { loadRackets } from "@/lib/equipment/rackets";

export async function GET() {
  const { rackets, meta } = await loadRackets();
  return NextResponse.json(
    { meta, rackets },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
