"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/you", label: "You", match: (p: string) => p === "/you" || p.startsWith("/profile") },
  { href: "/lab", label: "Lab", match: (p: string) => p === "/lab" || p.startsWith("/lab/") },
  { href: "/gear", label: "Gear", match: (p: string) => p === "/gear" || p.startsWith("/gear/") },
] as const;

function showOnPath(pathname: string): boolean {
  return LINKS.some((l) => l.match(pathname));
}

export function MobileAppNav() {
  const pathname = usePathname() ?? "/";
  const visible = showOnPath(pathname);

  useEffect(() => {
    document.documentElement.dataset.appNav = visible ? "on" : "off";
    return () => {
      delete document.documentElement.dataset.appNav;
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <nav className="sf-app-nav" aria-label="Primary">
      {LINKS.map((link) => {
        const active = link.match(pathname);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className="sf-app-nav-link"
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
