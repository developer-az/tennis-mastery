"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const LINKS = [
  { href: "/you", label: "You", match: (p: string) => p === "/you" || p.startsWith("/profile") },
  { href: "/lab", label: "Lab", match: (p: string) => p === "/lab" || p.startsWith("/lab/") },
  { href: "/gear", label: "Gear", match: (p: string) => p === "/gear" || p.startsWith("/gear/") },
] as const;

export function AppHeader() {
  const pathname = usePathname() ?? "/";
  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 z-50 shrink-0 border-b border-[var(--line)] bg-[var(--background)]/92 backdrop-blur-md">
      <div className="mx-auto flex h-[var(--header-h)] w-full max-w-[1400px] items-center justify-between gap-4 px-4 md:px-8">
        <Link href="/" className="group flex min-w-0 items-center gap-3">
          <span
            className="hidden h-8 w-8 shrink-0 items-center justify-center border border-[var(--accent)]/50 text-[10px] font-semibold tracking-[0.12em] text-[var(--accent)] sm:inline-flex"
            aria-hidden
          >
            SF
          </span>
          <span className="min-w-0">
            <span className="block font-[family-name:var(--font-display)] text-[15px] font-semibold tracking-[0.08em] text-[var(--foreground)] transition group-hover:text-[var(--accent)] md:text-base">
              STROKEFORM
            </span>
            <span className="mt-0.5 hidden text-[10px] tracking-[0.14em] text-[var(--muted)] uppercase sm:block">
              Form · Gear · Science
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          <nav className="flex items-center gap-0.5 sm:gap-1" aria-label="Primary">
            {LINKS.map((link) => {
              const active = link.match(pathname);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative px-3 py-2 text-[13px] font-medium tracking-[0.04em] transition md:px-4 ${
                    active
                      ? "text-[var(--foreground)]"
                      : "text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {link.label}
                  <span
                    className={`absolute inset-x-3 bottom-0 h-px md:inset-x-4 ${
                      active ? "bg-[var(--accent)]" : "bg-transparent"
                    }`}
                    aria-hidden
                  />
                </Link>
              );
            })}
            {!isHome ? (
              <Link href="/" className="sf-btn-ghost ml-1 hidden text-xs tracking-[0.06em] md:inline-flex">
                Home
              </Link>
            ) : null}
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
