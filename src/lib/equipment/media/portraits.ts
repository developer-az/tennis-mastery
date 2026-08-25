import type { RacketProfile, StringProfile, GripProfile } from "@/types/equipment";
import { brandAccent } from "./brandColors";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Head oval scale from head size (sq in). */
function headScale(hs: number | null): { rx: number; ry: number } {
  const size = hs ?? 100;
  const t = Math.max(0, Math.min(1, (size - 95) / 15));
  return { rx: 48 + t * 10, ry: 58 + t * 12 };
}

function patternLines(pattern: string | null, cx: number, cy: number, rx: number, ry: number): string {
  let mains = 16;
  let crosses = 19;
  if (pattern) {
    const parts = pattern.toLowerCase().replace(/\s/g, "").split("x");
    mains = parseInt(parts[0], 10) || 16;
    crosses = parseInt(parts[1], 10) || 19;
  }
  const lines: string[] = [];
  const mCount = Math.min(10, Math.max(6, Math.round(mains / 2)));
  const cCount = Math.min(12, Math.max(7, Math.round(crosses / 2)));
  for (let i = 0; i < mCount; i++) {
    const t = (i + 1) / (mCount + 1);
    const x = cx - rx * 0.75 + t * rx * 1.5;
    lines.push(
      `<line x1="${x.toFixed(1)}" y1="${(cy - ry * 0.72).toFixed(1)}" x2="${x.toFixed(1)}" y2="${(cy + ry * 0.72).toFixed(1)}" stroke="rgba(42,50,48,0.28)" stroke-width="0.85"/>`,
    );
  }
  for (let i = 0; i < cCount; i++) {
    const t = (i + 1) / (cCount + 1);
    const y = cy - ry * 0.7 + t * ry * 1.4;
    lines.push(
      `<line x1="${(cx - rx * 0.72).toFixed(1)}" y1="${y.toFixed(1)}" x2="${(cx + rx * 0.72).toFixed(1)}" y2="${y.toFixed(1)}" stroke="rgba(42,50,48,0.22)" stroke-width="0.75"/>`,
    );
  }
  return lines.join("");
}

