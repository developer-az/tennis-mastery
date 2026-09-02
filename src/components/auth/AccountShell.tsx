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
    <div className="sf-page flex max-w-[1040px] flex-col gap-10 md:flex-row md:items-start md:gap-14">
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
          By creating an account you agree to store your coaching profile securely for sync across
          devices. Strokeform runs the same mold and rule engines whether you&apos;re signed in or
          playing on this device.
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
    <div className="sf-alert sf-alert-accent mb-6" role="status">
      <p className="font-semibold">Playing on this device</p>
      <p className="mt-1 text-[var(--muted)]">
        Cloud sync isn&apos;t enabled on this deployment yet. Your bag and profile still save in
        this browser — sign in later when sync is available.
      </p>
      <Link href="/you" className="sf-text-link mt-2 inline-block">
        Continue without signing in →
      </Link>
    </div>
  );
}
