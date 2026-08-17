"use client";

import { useMemo, useState } from "react";
import type { SessionFeel } from "@/types/playerProfile";
import { useGearStore } from "@/store/gearStore";
import { setupSummaryFromGear, usePlayerStore } from "@/store/playerStore";
import { bedStatus } from "@/lib/player/stringHours";

const FEELS: { id: SessionFeel; label: string }[] = [
  { id: "great", label: "Great" },
  { id: "ok", label: "OK" },
  { id: "pushy", label: "Pushy" },
  { id: "flying", label: "Flying" },
  { id: "dumping", label: "Dumping" },
  { id: "framing", label: "Framing" },
  { id: "other", label: "Other" },
];

type BodyPick = "ok" | "whisper" | "pain" | "blister";

export function AfterPlayTab() {
  const setup = useGearStore((s) => s.setup);
  const logSession = usePlayerStore((s) => s.logSession);
  const profile = usePlayerStore((s) => s.profile);
  const resetStringBed = usePlayerStore((s) => s.resetStringBed);

  const [hours, setHours] = useState("1.5");
  const [feel, setFeel] = useState<SessionFeel>("ok");
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
    <div className="space-y-4">
      <p className="text-xs text-[var(--muted)]">Against: {summary}</p>

      {warn && warn.status !== "fresh" && (
        <p
          className={`rounded-md border px-3 py-2 text-sm ${
            warn.status === "likely_dead"
              ? "border-red-400/40 bg-red-500/10"
              : "border-amber-500/30 bg-amber-500/10"
          }`}
        >
          {warn.message}
        </p>
      )}

      <label className="block">
        <span className="mb-1 block text-[11px] uppercase tracking-wider text-[var(--muted)]">
          Hours
        </span>
        <input
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          inputMode="decimal"
          className="w-full rounded-md border border-[var(--line)] bg-black/20 px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
      </label>

      <div>
        <p className="mb-2 text-[11px] uppercase tracking-wider text-[var(--muted)]">How it felt</p>
        <div className="flex flex-wrap gap-2">
          {FEELS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFeel(f.id)}
              className="rounded-md px-2.5 py-1.5 text-xs"
              style={{
                background: feel === f.id ? "var(--accent)" : "transparent",
                color: feel === f.id ? "var(--accent-ink)" : "var(--foreground)",
                boxShadow: feel === f.id ? "none" : "0 0 0 1px var(--line)",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="mb-1 block text-[11px] uppercase tracking-wider text-[var(--muted)]">
          What broke down
        </span>
        <input
          value={broke}
          onChange={(e) => setBroke(e.target.value)}
          placeholder="Framing on the BH, grip slip…"
          className="w-full rounded-md border border-[var(--line)] bg-black/20 px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
      </label>

      <div>
        <p className="mb-2 text-[11px] uppercase tracking-wider text-[var(--muted)]">Body</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <BodySelect label="Arm" value={arm} onChange={setArm} />
          <BodySelect label="Hand" value={hand} onChange={setHand} />
          <BodySelect label="Other" value={other} onChange={setOther} />
        </div>
      </div>

      <button
        type="button"
        className="w-full rounded-md bg-[var(--accent)] py-3 text-sm font-medium text-[var(--accent-ink)]"
        onClick={() => {
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
          });
          setBroke("");
          setSaved(true);
        }}
      >
        Save session
      </button>
      {saved && <p className="text-xs text-[var(--accent)]">Logged. String hours updated.</p>}

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
        <div key={s.id} className="border border-[var(--line)] px-3 py-2 text-sm">
          <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
            {new Date(s.createdAt).toLocaleDateString()} · {s.overallFeel} · +{s.hoursOnBed}h
          </p>
          <p className="text-[var(--muted)]">{s.brokeDown || s.setupSummary}</p>
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
    <label className="text-xs">
      <span className="mb-1 block text-[var(--muted)]">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as BodyPick | "")}
        className="w-full rounded-md border border-[var(--line)] bg-black/20 px-2 py-2"
      >
        <option value="">—</option>
        <option value="ok">ok</option>
        <option value="whisper">whisper</option>
        <option value="pain">pain</option>
        <option value="blister">blister</option>
      </select>
    </label>
  );
}
