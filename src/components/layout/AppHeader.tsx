"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/you", label: "You", match: (p: string) => p === "/you" || p.startsWith("/profile") },
  { href: "/lab", label: "Lab", match: (p: string) => p === "/lab" || p.startsWith("/lab/") },
  { href: "/gear", label: "Gear", match: (p: string) => p === "/gear" || p.startsWith("/gear/") },
] as const;

export function AppHeader() {
  const pathname = usePathname() ?? "/";

  return (
    <header className="sticky top-0 z-50 flex shrink-0 items-center justify-between border-b border-[var(--line)] bg-[var(--background)]/90 px-4 py-3 backdrop-blur md:px-8">
      <Link
        href="/"
        className="font-[family-name:var(--font-display)] text-base tracking-tight md:text-lg"
      >
        STROKEFORM
      </Link>
      <nav className="flex items-center gap-1 sm:gap-2">
        {LINKS.map((link) => {
          const active = link.match(pathname);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                active
                  ? "bg-[var(--accent)] font-medium text-[#0b1a14]"
                  : "text-[var(--muted)] hover:bg-white/5 hover:text-[var(--foreground)]"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
