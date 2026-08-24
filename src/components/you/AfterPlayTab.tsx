"use client";

import { useMemo, useState } from "react";
import type { PlayStroke, PlayStruggle, SessionFeel } from "@/types/playerProfile";
import { useGearStore } from "@/store/gearStore";
import { setupSummaryFromGear, usePlayerStore } from "@/store/playerStore";
import { bedStatus } from "@/lib/player/stringHours";

const FEELS: { id: SessionFeel; label: string }[] = [
  { id: "great", label: "Great" },
  { id: "ok", label: "OK" },
  { id: "pushy", label: "Pushy" },
  { id: "flying", label: "Long / flying" },
  { id: "dumping", label: "Dumping" },
  { id: "framing", label: "Framing" },
  { id: "other", label: "Other" },
];

const STROKES: { id: PlayStroke; label: string }[] = [
  { id: "serve", label: "Serve" },
  { id: "forehand", label: "Forehand" },
  { id: "backhand", label: "Backhand" },
  { id: "volley", label: "Volley" },
  { id: "movement", label: "Movement" },
];

const STRUGGLES: { id: PlayStruggle; label: string }[] = [
  { id: "flying", label: "Long / flying" },
  { id: "dumping", label: "Dump / no depth" },
  { id: "framing", label: "Framing" },
  { id: "no_spin", label: "No spin" },
  { id: "arm", label: "Arm" },
  { id: "grip_slip", label: "Grip slip" },
];

type BodyPick = "ok" | "whisper" | "pain" | "blister";

function toggle<T>(list: T[], id: T): T[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export function AfterPlayTab() {
  const setup = useGearStore((s) => s.setup);
  const logSession = usePlayerStore((s) => s.logSession);
  const profile = usePlayerStore((s) => s.profile);
  const resetStringBed = usePlayerStore((s) => s.resetStringBed);

  const [hours, setHours] = useState("1.5");
  const [feel, setFeel] = useState<SessionFeel>("ok");
  const [strokes, setStrokes] = useState<PlayStroke[]>([]);
  const [struggles, setStruggles] = useState<PlayStruggle[]>([]);
  const [broke, setBroke] = useState("");
  const [arm, setArm] = useState<BodyPick | "">("");
  const [hand, setHand] = useState<BodyPick | "">("");
  const [other, setOther] = useState<BodyPick | "">("");
  const [saved, setSaved] = useState(false);

  const summary = setupSummaryFromGear(setup);
  const bed = useMemo(() => {
    if (!setup.stringId) return null;
    return profile.stringBeds.find((b) => b.stringId === setup.stringId) ?? null;
  }, [profile.stringBeds, setup.stringId]);
  const warn = bed ? bedStatus(bed, setup.stringLabel ?? undefined) : null;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-xl tracking-tight">How did it go?</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Thirty seconds. Tap what broke down — we’ll mark drills on Today.
        </p>
        <p className="mt-1 text-xs text-[var(--muted)]">Against: {summary}</p>
      </div>

      {warn && warn.status !== "fresh" && (
        <p className={`sf-alert${warn.status === "likely_dead" ? " sf-alert-danger" : ""}`}>
          {warn.message}
        </p>
      )}

      <label className="block">
        <span className="sf-label mb-1 block">Hours</span>
        <input
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          inputMode="decimal"
          className="sf-input"
        />
      </label>

      <div>
        <p className="sf-label mb-2">How it felt</p>
        <div className="flex flex-wrap gap-2">
          {FEELS.map((f) => (
            <button
              key={f.id}
              type="button"
              className="sf-chip"
              data-active={feel === f.id ? "true" : "false"}
              onClick={() => setFeel(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="sf-label mb-2">What you were hitting</p>
        <div className="flex flex-wrap gap-2">
          {STROKES.map((s) => (
            <button
              key={s.id}
              type="button"
              className="sf-chip"
              data-active={strokes.includes(s.id) ? "true" : "false"}
              onClick={() => setStrokes((prev) => toggle(prev, s.id))}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="sf-label mb-2">What struggled</p>
        <div className="flex flex-wrap gap-2">
          {STRUGGLES.map((s) => (
            <button
              key={s.id}
              type="button"
              className="sf-chip"
              data-active={struggles.includes(s.id) ? "true" : "false"}
              onClick={() => setStruggles((prev) => toggle(prev, s.id))}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="sf-label mb-1 block">Anything else (optional)</span>
        <input
          value={broke}
          onChange={(e) => setBroke(e.target.value)}
          placeholder="Late on the BH, grip slip…"
          className="sf-input"
        />
      </label>

      <div>
        <p className="sf-label mb-2">Body</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <BodySelect label="Arm" value={arm} onChange={setArm} />
          <BodySelect label="Hand" value={hand} onChange={setHand} />
          <BodySelect label="Other" value={other} onChange={setOther} />
        </div>
      </div>

      <button
        type="button"
        className="sf-btn sf-btn-primary w-full"
        onClick={() => {
          const fromFeel: PlayStruggle[] =
            feel === "flying"
              ? ["flying"]
              : feel === "dumping" || feel === "pushy"
                ? ["dumping"]
                : feel === "framing"
                  ? ["framing"]
                  : [];
          logSession({
            setupSummary: summary,
            racketSlug: setup.racketSlug,
            stringId: setup.stringId,
            tensionLbs: setup.tensionLbs,
            hoursOnBed: Number.parseFloat(hours) || 0,
            feltGood: feel === "great" || feel === "ok" ? feel : "",
            brokeDown: broke,
            bodyCheck: {
              ...(arm ? { elbow: arm } : {}),
              ...(hand ? { hand } : {}),
              ...(hand === "blister" ? { blisters: "blister" as const } : {}),
              ...(other ? { other } : {}),
            },
            overallFeel: feel,
            notes: "",
            stringLabel: setup.stringLabel,
            strokes,
            struggles: Array.from(new Set([...struggles, ...fromFeel])),
          });
          setBroke("");
          setSaved(true);
        }}
      >
        Save recap
      </button>
      {saved && (
        <p className="text-sm text-[var(--accent)]">Logged. Check Today for what to work on.</p>
      )}

      {bed && (
        <button
          type="button"
          className="text-xs text-[var(--muted)]"
          onClick={() => resetStringBed(bed.stringId, bed.stringLabel, bed.tensionLbs)}
        >
          Fresh restring on this bed
        </button>
      )}

      {profile.sessions.slice(0, 5).map((s) => (
        <div key={s.id} className="sf-panel px-3 py-2 text-sm">
          <p className="sf-label">
            {new Date(s.createdAt).toLocaleDateString()} · {s.overallFeel} · +{s.hoursOnBed}h
          </p>
          {(s.strokes?.length || s.struggles?.length) ? (
            <p className="mt-1 text-xs text-[var(--muted)]">
              {[...(s.strokes ?? []), ...(s.struggles ?? [])].join(" · ")}
            </p>
          ) : null}
          {s.brokeDown ? <p className="mt-1 text-[var(--muted)]">{s.brokeDown}</p> : null}
        </div>
      ))}
    </div>
  );
}

function BodySelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: BodyPick | "";
  onChange: (v: BodyPick | "") => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-[var(--muted)]">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as BodyPick | "")}
        className="sf-select w-full"
      >
        <option value="">Skip</option>
        <option value="ok">OK</option>
        <option value="whisper">Whisper</option>
        <option value="pain">Pain</option>
        <option value="blister">Blister</option>
      </select>
    </label>
  );
}
