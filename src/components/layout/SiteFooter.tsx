import Link from "next/link";

export function SiteFooter({ note }: { note?: string }) {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto border-t border-[var(--line)] bg-[var(--bg-sunken)]">
      <div className="mx-auto grid w-full max-w-[1400px] gap-10 px-6 py-12 md:grid-cols-[1.4fr_1fr_1fr] md:px-10 md:py-14">
        <div>
          <p className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-[0.12em]">
            STROKEFORM
          </p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-[var(--muted)]">
            Coaching-grade tennis form and gear intelligence — biomechanics you can scrub,
            setups you can mold, decisions you can trust.
          </p>
        </div>
        <div>
          <p className="sf-kicker !text-[var(--muted)]">Product</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link href="/you" className="text-[var(--foreground)]/85 transition hover:text-[var(--accent)]">
                Your court
              </Link>
            </li>
            <li>
              <Link href="/lab" className="text-[var(--foreground)]/85 transition hover:text-[var(--accent)]">
                Form lab
              </Link>
            </li>
            <li>
              <Link href="/gear" className="text-[var(--foreground)]/85 transition hover:text-[var(--accent)]">
                Gear lab
              </Link>
            </li>
            <li>
              <Link href="/account" className="text-[var(--foreground)]/85 transition hover:text-[var(--accent)]">
                Account
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="sf-kicker !text-[var(--muted)]">Method</p>
          <p className="mt-4 text-sm leading-relaxed text-[var(--muted)]">
            {note ??
              "Synthesized from peer-reviewed tennis biomechanics and match-tracking ranges. Coaching reconstructions — not a single-session mocap certificate."}
          </p>
        </div>
      </div>
      <div className="border-t border-[var(--line)]">
        <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-2 px-6 py-4 text-[11px] text-[var(--muted)] md:px-10">
          <p>© {year} Strokeform</p>
          <p className="tracking-[0.08em] uppercase">Built for serious players</p>
        </div>
      </div>
    </footer>
  );
}
