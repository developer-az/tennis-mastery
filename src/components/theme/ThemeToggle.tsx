"use client";

import { useEffect, useState } from "react";
import { useTheme } from "./ThemeProvider";

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 3.2v1.8M12 19v1.8M4.9 4.9l1.3 1.3M17.8 17.8l1.3 1.3M3.2 12h1.8M19 12h1.8M4.9 19.1l1.3-1.3M17.8 6.2l1.3-1.3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden>
      <path
        d="M15.2 3.4A8.2 8.2 0 1 0 20.6 14 6.6 6.6 0 0 1 15.2 3.4Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const next = theme === "light" ? "dark" : "light";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="sf-icon-btn"
      style={{ borderRadius: "var(--radius)" }}
      aria-label={mounted ? `Switch to ${next} mode` : "Toggle color theme"}
      title={mounted ? `Switch to ${next} mode` : "Toggle color theme"}
      suppressHydrationWarning
    >
      {/* Icon depends on localStorage theme — wait for mount to avoid SSR mismatch */}
      {!mounted ? (
        <span className="h-[18px] w-[18px]" aria-hidden />
      ) : theme === "light" ? (
        <MoonIcon />
      ) : (
        <SunIcon />
      )}
    </button>
  );
}
