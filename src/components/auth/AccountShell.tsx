import Link from "next/link";

const BENEFITS = [
  {
    title: "Your court, everywhere",
    body: "Bag, grips, sessions, and one-lever history sync across devices when you're signed in.",
  },
  {
    title: "Faster return visits",
    body: "Skip re-entering your setup — Strokeform remembers what you play and what you changed.",
  },
  {
    title: "Still works offline",
    body: "Local storage keeps your court on this browser. Cloud sync is optional backup when configured.",
  },
] as const;

export function AccountShell({
  title,
  subtitle,
  children,
  alternate,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  alternate?: { prompt: string; href: string; label: string };
}) {
  return (
    <div className="mx-auto flex w-full max-w-[1040px] flex-col gap-10 px-5 py-10 md:flex-row md:items-start md:gap-14 md:px-8 md:py-16">
      <aside className="md:w-[42%] md:pt-2">
        <p className="sf-kicker">Strokeform account</p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-[2rem]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--muted)]">{subtitle}</p>
        ) : null}
        <ul className="mt-8 space-y-5">
          {BENEFITS.map((b) => (
            <li key={b.title} className="border-l-2 border-[var(--accent)]/45 pl-4">
              <p className="text-sm font-semibold text-[var(--foreground)]">{b.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{b.body}</p>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-xs leading-relaxed text-[var(--muted)]">
          By creating an account you agree to store your coaching profile in your connected
          database. No LLM — same rule engines as the local app.
        </p>
      </aside>

      <div className="sf-auth-card sf-rise md:min-w-0 md:flex-1">
        {children}
        {alternate ? (
          <p className="mt-6 border-t border-[var(--line)] pt-5 text-center text-sm text-[var(--muted)]">
            {alternate.prompt}{" "}
            <Link href={alternate.href} className="sf-text-link">
              {alternate.label}
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function CloudUnavailableBanner() {
  return (
    <div
      className="mb-6 border border-[var(--line)] bg-[var(--accent-dim)] px-4 py-3 text-sm leading-relaxed text-[var(--foreground)]"
      role="status"
    >
      <p className="font-semibold">Playing locally on this device</p>
      <p className="mt-1 text-[var(--muted)]">
        Cloud accounts need Supabase env vars (<code className="text-xs">.env.local</code>).
        Your bag and profile still save in this browser.
      </p>
      <Link href="/you" className="sf-text-link mt-2 inline-block">
        Continue without signing in →
      </Link>
    </div>
  );
}
