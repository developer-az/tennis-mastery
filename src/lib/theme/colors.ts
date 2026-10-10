/** Theme colors readable from JS (SVG / Three). Mirrors CSS tokens. */

export type ThemeMode = "light" | "dark";

export type ThemeColors = {
  background: string;
  foreground: string;
  panel: string;
  bgScene: string;
  bgSunken: string;
  muted: string;
  line: string;
  accent: string;
  accentFg: string;
  amber: string;
  sky: string;
  court: string;
  silhouette: string;
  silhouetteRim: string;
  chartPower: string;
  chartSpin: string;
  chartControl: string;
  chartComfort: string;
  chartFill: string;
};

const LIGHT: ThemeColors = {
  background: "#f3f1ec",
  foreground: "#1a1c1b",
  panel: "#faf9f6",
  bgScene: "#d8d5ce",
  bgSunken: "#e8e6e0",
  muted: "#5c5a55",
  line: "rgba(26, 28, 27, 0.12)",
  accent: "#0b8fa8",
  accentFg: "#f3f1ec",
  amber: "#c4843a",
  sky: "#0b8fa8",
  court: "#3d5c45",
  silhouette: "#2a2c2b",
  silhouetteRim: "#4a4d4b",
  chartPower: "#c4843a",
  chartSpin: "#0b8fa8",
  chartControl: "#0b8fa8",
  chartComfort: "#b8954a",
  chartFill: "rgba(11, 143, 168, 0.14)",
};

const DARK: ThemeColors = {
  background: "#0b0c0d",
  foreground: "#e8e6e1",
  panel: "#141516",
  bgScene: "#121314",
  bgSunken: "#080909",
  muted: "#9a9892",
  line: "rgba(232, 230, 225, 0.1)",
  accent: "#3ec4d4",
  accentFg: "#0b0c0d",
  amber: "#d4954a",
  sky: "#3ec4d4",
  court: "#2a4032",
  silhouette: "#c5c3be",
  silhouetteRim: "#e8e6e1",
  chartPower: "#d4954a",
  chartSpin: "#3ec4d4",
  chartControl: "#3ec4d4",
  chartComfort: "#c8b06a",
  chartFill: "rgba(62, 196, 212, 0.16)",
};

export const THEME_STORAGE_KEY = "strokeform-theme";

export function themeColors(mode: ThemeMode): ThemeColors {
  return mode === "light" ? LIGHT : DARK;
}

/** Read current theme from the document (client only). */
export function getThemeColors(): ThemeColors {
  if (typeof document === "undefined") return LIGHT;
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return themeColors(attr);
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? DARK : LIGHT;
}

export function resolveInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* ignore */
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
