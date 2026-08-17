"use client";

import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const next = theme === "light" ? "Dark" : "Light";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="sf-btn-ghost px-2.5 py-1.5 text-[11px] font-semibold tracking-[0.1em] uppercase"
      aria-label={`Switch to ${next.toLowerCase()} mode`}
      title={`Switch to ${next.toLowerCase()} mode`}
    >
      {next}
    </button>
  );
}
