import { STRINGS } from "@/data/equipment/strings";
import { stringPortraitSvg } from "@/lib/equipment/media/portraits";
import { externalStringImage } from "@/lib/equipment/media/externalImages";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const format = new URL(request.url).searchParams.get("format");

  const external = externalStringImage(id);
  if (external && format !== "svg") {
    return Response.redirect(external, 302);
  }

  const string = STRINGS.find((s) => s.id === id);
  if (!string) {
    return new Response("Not found", { status: 404 });
  }
  const svg = stringPortraitSvg(string);
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
