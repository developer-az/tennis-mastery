"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { SyncStatusPill } from "@/components/auth/SyncStatusPill";
import { CourtStatusChip } from "@/components/layout/CourtStatusChip";
import { authDisplayLabel, useAuthStore } from "@/store/authStore";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { PRIMARY_NAV } from "@/lib/nav";

export function AppHeader() {
  const pathname = usePathname() ?? "/";
  const isHome = pathname === "/";
  const isAccount = pathname.startsWith("/account");
  const productPath = PRIMARY_NAV.some((l) => l.match(pathname));

  const initialized = useAuthStore((s) => s.initialized);
  const user = useAuthStore((s) => s.user);
  const account = useAuthStore((s) => s.account);
  const cloudReady = isSupabaseConfigured();

  const accountHref = user ? "/account" : "/account/login";
  const accountLabel = user ? authDisplayLabel(account, user) : "Sign in";

  return (
    <header
      className={`sf-header sticky top-0 z-50 shrink-0 ${isHome ? "sf-header-home" : ""}`}
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        height: "var(--header-h)",
      }}
    >
      <div className="mx-auto flex h-[var(--header-bar)] w-full max-w-[var(--page-max)] items-center justify-between gap-3 px-[max(1rem,env(safe-area-inset-left))] md:max-w-[var(--page-max-wide)] md:px-8">
        <Link href="/" className="sf-nav-brand group flex min-w-0 items-center gap-3">
          <span className="sf-nav-mark" aria-hidden>
            RF
          </span>
          <span className="min-w-0">
            <span className="block font-[family-name:var(--font-display)] text-[15px] font-bold tracking-[0.06em] text-[var(--foreground)] transition group-hover:text-[var(--accent)] md:text-base">
              Racket Form
            </span>
            <span className="mt-0.5 hidden text-[10px] tracking-[0.14em] text-[var(--muted)] uppercase sm:block">
              Lab · Gear · You
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-0.5 sm:gap-1">
          <nav
            className={`${productPath ? "hidden md:flex" : "flex"} items-center gap-0.5 sm:gap-1`}
            aria-label="Primary"
          >
            {PRIMARY_NAV.map((link) => {
              const active = link.match(pathname);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`sf-nav-link ${active ? "sf-nav-link-active" : ""}`}
                >
                  {link.label}
                </Link>
              );
            })}
            {!isHome ? (
              <Link
                href="/"
                className="sf-btn-ghost ml-1 hidden min-h-11 items-center text-xs tracking-[0.06em] md:inline-flex"
              >
                Home
              </Link>
            ) : null}
          </nav>

          {initialized && !isAccount ? (
            <Link
              href={accountHref}
              className={`sf-nav-account inline-flex min-h-11 max-w-[7.5rem] items-center truncate px-2 text-[12px] font-semibold tracking-[0.04em] transition md:max-w-[140px] ${
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
