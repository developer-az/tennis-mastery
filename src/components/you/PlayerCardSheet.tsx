"use client";

import { useState } from "react";
import type { ForehandGripKind } from "@/lib/equipment/forehandMold";
import type { BackhandGripKind } from "@/types/playerProfile";
import type { GripProfile, RacketProfile, StringProfile } from "@/types/equipment";
import { usePlayerStore } from "@/store/playerStore";
import { hasAnyGear, setupSummary, useGearStore } from "@/store/gearStore";
import { CONSTRAINT_TEMPLATES, fhGripLabel, gripPreviewLine } from "@/lib/player/onboarding";
import { GearPickerSheet, type PickerKind } from "@/components/onboarding/GearPickerSheet";

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

export function PlayerCardSheet({
  rackets,
  strings,
  grips,
  onClose,
}: {
  rackets: RacketProfile[];
  strings: StringProfile[];
  grips: GripProfile[];
  onClose: () => void;
}) {
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

  const preview = gripPreviewLine(profile.grips.forehand);
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

  const done = () => {
    setDisplayName(nameDraft);
    complete();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close player card"
        className="absolute inset-0 bg-black/50"
        onClick={done}
      />
      <div
        role="dialog"
        aria-modal
        aria-labelledby="player-card-title"
        className="relative z-[61] flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden border border-[var(--line)] bg-[var(--panel)] shadow-2xl sm:rounded-[var(--radius)]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
          <div>
            <p className="sf-kicker">Optional</p>
            <h2 id="player-card-title" className="font-[family-name:var(--font-display)] text-xl tracking-tight">
              Your game
            </h2>
          </div>
          <button type="button" onClick={done} className="text-sm text-[var(--muted)]">
            Done
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-5 py-6">
          <p className="text-sm leading-relaxed text-[var(--muted)]">
            Skip anything. Add a grip or a bag only when you want Lab and practice to follow your
            game.
          </p>

          <section>
            <p className="sf-label mb-2">Name</p>
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={() => setDisplayName(nameDraft)}
              placeholder="What should we call you?"
              className="sf-input"
            />
          </section>

          <section>
            <p className="sf-label mb-2">Forehand grip</p>
            <p className="mb-3 text-xs text-[var(--muted)]">Sets face angle in Lab.</p>
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
            {preview ? <p className="sf-alert sf-alert-accent mt-3">{preview}</p> : null}
          </section>

          <section>
            <p className="sf-label mb-2">Backhand</p>
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
          </section>

          <section>
            <p className="sf-label mb-2">Body</p>
            <p className="mb-3 text-xs text-[var(--muted)]">We’ll warn before gear fights this.</p>
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
                hint="Softer overgrip stacks"
                onClick={() => toggleBody("skin")}
              />
              <Choice
                active={bodyActive("c-blisters")}
                title="Recurring blisters"
                hint="Match grip build on both frames"
                onClick={() => toggleBody("blisters")}
              />
            </div>
          </section>

          <section>
            <p className="sf-label mb-2">What you care about</p>
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
          </section>

          <section>
            <p className="sf-label mb-2">Bag</p>
            <p className="mb-3 text-xs text-[var(--muted)]">Browse like a shop — or skip.</p>
            <button
              type="button"
              onClick={() => setPicker("racket")}
              className="sf-choice"
            >
              <p className="text-sm font-medium">Racket</p>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                {setup.racketLabel ?? "Browse frames"}
              </p>
            </button>
            <button
              type="button"
              onClick={() => setPicker("string")}
              className="sf-choice mt-2"
            >
              <p className="text-sm font-medium">String</p>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                {setup.stringLabel
                  ? `${setup.stringLabel}${setup.tensionLbs != null ? ` @ ${setup.tensionLbs} lbs` : ""}`
                  : "Optional"}
              </p>
            </button>
            {hasAnyGear(setup) ? (
              <p className="mt-2 text-xs text-[var(--muted)]">{setupSummary(setup)}</p>
            ) : null}
          </section>

          {profile.grips.forehand ? (
            <p className="text-sm text-[var(--muted)]">
              FH {fhGripLabel(profile.grips.forehand)}
              {preview ? ` · ${preview}` : ""}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 border-t border-[var(--line)] px-5 py-4">
          <button type="button" onClick={done} className="sf-btn sf-btn-primary w-full">
            Save player card
          </button>
          <button
            type="button"
            onClick={() => {
              adoptExample();
              onClose();
            }}
            className="sf-btn sf-btn-ghost w-full"
          >
            Use a sample player
          </button>
        </div>
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
    <button type="button" onClick={onClick} className="sf-choice" data-active={active ? "true" : "false"}>
      <p className="text-sm font-medium">{title}</p>
      <p className={`mt-0.5 text-xs ${active ? "opacity-70" : "text-[var(--muted)]"}`}>{hint}</p>
    </button>
  );
}
