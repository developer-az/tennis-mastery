"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import type { ForehandGripKind } from "@/lib/equipment/forehandMold";
import type { BackhandGripKind } from "@/types/playerProfile";
import type { GripProfile, RacketProfile, StringProfile } from "@/types/equipment";
import { usePlayerStore } from "@/store/playerStore";
import { hasAnyGear, setupSummary, useGearStore } from "@/store/gearStore";
import { synthesizeCombinedSetup } from "@/lib/equipment/setupSynthesis";
import { prefersArmFriendlySetup } from "@/lib/player/constraints";
import {
  CONSTRAINT_TEMPLATES,
  WIZARD_STEPS,
  fhGripLabel,
  gripPreviewLine,
} from "@/lib/player/onboarding";
import { GearPickerSheet, type PickerKind } from "./GearPickerSheet";

const FH: { id: ForehandGripKind; label: string; hint: string }[] = [
  { id: "eastern", label: "Eastern", hint: "Flatter, earlier contact" },
  { id: "semi-western", label: "Semi-western", hint: "Most common modern FH" },
  { id: "western", label: "Western", hint: "Heavy topspin, high balls" },
  { id: "extreme-western", label: "Extreme western", hint: "Very closed face" },
];

const BH: { id: BackhandGripKind; label: string; hint: string }[] = [
  { id: "one-hand-from-sw", label: "One-hander off my FH", hint: "Face comes from the semi-western" },
  { id: "one-hand-eastern", label: "One-hand eastern", hint: "Classic 1HBH" },
  { id: "two-hand-eastern", label: "Two-hand eastern", hint: "Stable two-hander" },
  { id: "two-hand-semi", label: "Two-hand semi", hint: "Higher-bouncing two-hander" },
];

