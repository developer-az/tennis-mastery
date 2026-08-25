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
  bgScene: "#dfe8e2",
  bgSunken: "#e6ebe8",
  muted: "#4a5c54",
  line: "rgba(13, 31, 24, 0.1)",
  accent: "#3f7a24",
  accentFg: "#ffffff",
  amber: "#c47a2c",
  sky: "#2a7a9b",
  court: "#2d6a4f",
  silhouette: "#1a2e24",
  silhouetteRim: "#3a4a40",
  chartPower: "#c47a2c",
  chartSpin: "#2a7a9b",
  chartControl: "#3f7a24",
  chartComfort: "#b0892e",
  chartFill: "rgba(63, 122, 36, 0.14)",
};

const DARK: ThemeColors = {
  background: "#121211",
  foreground: "#f2f0eb",
  panel: "#1a1a18",
  bgScene: "#161614",
  bgSunken: "#0e0e0c",
  muted: "#a8a59c",
  line: "rgba(242, 240, 235, 0.1)",
  accent: "#c5e85a",
  accentFg: "#121211",
  amber: "#e8a05a",
  sky: "#7ec8e8",
  court: "#2d6a4f",
  silhouette: "#c8c5bb",
  silhouetteRim: "#e4e1d8",
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
