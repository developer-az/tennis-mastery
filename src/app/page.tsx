import Link from "next/link";
import { PLAYERS } from "@/data/players";
import { HomeHeroCtas } from "@/components/home/HomeHeroCtas";
import { HomeProductPlane } from "@/components/home/HomeProductPlane";
import { SiteFooter } from "@/components/layout/SiteFooter";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1">
        <section className="relative overflow-hidden px-6 pb-16 pt-20 md:px-10 md:pb-24 md:pt-24 lg:px-14">
          <div className="sf-hero-wash pointer-events-none absolute inset-0" aria-hidden />
          <div className="sf-hero-grid pointer-events-none absolute inset-0" aria-hidden />

          <div className="relative z-10 mx-auto grid w-full max-w-[1400px] items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            <div className="max-w-2xl">
              <p className="sf-kicker sf-rise">Your court · your mold · your accountability</p>
              <p
                className="sf-rise mt-5 font-[family-name:var(--font-display)] text-5xl font-semibold leading-[0.92] tracking-tight text-[var(--foreground)] md:text-7xl lg:text-[5.25rem]"
                style={{ animationDelay: "0.06s" }}
              >
                STROKEFORM
              </p>
              <h1
                className="sf-rise mt-6 max-w-xl text-xl leading-snug text-[var(--foreground)] md:text-2xl md:leading-snug"
                style={{ animationDelay: "0.14s" }}
              >
                Scrub elite stroke rails in 3D, mold the bag with the same physics, and keep every
                change honest to how you play.
              </h1>
              <p
                className="sf-rise mt-4 max-w-lg text-[15px] leading-relaxed text-[var(--muted)] md:text-base"
                style={{ animationDelay: "0.2s" }}
              >
                Skill spans, quirks, and one-lever decisions — not a blank journal or a one-tap
                gadget. Specs advise; logged feel decides.
              </p>
              <HomeHeroCtas />
            </div>

            <div className="sf-rise" style={{ animationDelay: "0.22s" }}>
              <HomeProductPlane />
            </div>
          </div>
        </section>

        <section className="border-y border-[var(--line)] bg-[var(--bg-sunken)]/80">
          <div className="mx-auto grid max-w-[1400px] grid-cols-2 gap-px bg-[var(--line)] md:grid-cols-4">
            {[
              ["Form lab", "Phase cues · signature quirks"],
              ["Gear intelligence", "Skill span · verified sources"],
              ["Your court", "Bag, sessions, one-lever history"],
              ["Accountability", "Bed hours · pending decisions"],
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
                Rails you can scrub.
                <br />
                Mold you can own.
              </h2>
            </div>
            <p className="max-w-2xl text-[15px] leading-relaxed text-[var(--muted)] md:text-base">
              Strokeform encodes published tennis biomechanics — racket speeds, spin rates, X-factor
              separation, proximal-to-distal lag, and phase timing — into keyframed joint trajectories.
              The same mold language drives gear: launch, path, skill span, and quirks that tell you
              what to own on court.
            </p>
          </div>
          <div className="mt-14 grid gap-0 border-t border-[var(--line)] md:grid-cols-3">
            {[
              {
                title: "Measured phases",
                body: "Ready → unit turn → backswing → acceleration → contact → follow-through, with duration and a coaching cue on every frame.",
              },
              {
                title: "Live joint readout",
                body: "Elbow flexion, knee bend, trunk rotation, and shoulder IR update as you scrub — the degrees of freedom coaches film in slow motion.",
              },
              {
                title: "Signature quirks",
                body: "Consistency CVs and mechanical fingerprints show what stays stable — and what makes each athlete unique.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="border-[var(--line)] py-8 md:border-r md:px-8 md:py-10 md:first:pl-0 md:last:border-r-0 md:last:pr-0"
              >
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
                    className="group flex flex-col gap-3 py-6 transition hover:bg-[var(--overlay-hover)] md:flex-row md:items-center md:justify-between md:gap-8 md:px-2"
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
            Multi-source intelligence on the same mold as your court.
          </h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[var(--muted)]">
            Compare frames and beds to what you&apos;ve logged. Skill span, quirks, and verified vs
            modeled sources — then place lead tape and watch leave and path shift before you buy.
          </p>
          <div className="mt-12 grid gap-px bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Rackets",
                body: "Skill span, archetypes, and vs-your-setup launch and swing deltas.",
                href: "/gear?tab=rackets",
              },
              {
                title: "Strings",
                body: "Pocket, bite, board — learn a category, then compare to your tested bed.",
                href: "/gear?tab=strings",
              },
              {
                title: "Grips",
                body: "Tourna dry, Pro thin, leather — stacked against your size and feel.",
                href: "/gear?tab=grips",
              },
              {
                title: "Lead tape",
                body: "Tip, 3/9, neck, or handle — SW, balance, and leave change in one map.",
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
              Open your court
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
