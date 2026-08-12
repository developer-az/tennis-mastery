import fs from "fs";

const LINE_ONLY_RE =
  /^(prestige|gravity|radical|extreme|boom|speed|instinct|cx|fx|sx|vcore|ezone|percept|blade|clash|shift|pure aero|pure drive|pure strike|pro staff|tfight|strike|aero|drive)$/i;
const BRAND_PREFIX_RE =
  /^(head|babolat|wilson|yonex|dunlop|tecnifibre|prince|volkl|solinco|gamma|prokennex|donnay|lacoste|adidas)-/i;

function resolveDisplayModel(slug: string, model: string): string {
  const cleaned = (model || "").trim();
  let body = slug.replace(BRAND_PREFIX_RE, "");
  body = body.replace(/-?\d{4}$/, "");
  body = body.replace(/^graphene(-\d+)?(-plus)?-/, "");
  body = body.replace(/^srixon-/, "");

  const fromSlug = body
    .split("-")
    .filter(Boolean)
    .map((seg) => {
      if (/^\d+x\d+$/i.test(seg)) return seg.toLowerCase();
      if (/^\d+$/.test(seg)) return seg;
      const lower = seg.toLowerCase();
      const acronyms: Record<string, string> = {
        mp: "MP",
        ls: "LS",
        os: "OS",
        pro: "Pro",
        tour: "Tour",
        team: "Team",
        elite: "Elite",
        limited: "Limited",
        mid: "Mid",
        plus: "Plus",
        lite: "Lite",
        cx: "CX",
        fx: "FX",
        sx: "SX",
      };
      if (acronyms[lower]) return acronyms[lower];
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ")
    .replace(/\bMp L\b/g, "MP L");

  const modelCompact = cleaned.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const slugCompact = body.replace(/-/g, "").toLowerCase();
  const lineOnly = LINE_ONLY_RE.test(cleaned);
  const slugRicher = slugCompact.length >= modelCompact.length + 3;

  if (!cleaned || lineOnly || slugRicher) return fromSlug || cleaned || slug;
  return cleaned;
}

const path = "src/data/equipment/rackets.snapshot.json";
const data = JSON.parse(fs.readFileSync(path, "utf8"));
let changed = 0;
for (const r of data.rackets) {
  const next = resolveDisplayModel(r.slug, r.model);
  if (next !== r.model) {
    changed++;
    r.model = next;
  }
}
fs.writeFileSync(path, JSON.stringify(data));
console.log("updated models:", changed);
for (const slug of [
  "head-prestige-pro-2024",
  "dunlop-cx-200-2021",
  "dunlop-cx-200-os-2021",
  "head-prestige-mp-l-2024",
]) {
  const r = data.rackets.find((x: { slug: string }) => x.slug === slug);
  console.log(slug, "→", r?.model);
}
