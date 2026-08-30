"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { SyncStatusPill } from "@/components/auth/SyncStatusPill";
import { CourtStatusChip } from "@/components/layout/CourtStatusChip";
import { authDisplayLabel, useAuthStore } from "@/store/authStore";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const LINKS = [
  { href: "/you", label: "You", match: (p: string) => p === "/you" || p.startsWith("/profile") },
  { href: "/lab", label: "Lab", match: (p: string) => p === "/lab" || p.startsWith("/lab/") },
  { href: "/gear", label: "Gear", match: (p: string) => p === "/gear" || p.startsWith("/gear/") },
] as const;

export function AppHeader() {
  const pathname = usePathname() ?? "/";
  const isHome = pathname === "/";
  const isAccount = pathname.startsWith("/account");
  const productPath = LINKS.some((l) => l.match(pathname));

  const initialized = useAuthStore((s) => s.initialized);
  const user = useAuthStore((s) => s.user);
  const account = useAuthStore((s) => s.account);
  const cloudReady = isSupabaseConfigured();

  const accountHref = user ? "/account" : "/account/login";
  const accountLabel = user ? authDisplayLabel(account, user) : "Sign in";

  return (
    <header
      className="sticky top-0 z-50 shrink-0 border-b border-[var(--line)] bg-[var(--body-top)]/92 backdrop-blur-md"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        height: "var(--header-h)",
      }}
    >
      <div className="mx-auto flex h-[var(--header-bar)] w-full max-w-[var(--page-max)] items-center justify-between gap-3 px-[max(1rem,env(safe-area-inset-left))] md:max-w-[var(--page-max-wide)] md:px-8">
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
              Mold · Lab · Accountability
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-0.5 sm:gap-1">
          <nav
            className={`${productPath ? "hidden md:flex" : "flex"} items-center gap-0.5 sm:gap-1`}
            aria-label="Primary"
          >
            {LINKS.map((link) => {
              const active = link.match(pathname);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative inline-flex min-h-11 items-center px-3 text-[13px] font-medium tracking-[0.04em] transition md:px-4 ${
                    active
                      ? "text-[var(--foreground)]"
                      : "text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {link.label}
                  <span
                    className={`absolute inset-x-3 bottom-1.5 h-px md:inset-x-4 ${
                      active ? "bg-[var(--accent)]" : "bg-transparent"
                    }`}
                    aria-hidden
                  />
                </Link>
              );
            })}
            {!isHome ? (
              <Link href="/" className="sf-btn-ghost ml-1 hidden min-h-11 text-xs tracking-[0.06em] md:inline-flex">
                Home
              </Link>
            ) : null}
          </nav>

          {initialized && !isAccount ? (
            <Link
              href={accountHref}
              className={`inline-flex min-h-11 max-w-[7.5rem] items-center truncate px-2 text-[12px] font-semibold tracking-[0.04em] md:max-w-[140px] ${
                user
                  ? "text-[var(--foreground)] hover:text-[var(--accent)]"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
              title={cloudReady ? accountLabel : "Local court — sign in when cloud is configured"}
            >
              {user ? accountLabel : "Sign in"}
            </Link>
          ) : null}

          {user ? (
            <span className="hidden lg:inline-flex">
              <SyncStatusPill compact />
            </span>
          ) : null}

          <CourtStatusChip />

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