export function racketPortraitSvg(r: RacketProfile): string {
  const accent = brandAccent(r.brand);
  const { rx, ry } = headScale(r.headSizeSqIn);
  const cx = 100;
  const cy = 72;
  const label = esc(`${r.brand} ${r.model}`.slice(0, 28));
  const year = r.year ? String(r.year) : "";
  const head = r.headSizeSqIn != null ? `${r.headSizeSqIn}″` : "";
  const pattern = r.stringPattern ? esc(r.stringPattern) : "";

  const rxS = rx.toFixed(1);
  const ryS = ry.toFixed(1);
  // Curated product-card portrait: soft well + crafted hoop (scales cleanly; not AI collage).
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 260" width="200" height="260" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="well" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f2f6f3"/>
      <stop offset="100%" stop-color="#e0e9e3"/>
    </linearGradient>
    <linearGradient id="frame" x1="0.15" y1="0" x2="0.9" y2="1">
      <stop offset="0%" stop-color="#2a2f34"/>
      <stop offset="45%" stop-color="${accent}"/>
      <stop offset="100%" stop-color="#1a2220"/>
    </linearGradient>
    <linearGradient id="grip" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#2a1c14"/>
      <stop offset="50%" stop-color="#4a3224"/>
      <stop offset="100%" stop-color="#2a1c14"/>
    </linearGradient>
    <clipPath id="bed">
      <ellipse cx="${cx}" cy="${cy}" rx="${(rx - 7).toFixed(1)}" ry="${(ry - 7).toFixed(1)}"/>
    </clipPath>
  </defs>
  <rect width="200" height="260" fill="url(#well)"/>
  <ellipse cx="100" cy="248" rx="34" ry="4" fill="rgba(26,34,32,0.08)"/>
  <ellipse cx="${cx}" cy="${cy}" rx="${rxS}" ry="${ryS}" fill="#f7faf8" stroke="url(#frame)" stroke-width="8"/>
  <ellipse cx="${cx}" cy="${cy}" rx="${(rx - 4).toFixed(1)}" ry="${(ry - 4).toFixed(1)}" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1.2"/>
  <g clip-path="url(#bed)" opacity="0.9">
    ${patternLines(r.stringPattern, cx, cy, rx - 6, ry - 6)}
  </g>
  <path d="M ${cx - 11} ${(cy + ry - 2).toFixed(1)}
           L ${cx - 7} ${(cy + ry + 18).toFixed(1)}
           L ${cx + 7} ${(cy + ry + 18).toFixed(1)}
           L ${cx + 11} ${(cy + ry - 2).toFixed(1)}
           L ${cx + 4} ${(cy + ry + 8).toFixed(1)}
           L ${cx - 4} ${(cy + ry + 8).toFixed(1)} Z" fill="url(#frame)"/>
  <path d="M ${cx - 5} ${(cy + ry + 16).toFixed(1)} L ${cx - 6} 188 L ${cx + 6} 188 L ${cx + 5} ${(cy + ry + 16).toFixed(1)} Z" fill="#2a3230"/>
  <rect x="${cx - 7}" y="186" width="14" height="48" rx="3.5" fill="url(#grip)"/>
  ${[0, 1, 2, 3, 4, 5, 6].map((i) => `<line x1="${cx - 6}" y1="${192 + i * 6}" x2="${cx + 6}" y2="${192 + i * 6}" stroke="rgba(255,255,255,0.12)" stroke-width="0.7"/>`).join("")}
  <rect x="${cx - 8}" y="230" width="16" height="7" rx="2.5" fill="#1a1f1d"/>
  <circle cx="${(cx - rx * 0.55).toFixed(1)}" cy="${cy - 4}" r="2.2" fill="${accent}" opacity="0.85"/>
  <text x="100" y="252" text-anchor="middle" fill="#5a6a62" font-family="ui-sans-serif,system-ui,sans-serif" font-size="8" font-weight="600">${esc([year, head, pattern].filter(Boolean).join(" · "))}</text>
</svg>`;
}

const MATERIAL_FILL: Record<StringProfile["material"], string> = {
  polyester: "#5c6b7a",
  "co-poly": "#4a7c9b",
  multifilament: "#c4a574",
  "synthetic-gut": "#a8b89a",
  "natural-gut": "#d4b896",
  hybrid: "#7a6b8a",
};

function shapePath(shape: StringProfile["shape"], cx: number, cy: number, r: number): string {
  switch (shape) {
    case "octagonal":
      return `M ${cx},${cy - r} L ${cx + r * 0.7},${cy - r * 0.7} L ${cx + r},${cy} L ${cx + r * 0.7},${cy + r * 0.7} L ${cx},${cy + r} L ${cx - r * 0.7},${cy + r * 0.7} L ${cx - r},${cy} L ${cx - r * 0.7},${cy - r * 0.7} Z`;
    case "hexagonal":
      return `M ${cx},${cy - r} L ${cx + r * 0.87},${cy - r * 0.5} L ${cx + r * 0.87},${cy + r * 0.5} L ${cx},${cy + r} L ${cx - r * 0.87},${cy + r * 0.5} L ${cx - r * 0.87},${cy - r * 0.5} Z`;
    case "pentagonal":
      return `M ${cx},${cy - r} L ${cx + r * 0.95},${cy - r * 0.3} L ${cx + r * 0.59},${cy + r * 0.8} L ${cx - r * 0.59},${cy + r * 0.8} L ${cx - r * 0.95},${cy - r * 0.3} Z`;
    case "triangular":
      return `M ${cx},${cy - r} L ${cx + r},${cy + r * 0.75} L ${cx - r},${cy + r * 0.75} Z`;
    case "twisted":
    case "textured":
      return `M ${cx},${cy - r} Q ${cx + r},${cy - r * 0.3} ${cx + r * 0.7},${cy} Q ${cx + r},${cy + r * 0.3} ${cx},${cy + r} Q ${cx - r},${cy + r * 0.3} ${cx - r * 0.7},${cy} Q ${cx - r},${cy - r * 0.3} ${cx},${cy - r} Z`;
    default:
      return "";
  }
}

export function stringPortraitSvg(s: StringProfile, gaugeMm?: number): string {
  const accent = brandAccent(s.brand);
  const fill = MATERIAL_FILL[s.material];
  const gauge = gaugeMm ?? s.gaugesMm[0] ?? 1.25;
  const thickness = 4 + (gauge - 1.15) * 40;
  const label = esc(`${s.brand} ${s.name}`.slice(0, 32));
  const cross = shapePath(s.shape, 100, 100, 28);
  const crossEl =
    cross.length > 0
      ? `<path d="${cross}" fill="none" stroke="#c5e85a" stroke-width="2" opacity="0.85"/>`
      : `<circle cx="100" cy="100" r="26" fill="none" stroke="#c5e85a" stroke-width="2" opacity="0.85"/>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f1e28"/>
      <stop offset="100%" stop-color="#0a1218"/>
    </linearGradient>
    <linearGradient id="spool" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${accent}"/>
      <stop offset="100%" stop-color="${fill}"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" fill="url(#bg)"/>
  <ellipse cx="100" cy="108" rx="62" ry="58" fill="#122028" stroke="url(#spool)" stroke-width="10"/>
  <ellipse cx="100" cy="108" rx="38" ry="36" fill="#0a1218" stroke="${fill}" stroke-width="${thickness.toFixed(1)}"/>
  ${crossEl}
  <text x="100" y="188" text-anchor="middle" fill="rgba(232,239,233,0.6)" font-family="system-ui,sans-serif" font-size="10">${gauge.toFixed(2)} mm</text>
</svg>`;
}

export function gripPortraitSvg(g: GripProfile): string {
  const accent = brandAccent(g.brand);
  const isOver = g.kind === "overgrip";
  const label = esc(`${g.brand} ${g.name}`.slice(0, 32));
  const layers = Math.max(1, Math.round(g.thicknessMm * 5));
  const textureStroke =
    g.texture === "perforated"
      ? "4 3"
      : g.texture === "ribbed" || g.texture === "raised"
        ? "2 1"
        : g.texture === "dry-tack"
          ? "1 2"
          : "0";

  const dots =
    g.texture === "perforated"
      ? Array.from({ length: 18 })
          .map((_, i) => {
            const row = Math.floor(i / 6);
            const col = i % 6;
            return `<circle cx="${55 + col * 18}" cy="${70 + row * 22}" r="2.2" fill="rgba(11,26,20,0.55)"/>`;
          })
          .join("")
      : "";

  const stripLayers = Array.from({ length: layers })
    .map((_, i) => {
      const y = 48 + i * 3;
      return `<rect x="${40 - i}" y="${y}" width="${120 + i * 2}" height="${88 - i * 2}" rx="6" fill="none" stroke="${isOver ? "#c5e85a" : accent}" stroke-opacity="${0.25 + i * 0.12}" stroke-width="2" stroke-dasharray="${textureStroke}"/>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1a2418"/>
      <stop offset="100%" stop-color="#0c140e"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" fill="url(#bg)"/>
  <rect x="42" y="52" width="116" height="82" rx="8" fill="${isOver ? accent : "#2a3a2e"}" opacity="0.9"/>
  ${stripLayers}
  ${dots}
  <text x="100" y="160" text-anchor="middle" fill="rgba(232,239,233,0.7)" font-family="system-ui,sans-serif" font-size="11">${isOver ? "Overgrip" : "Replacement"}</text>
  <text x="100" y="178" text-anchor="middle" fill="rgba(232,239,233,0.45)" font-family="system-ui,sans-serif" font-size="9">${esc(g.texture)} · ${g.thicknessMm.toFixed(2)} mm</text>
</svg>`;
}
