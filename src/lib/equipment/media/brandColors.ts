/** Brand accent colors for stylized product portraits. */
const BRAND_COLORS: Record<string, string> = {
  babolat: "#0055a5",
  wilson: "#c8102e",
  head: "#e30613",
  yonex: "#00205b",
  tecnifibre: "#009639",
  dunlop: "#ffcd00",
  prince: "#6f2c91",
  volkl: "#e30613",
  solinco: "#f36c00",
  luxilon: "#c4a000",
  signum: "#1a1a2e",
  tourna: "#00a651",
  gamma: "#0033a0",
  kirschbaum: "#111111",
  isospeed: "#c8102e",
  pacific: "#003366",
  diadem: "#1c1c1c",
  "pro kennex": "#e87722",
  prokennex: "#e87722",
};

export function brandAccent(brand: string): string {
  const key = brand.trim().toLowerCase();
  if (BRAND_COLORS[key]) return BRAND_COLORS[key];
  for (const [k, v] of Object.entries(BRAND_COLORS)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue} 42% 38%)`;
}
