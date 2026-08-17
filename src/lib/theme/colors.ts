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
  background: "#f3f6f4",
  foreground: "#0d1f18",
  panel: "#ffffff",
  bgScene: "#dce8e0",
  bgSunken: "#e8eeea",
  muted: "#5a6f64",
  line: "rgba(13, 31, 24, 0.1)",
  accent: "#5a8f28",
  accentFg: "#ffffff",
  amber: "#c47a2c",
  sky: "#2a7a9b",
  court: "#2d6a4f",
  silhouette: "#1a3328",
  silhouetteRim: "#2d4a3c",
  chartPower: "#c47a2c",
  chartSpin: "#2a7a9b",
  chartControl: "#5a8f28",
  chartComfort: "#a67c2a",
  chartFill: "rgba(90, 143, 40, 0.14)",
};

const DARK: ThemeColors = {
  background: "#0a1812",
  foreground: "#eef3ef",
  panel: "#0d1c16",
  bgScene: "#07150f",
  bgSunken: "#06110d",
  muted: "#8b9e92",
  line: "rgba(238, 243, 239, 0.1)",
  accent: "#c5e85a",
  accentFg: "#0a160f",
  amber: "#e8a05a",
  sky: "#7ec8e8",
  court: "#1f5c43",
  silhouette: "#9eb5a8",
  silhouetteRim: "#c5d4cc",
  chartPower: "#f4a261",
  chartSpin: "#7dd3fc",
  chartControl: "#c5e85a",
  chartComfort: "#e9c46a",
  chartFill: "rgba(197, 232, 90, 0.2)",
};

export const THEME_STORAGE_KEY = "strokeform-theme";

export function themeColors(mode: ThemeMode): ThemeColors {
  return mode === "light" ? LIGHT : DARK;
}

/** Read current theme from the document (client only). */
export function getThemeColors(): ThemeColors {
  if (typeof document === "undefined") return DARK;
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return themeColors(attr);
  return window.matchMedia("(prefers-color-scheme: light)").matches ? LIGHT : DARK;
}

export function resolveInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* ignore */
  }
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}