export function SetupWizard({
  rackets,
  strings,
  grips,
}: {
  rackets: RacketProfile[];
  strings: StringProfile[];
  grips: GripProfile[];
}) {
  const step = usePlayerStore((s) => s.onboardingStep);
  const setStep = usePlayerStore((s) => s.setOnboardingStep);
  const complete = usePlayerStore((s) => s.completeOnboarding);
  const adoptExample = usePlayerStore((s) => s.adoptExampleProfile);
  const profile = usePlayerStore((s) => s.profile);
  const setDisplayName = usePlayerStore((s) => s.setDisplayName);
  const setGrips = usePlayerStore((s) => s.setGrips);
  const setPreferences = usePlayerStore((s) => s.setPreferences);
  const upsertConstraint = usePlayerStore((s) => s.upsertConstraint);
  const removeConstraint = usePlayerStore((s) => s.removeConstraint);
  const setup = useGearStore((s) => s.setup);

  const [picker, setPicker] = useState<PickerKind | null>(null);
  const [nameDraft, setNameDraft] = useState(profile.displayName);

  const go = (n: number) => setStep(Math.min(WIZARD_STEPS.length - 1, Math.max(0, n)));
  const next = () => {
    if (step >= WIZARD_STEPS.length - 1) complete();
    else go(step + 1);
  };

  const preview = gripPreviewLine(profile.grips.forehand);
  const insight = useMemo(
    () =>
      synthesizeCombinedSetup(setup, null, null, null, [], {
        playerGrip: profile.grips.forehand,
        armFriendly: prefersArmFriendlySetup(profile),
      }),
    [setup, profile],
  );

  const bodyActive = (id: string) => profile.constraints.some((c) => c.id === id && c.active);

  const toggleBody = (key: keyof typeof CONSTRAINT_TEMPLATES) => {
    const t = CONSTRAINT_TEMPLATES[key];
    if (bodyActive(t.id)) {
      removeConstraint(t.id);
      return;
    }
    upsertConstraint(t);
    if (key === "elbow") setPreferences({ prefersArmFriendly: true });
  };

  const id = WIZARD_STEPS[step] ?? "welcome";

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[var(--background)]">
      <div className="flex items-center justify-between px-5 py-4 md:px-10">
        <p className="font-[family-name:var(--font-display)] text-sm tracking-tight">STROKEFORM</p>
        {id !== "welcome" && id !== "payoff" ? (
          <button type="button" onClick={next} className="text-sm text-[var(--muted)]">
            Skip
          </button>
        ) : (
          <span className="text-sm text-[var(--muted)]">Setup</span>
        )}
      </div>

      <div className="flex justify-center gap-1.5 px-5">
        {WIZARD_STEPS.map((s, i) => (
          <span
            key={s}
            className="h-1.5 w-6 rounded-full"
            style={{ background: i <= step ? "var(--accent)" : "var(--line-strong)" }}
          />
        ))}
      </div>

      <div className="relative mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col px-5 py-8 md:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={id}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="flex min-h-0 flex-1 flex-col"
          >
            {id === "welcome" && (
              <Step title="We’ll remember your game." subtitle="So you don’t start from zero every time you open the app.">
                <p className="text-sm leading-relaxed text-[var(--muted)]">
                  A few questions. Then we show your grip, your bag, and what the numbers mean —
                  not a blank journal.
                </p>
                <button
                  type="button"
                  onClick={next}
                  className="mt-8 w-full rounded-md bg-[var(--accent)] py-3.5 text-sm font-medium text-[var(--accent-ink)]"
                >
                  Let’s go
                </button>
                <button
                  type="button"
                  onClick={() => adoptExample()}
                  className="mt-3 w-full py-2 text-sm text-[var(--muted)]"
                >
                  Use a sample player
                </button>
              </Step>
            )}

            {id === "name" && (
              <Step title="What should we call you?" subtitle="Optional — skip if you want.">
                <input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onBlur={() => setDisplayName(nameDraft)}
                  placeholder="Your name"
                  className="w-full rounded-md border border-[var(--line)] bg-[var(--bg-sunken)] px-4 py-3 text-base outline-none focus:border-[var(--accent)]"
                />
                <Primary onClick={() => { setDisplayName(nameDraft); next(); }}>Continue</Primary>
              </Step>
            )}

            {id === "forehand" && (
              <Step title="Your forehand grip" subtitle="This sets face angle in the lab — not a generic pro.">
                <div className="grid gap-2">
                  {FH.map((g) => (
                    <Choice
                      key={g.id}
                      active={profile.grips.forehand === g.id}
                      title={g.label}
                      hint={g.hint}
                      onClick={() => setGrips({ forehand: g.id })}
                    />
                  ))}
                </div>
                {preview && (
                  <p className="mt-4 rounded-md border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-3 py-2 text-sm">
                    {preview}
                  </p>
                )}
                <Primary onClick={next} disabled={!profile.grips.forehand}>
                  Continue
                </Primary>
              </Step>
            )}

            {id === "backhand" && (
              <Step title="Backhand" subtitle="One pick. You can change it later.">
                <div className="grid gap-2">
                  {BH.map((g) => (
                    <Choice
                      key={g.id}
                      active={profile.grips.backhand === g.id}
                      title={g.label}
                      hint={g.hint}
                      onClick={() =>
                        setGrips({
                          backhand: g.id,
                          backhandNote:
                            g.id === "one-hand-from-sw"
                              ? "One-hander off the back of the forehand grip — face is grip-derived."
                              : "",
                          serve: profile.grips.serve ?? "continental",
                          slice: profile.grips.slice ?? "continental",
                        })
                      }
                    />
                  ))}
                </div>
                <Primary onClick={next}>Continue</Primary>
              </Step>
            )}

            {id === "body" && (
              <Step
                title="Anything the bag must respect?"
                subtitle="We’ll warn you before a stiff frame or high-tension poly fights this."
              >
                <div className="grid gap-2">
                  <Choice
                    active={bodyActive("c-elbow")}
                    title="Elbow talks"
                    hint="Prefer arm-friendly frames and moderate poly"
                    onClick={() => toggleBody("elbow")}
                  />
                  <Choice
                    active={bodyActive("c-skin")}
                    title="Fragile / sensitive skin"
                    hint="Softer overgrip stacks, watch shaped poly"
                    onClick={() => toggleBody("skin")}
                  />
                  <Choice
                    active={bodyActive("c-blisters")}
                    title="Recurring blisters"
                    hint="We’ll match grip build on both frames"
                    onClick={() => toggleBody("blisters")}
                  />
                  <Choice
                    active={
                      !bodyActive("c-elbow") && !bodyActive("c-skin") && !bodyActive("c-blisters")
                    }
                    title="None of these"
                    hint="You can add constraints later"
                    onClick={() => {
                      removeConstraint("c-elbow");
                      removeConstraint("c-skin");
                      removeConstraint("c-blisters");
                    }}
                  />
                </div>
                {bodyActive("c-elbow") && (
                  <p className="mt-4 text-sm text-[var(--muted)]">
                    We’ll refuse stiff + high full poly without a warning.
                  </p>
                )}
                <Primary onClick={next}>Continue</Primary>
              </Step>
            )}

            {id === "prefs" && (
              <Step title="What you care about" subtitle="We’ll protect these when recommending.">
                <div className="grid gap-2">
                  <Choice
                    active={profile.preferences.generatesOwnPower}
                    title="I generate my own power"
                    hint="Don’t chase a stiff power frame"
                    onClick={() =>
                      setPreferences({ generatesOwnPower: !profile.preferences.generatesOwnPower })
                    }
                  />
                  <Choice
                    active={profile.preferences.valuesDurability}
                    title="Durability and reps"
                    hint="Beds that last matter more than peak pop"
                    onClick={() =>
                      setPreferences({ valuesDurability: !profile.preferences.valuesDurability })
                    }
                  />
                  <Choice
                    active={profile.preferences.likesDampener}
                    title="I like a dampener"
                    hint="Pocket / vibration feel stays on"
                    onClick={() =>
                      setPreferences({ likesDampener: !profile.preferences.likesDampener })
                    }
                  />
                </div>
                <Primary onClick={next}>Continue</Primary>
              </Step>
            )}

            {id === "bag" && (
              <Step title="What’s in the bag?" subtitle="Search and save — or skip and add later.">
                <button
                  type="button"
                  onClick={() => setPicker("racket")}
                  className="w-full rounded-md border border-[var(--line)] px-4 py-4 text-left"
                >
                  <p className="sf-label">Racket</p>
                  <p className="mt-1 text-sm font-medium">
                    {setup.racketLabel ?? "Search and pick a frame"}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setPicker("string")}
                  className="mt-2 w-full rounded-md border border-[var(--line)] px-4 py-4 text-left"
                >
                  <p className="sf-label">String</p>
                  <p className="mt-1 text-sm font-medium">
                    {setup.stringLabel
                      ? `${setup.stringLabel}${setup.tensionLbs != null ? ` @ ${setup.tensionLbs} lbs` : ""}`
                      : "Optional — search a bed"}
                  </p>
                </button>
                <Primary onClick={next}>{hasAnyGear(setup) ? "See my court" : "Skip for now"}</Primary>
              </Step>
            )}

            {id === "payoff" && (
              <Step
                title={profile.displayName ? `Here’s you, ${profile.displayName}.` : "Here’s you."}
                subtitle="Specs advise. Your body decides. Coaching-grade — not Hawk-Eye."
              >
                <ul className="space-y-2 text-sm">
                  {profile.grips.forehand && (
                    <li className="rounded-md border border-[var(--line)] px-3 py-2">
                      FH {fhGripLabel(profile.grips.forehand)}
                      {preview ? ` · ${preview}` : ""}
                    </li>
                  )}
                  {profile.grips.backhandNote && (
                    <li className="rounded-md border border-[var(--line)] px-3 py-2 text-[var(--muted)]">
                      {profile.grips.backhandNote}
                    </li>
                  )}
                  {profile.constraints.filter((c) => c.active).map((c) => (
                    <li key={c.id} className="rounded-md border border-[var(--line)] px-3 py-2">
                      Guardrail: {c.label}
                    </li>
                  ))}
                  <li className="rounded-md border border-[var(--line)] px-3 py-2">
                    {hasAnyGear(setup) ? setupSummary(setup) : "Bag not set yet — add it anytime."}
                  </li>
                  {insight.launchAngleDeg != null && (
                    <li className="rounded-md border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-3 py-2">
                      Molded launch ~{insight.launchAngleDeg.toFixed(1)}°
                      {insight.swingPathDeg != null ? ` · path ~${insight.swingPathDeg.toFixed(0)}°` : ""}
                    </li>
                  )}
                </ul>
                <Link
                  href="/lab"
                  onClick={() => complete()}
                  className="mt-8 block w-full rounded-md bg-[var(--accent)] py-3.5 text-center text-sm font-medium text-[var(--accent-ink)]"
                >
                  See it in Lab
                </Link>
                <button
                  type="button"
                  onClick={() => complete()}
                  className="mt-3 w-full py-2 text-sm text-[var(--muted)]"
                >
                  Tweak bag on You
                </button>
              </Step>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {picker && (
        <GearPickerSheet
          kind={picker}
          rackets={rackets}
          strings={strings}
          grips={grips}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}

function Step({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight md:text-4xl">
        {title}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{subtitle}</p>
      <div className="mt-8 min-h-0 flex-1 overflow-y-auto pb-6">{children}</div>
    </div>
  );
}

function Choice({
  active,
  title,
  hint,
  onClick,
}: {
  active: boolean;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-md px-4 py-3.5 text-left transition"
      style={{
        background: active ? "var(--accent)" : "transparent",
        color: active ? "var(--accent-ink)" : "var(--foreground)",
        boxShadow: active ? "none" : "0 0 0 1px var(--line)",
      }}
    >
      <p className="text-sm font-medium">{title}</p>
      <p className={`mt-0.5 text-xs ${active ? "text-[var(--accent-ink)]/70" : "text-[var(--muted)]"}`}>
        {hint}
      </p>
    </button>
  );
}

function Primary({
  onClick,
  children,
  disabled,
}: {
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mt-8 w-full rounded-md bg-[var(--accent)] py-3.5 text-sm font-medium text-[var(--accent-ink)] disabled:opacity-40"
    >
      {children}
    </button>
  );
}
