import Link from "next/link";
import { PLAYERS } from "@/data/players";
import { HomeHeroCtas } from "@/components/home/HomeHeroCtas";
import { SiteFooter } from "@/components/layout/SiteFooter";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1">
        <section className="relative flex min-h-[min(88vh,860px)] flex-col justify-end overflow-hidden px-6 pb-16 pt-28 md:px-10 md:pb-24 lg:px-14">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: `
                linear-gradient(100deg, rgba(6,17,13,0.15) 0%, rgba(6,17,13,0.72) 52%, rgba(6,17,13,0.94) 100%),
                radial-gradient(ellipse 70% 60% at 72% 38%, rgba(31,92,67,0.55) 0%, transparent 62%),
                radial-gradient(ellipse 45% 35% at 18% 78%, rgba(15,45,32,0.8) 0%, transparent 55%),
                linear-gradient(180deg, #0a1812 0%, #06110d 100%)
              `,
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(238,243,239,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(238,243,239,0.5) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
              maskImage: "radial-gradient(ellipse 80% 70% at 70% 40%, black, transparent)",
            }}
            aria-hidden
          />
          <svg
            className="pointer-events-none absolute right-[-2%] top-[10%] hidden h-[72%] w-[58%] opacity-[0.22] lg:block"
            viewBox="0 0 400 500"
            fill="none"
            aria-hidden
          >
            <rect x="48" y="28" width="304" height="444" stroke="currentColor" className="text-[var(--accent)]" strokeWidth="1.5" />
            <line x1="88" y1="28" x2="88" y2="472" stroke="#eef3ef" strokeWidth="1" opacity="0.45" />
            <line x1="312" y1="28" x2="312" y2="472" stroke="#eef3ef" strokeWidth="1" opacity="0.45" />
            <line x1="48" y1="250" x2="352" y2="250" stroke="#eef3ef" strokeWidth="1.5" />
            <line x1="88" y1="145" x2="312" y2="145" stroke="#eef3ef" strokeWidth="1" opacity="0.5" />
            <line x1="88" y1="355" x2="312" y2="355" stroke="#eef3ef" strokeWidth="1" opacity="0.5" />
            <line x1="200" y1="145" x2="200" y2="355" stroke="#eef3ef" strokeWidth="1" opacity="0.45" />
          </svg>

          <div className="relative z-10 mx-auto w-full max-w-[1400px]">
            <div className="max-w-2xl">
              <p className="sf-kicker sf-rise">Professional tennis intelligence</p>
              <p
                className="sf-rise mt-5 font-[family-name:var(--font-display)] text-5xl font-semibold leading-[0.92] tracking-tight md:text-7xl lg:text-[5.5rem]"
                style={{ animationDelay: "0.06s" }}
              >
                STROKEFORM
              </p>
              <h1
                className="sf-rise mt-6 max-w-xl text-xl leading-snug text-[var(--foreground)]/92 md:text-2xl md:leading-snug"
                style={{ animationDelay: "0.14s" }}
              >
                Form and gear, built like a tour product — not a classroom demo.
              </h1>
              <p
                className="sf-rise mt-4 max-w-lg text-[15px] leading-relaxed text-[var(--muted)] md:text-base"
                style={{ animationDelay: "0.2s" }}
              >
                Scrub elite stroke models in 3D, mold your bag with the same physics, and keep every
                change accountable to how you actually play.
              </p>
              <HomeHeroCtas />
            </div>
          </div>
        </section>

        <section className="border-y border-[var(--line)] bg-[var(--bg-sunken)]/80">
          <div className="mx-auto grid max-w-[1400px] grid-cols-2 gap-px bg-[var(--line)] md:grid-cols-4">
            {[
              ["3D form lab", "Phase-scrubbed biomechanics"],
              ["Gear molding", "Rackets · strings · tape"],
              ["Your court", "Bag, sessions, decisions"],
              ["Science-backed", "Literature-grade models"],
            ].map(([title, sub]) => (
              <div key={title} className="bg-[var(--background)] px-5 py-5 md:px-8 md:py-6">
                <p className="text-sm font-semibold tracking-tight text-[var(--foreground)]">{title}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">{sub}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="method" className="mx-auto w-full max-w-[1400px] px-6 py-20 md:px-10 md:py-24 lg:px-14">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="sf-kicker">Method</p>
              <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight md:text-4xl">
                Science first.
                <br />
                Then the body.
              </h2>
            </div>
            <p className="max-w-2xl text-[15px] leading-relaxed text-[var(--muted)] md:text-base">
              Strokeform encodes published tennis biomechanics — racket speeds, spin rates, X-factor
              separation, proximal-to-distal lag, and phase timing — into keyframed joint trajectories.
              Those trajectories drive a real-scale skeletal model so you can orbit the court and see
              why a kick topspin holds or a first serve detonates.
            </p>
          </div>
          <div className="mt-14 grid gap-0 border-t border-[var(--line)] md:grid-cols-3">
            {[
              {
                title: "Measured phases",
                body: "Ready → unit turn → backswing → acceleration → contact → follow-through, with duration and coaching cues per phase.",
              },
              {
                title: "Live joint readout",
                body: "Elbow flexion, knee bend, trunk rotation, and shoulder IR update as you scrub — the same degrees of freedom coaches film in slow motion.",
              },
              {
                title: "Player signatures",
                body: "Consistency CVs, path reproducibility, and mechanical quirks show what stays stable — and what makes each athlete unique.",
              },
            ].map((item) => (
              <div key={item.title} className="border-[var(--line)] py-8 md:border-r md:px-8 md:py-10 md:first:pl-0 md:last:border-r-0 md:last:pr-0">
                <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="athletes" className="border-t border-[var(--line)] bg-[var(--bg-sunken)]/50">
          <div className="mx-auto w-full max-w-[1400px] px-6 py-20 md:px-10 md:py-24 lg:px-14">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="sf-kicker">Athletes</p>
                <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight md:text-4xl">
                  Models with distinct mechanics
                </h2>
              </div>
              <Link href="/lab" className="sf-btn sf-btn-secondary text-xs">
                Open form lab
              </Link>
            </div>
            <ul className="mt-12 divide-y divide-[var(--line)] border-y border-[var(--line)]">
              {PLAYERS.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/lab?player=${p.id}`}
                    className="group flex flex-col gap-3 py-6 transition hover:bg-white/[0.02] md:flex-row md:items-center md:justify-between md:gap-8 md:px-2"
                  >
                    <div className="min-w-0">
                      <p className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight transition group-hover:text-[var(--accent)] md:text-2xl">
                        {p.name}
                      </p>
                      <p className="mt-1 text-xs tracking-[0.1em] text-[var(--muted)] uppercase">
                        {p.nationality} · {p.era}
                      </p>
                    </div>
                    <p className="max-w-xl text-sm leading-relaxed text-[var(--foreground)]/75 md:text-right">
                      {p.playingStyle}
                    </p>
                    <span className="text-xs font-semibold tracking-[0.08em] text-[var(--accent)] uppercase md:shrink-0">
                      View →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="gear" className="mx-auto w-full max-w-[1400px] px-6 py-20 md:px-10 md:py-24 lg:px-14">
          <p className="sf-kicker">Gear lab</p>
          <h2 className="mt-4 max-w-2xl font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight md:text-4xl">
            Rackets, strings, grips, and lead tape — with the same mold physics.
          </h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[var(--muted)]">
            Compare new gear to what you have already tested. Filter by gauge and feel, place virtual
            lead tape, and see launch and swing-path shifts before you buy.
          </p>
          <div className="mt-12 grid gap-px bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Rackets",
                body: "Live specs, portraits, filters, and vs-your-setup launch and swing deltas.",
                href: "/gear?tab=rackets",
              },
              {
                title: "Strings",
                body: "Material, gauge, and shape — learn a category, then compare to your tested bed.",
                href: "/gear?tab=strings",
              },
              {
                title: "Grips",
                body: "Tourna dry, Pro thin, leather — compared against your stack and grip size.",
                href: "/gear?tab=grips",
              },
              {
                title: "Lead tape",
                body: "Place tip, 3/9, throat, or handle mass and watch SW, balance, and leave change.",
                href: "/gear?tab=lead-tape",
              },
            ].map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="group flex flex-col bg-[var(--background)] p-6 transition hover:bg-[var(--panel)] md:p-8"
              >
                <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight transition group-hover:text-[var(--accent)]">
                  {item.title}
                </h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--muted)]">{item.body}</p>
                <p className="mt-6 text-xs font-semibold tracking-[0.1em] text-[var(--accent)] uppercase">
                  Open
                </p>
              </Link>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/you" className="sf-btn sf-btn-primary">
              Set up your bag
            </Link>
            <Link href="/gear?tab=rackets" className="sf-btn sf-btn-secondary">
              Browse rackets
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
