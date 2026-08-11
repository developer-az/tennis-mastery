import { loadRackets } from "@/lib/equipment/rackets";
import { racketPortraitSvg } from "@/lib/equipment/media/portraits";
import { externalRacketImage } from "@/lib/equipment/media/externalImages";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const format = new URL(request.url).searchParams.get("format");

  const external = externalRacketImage(slug);
  if (external && format !== "svg") {
    return Response.redirect(external, 302);
  }

  const { rackets } = await loadRackets();
  const racket = rackets.find((r) => r.slug === slug);
  if (!racket) {
    return new Response("Not found", { status: 404 });
  }
  const svg = racketPortraitSvg(racket);
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
