"use client";

import { useState } from "react";
import type { GripProfile, RacketProfile, StringProfile } from "@/types/equipment";
import { GRIP_SIZES } from "@/lib/equipment/gripSize";
import { hasAnyGear, setupSummary, useGearStore } from "@/store/gearStore";
import { usePlayerStore } from "@/store/playerStore";
import { GearPickerSheet, type PickerKind } from "@/components/onboarding/GearPickerSheet";

export function BagTab({
  rackets,
  strings,
  grips,
}: {
  rackets: RacketProfile[];
  strings: StringProfile[];
  grips: GripProfile[];
}) {
  const setup = useGearStore((s) => s.setup);
  const setTension = useGearStore((s) => s.setTension);
  const setGripSize = useGearStore((s) => s.setGripSize);
  const clearSetup = useGearStore((s) => s.clearSetup);
  const profile = usePlayerStore((s) => s.profile);
  const setGrips = usePlayerStore((s) => s.setGrips);
  const upsertMatchedPair = usePlayerStore((s) => s.upsertMatchedPair);
  const removeMatchedPair = usePlayerStore((s) => s.removeMatchedPair);

  const [picker, setPicker] = useState<PickerKind | null>(null);
  const [pairOn, setPairOn] = useState(profile.matchedPairs.length > 0);
  const [buildNote, setBuildNote] = useState(
    profile.grips.targetBuildNote || "L3 + sleeve + Tourna",
  );

  const pair = profile.matchedPairs[0];

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--muted)]">
        {hasAnyGear(setup) ? setupSummary(setup) : "Browse brands like a shop aisle — add a racket when you want."}
      </p>

      <Row label="Racket" value={setup.racketLabel} onEdit={() => setPicker("racket")} />
      <Row
        label="String"
        value={
          setup.stringLabel
            ? `${setup.stringLabel}${setup.tensionLbs != null ? ` @ ${setup.tensionLbs} lbs` : ""}`
            : null
        }
        onEdit={() => setPicker("string")}
      />
      <p className="text-xs text-[var(--muted)]">
        Tip: on Today, swipe similar beds to see leave / path / flight deltas with your lead tape held constant.
      </p>
      <Row label="Grip product" value={setup.gripLabel} onEdit={() => setPicker("grip")} />

      {setup.stringId && (
        <label className="block">
          <span className="sf-label mb-1 block">
            Tension (lbs)
          </span>
          <input
            type="number"
            min={40}
            max={70}
            value={setup.tensionLbs ?? ""}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n)) setTension(n);
            }}
            className="sf-input"
          />
        </label>
      )}

      <div>
        <p className="sf-label mb-2">Handle size</p>
        <div className="flex flex-wrap gap-2">
          {GRIP_SIZES.map((g) => (
            <button
              key={g.code}
              type="button"
              onClick={() => {
                setGripSize(g.code);
                setGrips({ targetSize: g.code });
              }}
              className="sf-chip"
              data-active={
                setup.gripSize === g.code || profile.grips.targetSize === g.code
                  ? "true"
                  : "false"
              }
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="sf-label mb-1 block">
          Grip build
        </span>
        <input
          value={buildNote}
          onChange={(e) => setBuildNote(e.target.value)}
          onBlur={() => setGrips({ targetBuildNote: buildNote })}
          className="sf-input"
        />
      </label>

      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input
          type="checkbox"
          className="sf-check"
          checked={pairOn}
          onChange={(e) => {
            const on = e.target.checked;
            setPairOn(on);
            if (!on && pair) {
              removeMatchedPair(pair.id);
              return;
            }
            if (on && setup.racketSlug) {
              upsertMatchedPair({
                label: "Matched pair",
                frameASlug: setup.racketSlug,
                frameBSlug: setup.racketSlug,
                sharedStringId: setup.stringId,
                sharedTensionLbs: setup.tensionLbs,
                sharedGaugeMm: setup.gaugeMm,
                sharedSwingweight: setup.racketSwingweight,
                sharedGripBuild: buildNote || profile.grips.targetBuildNote,
                notes: "Keep string, tension, SW, and grip build matched on both frames.",
              });
            }
          }}
        />
        I have two of these — keep them matched
      </label>
      {pairOn && (
        <p className="text-xs text-[var(--muted)]">
          Same string, tension, swingweight, and grip build on both frames.
        </p>
      )}

      {hasAnyGear(setup) && (
        <button type="button" onClick={() => clearSetup()} className="sf-btn sf-btn-ghost">
          Clear bag
        </button>
      )}

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

function Row({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string | null;
  onEdit: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onEdit}
      className="sf-choice flex w-full items-center justify-between gap-3"
    >
      <span>
        <span className="sf-label block">{label}</span>
        <span className="mt-0.5 block text-sm">{value ?? `Add ${label.toLowerCase()}`}</span>
      </span>
      <span className="text-xs text-[var(--accent)]">Search</span>
    </button>
  );
}
