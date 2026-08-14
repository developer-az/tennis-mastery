import Link from "next/link";
import { PLAYERS } from "@/data/players";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-5 md:px-10">
        <Link href="/" className="font-[family-name:var(--font-display)] text-lg tracking-tight">
          STROKEFORM
        </Link>
        <nav className="flex items-center gap-6 text-sm text-[var(--muted)]">
          <a href="#method" className="transition hover:text-[var(--foreground)]">
            Method
          </a>
          <a href="#athletes" className="transition hover:text-[var(--foreground)]">
            Athletes
          </a>
          <Link href="/profile" className="transition hover:text-[var(--foreground)]">
            Profile
          </Link>
          <Link href="/gear" className="transition hover:text-[var(--foreground)]">
            Gear
          </Link>
          <Link
            href="/lab"
            className="rounded-md bg-[var(--accent)] px-4 py-2 font-medium text-[#0b1a14] transition hover:brightness-110"
          >
            Open lab
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero — brand first, one composition, full-bleed court atmosphere */}
        <section className="relative flex min-h-[min(92vh,900px)] flex-col justify-end overflow-hidden px-6 pb-16 pt-24 md:px-10 md:pb-24">
          <div
            className="pointer-events-none absolute inset-0 opacity-90"
            style={{
              background: `
                linear-gradient(105deg, rgba(7,20,15,0.2) 0%, rgba(7,20,15,0.75) 48%, rgba(7,20,15,0.92) 100%),
                repeating-linear-gradient(
                  -12deg,
                  transparent,
                  transparent 40px,
                  rgba(200,245,96,0.03) 40px,
                  rgba(200,245,96,0.03) 41px
                ),
                radial-gradient(ellipse 80% 70% at 70% 40%, #2d6a4f 0%, transparent 60%),
                radial-gradient(ellipse 50% 40% at 20% 80%, #1b4332 0%, transparent 50%)
              `,
            }}
            aria-hidden
          />
          {/* Abstract court line geometry as visual anchor */}
          <svg
            className="pointer-events-none absolute right-[-5%] top-[8%] h-[75%] w-[70%] opacity-30"
            viewBox="0 0 400 500"
            fill="none"
            aria-hidden
          >
            <rect x="40" y="20" width="320" height="460" stroke="#c8f560" strokeWidth="2" />
            <line x1="80" y1="20" x2="80" y2="480" stroke="#e8efe9" strokeWidth="1.5" opacity="0.5" />
            <line x1="320" y1="20" x2="320" y2="480" stroke="#e8efe9" strokeWidth="1.5" opacity="0.5" />
            <line x1="40" y1="250" x2="360" y2="250" stroke="#e8efe9" strokeWidth="2" />
            <line x1="80" y1="140" x2="320" y2="140" stroke="#e8efe9" strokeWidth="1" opacity="0.6" />
            <line x1="80" y1="360" x2="320" y2="360" stroke="#e8efe9" strokeWidth="1" opacity="0.6" />
            <line x1="200" y1="140" x2="200" y2="360" stroke="#e8efe9" strokeWidth="1" opacity="0.6" />
            <circle cx="200" cy="250" r="4" fill="#c8f560">
              <animate attributeName="opacity" values="0.4;1;0.4" dur="3s" repeatCount="indefinite" />
            </circle>
          </svg>

          <div className="relative z-10 max-w-2xl">
            <p
              className="font-[family-name:var(--font-display)] text-5xl leading-[0.95] tracking-tight md:text-7xl lg:text-8xl"
              style={{ animation: "rise 0.9s ease-out both" }}
            >
              STROKEFORM
            </p>
            <h1
              className="mt-5 max-w-lg text-xl leading-snug text-[var(--foreground)]/90 md:text-2xl"
              style={{ animation: "rise 0.9s ease-out 0.12s both" }}
            >
              Elite tennis biomechanics, mapped into interactive 3D form.
            </h1>
            <p
              className="mt-4 max-w-md text-base leading-relaxed text-[var(--muted)]"
              style={{ animation: "rise 0.9s ease-out 0.22s both" }}
            >
              Joint angles, kinetic-chain timing, spin, and racket-path statistics from the
              world&apos;s best — scrub every phase of the stroke and learn what makes each
              player consistent.
            </p>
            <div
              className="mt-8 flex flex-wrap gap-3"
              style={{ animation: "rise 0.9s ease-out 0.32s both" }}
            >
              <Link
                href="/lab"
                className="rounded-md bg-[var(--accent)] px-6 py-3 font-medium text-[#0b1a14] transition hover:brightness-110"
              >
                Enter the lab
              </Link>
              <Link
                href="/gear"
                className="rounded-md px-6 py-3 text-[var(--foreground)] transition hover:bg-white/5"
                style={{ boxShadow: "0 0 0 1px var(--line)" }}
              >
                Explore gear
              </Link>
            </div>
          </div>
        </section>

        <section id="method" className="border-t border-[var(--line)] px-6 py-20 md:px-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            Method
          </p>
          <h2 className="mt-3 max-w-xl font-[family-name:var(--font-display)] text-3xl tracking-tight md:text-4xl">
            Science first. Then the 3D body.
          </h2>
          <p className="mt-4 max-w-2xl text-[var(--muted)] leading-relaxed">
            Strokeform encodes published tennis biomechanics — racket speeds, spin rates,
            X-factor separation, proximal-to-distal lag, and phase timing — into keyframed
            joint trajectories. Those trajectories drive a real-scale skeletal model so you
            can orbit the court and see why a Nadal forehand kicks or a Serena serve detonates.
          </p>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {[
              {
                title: "Measured phases",
                body: "Ready → unit turn → backswing/trophy → acceleration → contact → follow-through, with duration and coaching cues per phase.",
              },
              {
                title: "Live joint readout",
                body: "Elbow flexion, knee bend, trunk rotation, and shoulder internal rotation update as you scrub — the same DOFs coaches film in slow-mo.",
              },
              {
                title: "Player quirks",
                body: "Consistency CVs, path reproducibility, and signature mechanical quirks show what stays stable — and what makes each athlete unique.",
              },
            ].map((item, i) => (
              <div
                key={item.title}
                className="border-t border-[var(--line)] pt-5"
                style={{ animation: `rise 0.7s ease-out ${0.1 * i}s both` }}
              >
                <h3 className="font-[family-name:var(--font-display)] text-lg tracking-tight">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="athletes" className="border-t border-[var(--line)] px-6 py-20 md:px-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            Athletes
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl tracking-tight md:text-4xl">
            Five models. Distinct mechanics.
          </h2>
          <ul className="mt-10 divide-y divide-[var(--line)]">
            {PLAYERS.map((p) => (
              <li key={p.id} className="flex flex-col gap-2 py-6 md:flex-row md:items-baseline md:justify-between">
                <div>
                  <Link
                    href={`/lab?player=${p.id}`}
                    className="font-[family-name:var(--font-display)] text-xl tracking-tight transition hover:text-[var(--accent)]"
                  >
                    {p.name}
                  </Link>
                  <p className="text-sm text-[var(--muted)]">
                    {p.nationality} · {p.era}
                  </p>
                </div>
                <div className="md:text-right">
                  <p className="max-w-md text-sm text-[var(--foreground)]/80">
                    {p.playingStyle}
                  </p>
                  <Link
                    href={`/lab?player=${p.id}`}
                    className="mt-2 inline-block text-xs font-medium text-[var(--accent)] transition hover:brightness-110"
                  >
                    Open in lab →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
          <Link
            href="/lab"
            className="mt-8 inline-block rounded-md bg-[var(--accent)] px-6 py-3 font-medium text-[#0b1a14] transition hover:brightness-110"
          >
            Compare them in 3D
          </Link>
        </section>

        <section id="gear" className="border-t border-[var(--line)] px-6 py-20 md:px-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            Gear lab
          </p>
          <h2 className="mt-3 max-w-xl font-[family-name:var(--font-display)] text-3xl tracking-tight md:text-4xl">
            Rackets, strings, grips, and lead tape — finally visual.
          </h2>
          <p className="mt-4 max-w-2xl text-[var(--muted)] leading-relaxed">
            Compare new gear to what you have already tested. Filter down to poly 1.30, browse
            product portraits, and place virtual lead tape to see launch and swing-path shifts.
          </p>
          <div className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Modern rackets",
                body: "Live Racqix specs with portraits, filters, and vs-my-setup launch and swing deltas.",
                href: "/gear?tab=rackets",
              },
              {
                title: "String beds",
                body: "Material, gauge, and shape filters — learn a category, then compare to your tested bed.",
                href: "/gear?tab=strings",
              },
              {
                title: "Overgrips & bases",
                body: "What makes Tourna dry, Wilson Pro thin, leather connected — compared to your grip.",
                href: "/gear?tab=grips",
              },
              {
                title: "Lead tape",
                body: "Place virtual strips on tip, 3/9, throat, or handle and watch swingweight and launch change.",
                href: "/gear?tab=lead-tape",
              },
            ].map((item, i) => (
              <Link
                key={item.title}
                href={item.href}
                className="border-t border-[var(--line)] pt-5 transition hover:border-[var(--accent)]/40"
                style={{ animation: `rise 0.7s ease-out ${0.1 * i}s both` }}
              >
                <h3 className="font-[family-name:var(--font-display)] text-lg tracking-tight">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{item.body}</p>
                <p className="mt-3 text-xs font-medium text-[var(--accent)]">Open →</p>
              </Link>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/gear?tab=overview"
              className="inline-block rounded-md bg-[var(--accent)] px-6 py-3 font-medium text-[#0b1a14] transition hover:brightness-110"
            >
              Combined setup readout
            </Link>
            <Link
              href="/gear?tab=rackets"
              className="inline-block rounded-md px-6 py-3 text-[var(--foreground)] transition hover:bg-white/5"
              style={{ boxShadow: "0 0 0 1px var(--line)" }}
            >
              Browse rackets
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--line)] px-6 py-8 text-xs text-[var(--muted)] md:px-10">
        <p>
          Strokeform synthesizes values from peer-reviewed tennis biomechanics literature
          (Elliott, Reid, Fleisig, Bahamonde, ITF) and match-tracking spin/speed ranges.
          Figures are coaching-grade reconstructions, not proprietary motion-capture of a
          single session.
        </p>
        <p className="mt-2">© {new Date().getFullYear()} Strokeform</p>
      </footer>

      <style>{`
        @keyframes rise {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
