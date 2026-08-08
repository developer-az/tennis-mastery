"use client";

import Link from "next/link";
import { PLAYERS } from "@/data/players";
import { useCoachStore } from "@/store/coachStore";
import { setupSummary, useGearStore } from "@/store/gearStore";
import { sampleStroke } from "@/lib/kinematics";

function Metric({
  label,
  value,
  unit,
  hint,
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
}) {
  return (
    <div className="border-t border-[var(--line)] pt-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tracking-tight text-[var(--foreground)]">
        {value}
        {unit ? <span className="ml-1 text-sm font-sans text-[var(--muted)]">{unit}</span> : null}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-[var(--muted)]">{hint}</p> : null}
    </div>
  );
}

export function MetricsPanel() {
  const playerId = useCoachStore((s) => s.playerId);
  const strokeType = useCoachStore((s) => s.stroke);
  const t = useCoachStore((s) => s.t);

  const player = PLAYERS.find((p) => p.id === playerId)!;
  const stroke = player.strokes[strokeType];
  const m = stroke.metrics;
  const pose = sampleStroke(stroke, t);

  return (
    <div className="space-y-1">
      <div className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          Live biomechanics
        </p>
        <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl tracking-tight">
          {player.shortName} · {stroke.label}
        </h2>
      </div>

      <Metric
        label="Racket head speed"
        value={pose.racketSpeedMs.toFixed(1)}
        unit="m/s"
        hint={`Peak ${m.peakRacketSpeedMs.toFixed(1)} m/s`}
      />
      <Metric
        label="Spin at / after contact"
        value={Math.abs(pose.spinRpm).toLocaleString()}
        unit="rpm"
        hint={m.avgSpinRpm < 0 ? "Backspin (slice)" : "Topspin"}
      />
      <Metric
        label="Elbow flexion"
        value={String(Math.round(pose.joints.elbowFlexion))}
        unit="°"
      />
      <Metric
        label="Lead knee flexion"
        value={String(Math.round(pose.joints.leadKneeFlexion))}
        unit="°"
      />
      <Metric
        label="Trunk rotation"
        value={String(Math.round(Math.abs(pose.joints.spineTwist)))}
        unit="°"
      />
      <Metric
        label="Shoulder internal rotation"
        value={String(Math.round(pose.joints.shoulderInternalRotation))}
        unit="°"
      />

      <div className="mt-4 border-t border-[var(--line)] pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          Stroke lab means
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3 text-sm">
          <div>
            <dt className="text-[var(--muted)]">Contact height</dt>
            <dd>{m.contactHeightM.toFixed(2)} m</dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">Launch angle</dt>
            <dd>{m.launchAngleDeg.toFixed(1)}°</dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">X-factor</dt>
            <dd>{m.kineticChain.xFactorDeg}°</dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">Prox–distal lag</dt>
            <dd>{m.kineticChain.proximalDistalLagMs} ms</dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">Peak GRF</dt>
            <dd>{m.kineticChain.peakGrfN} N</dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">Path reproducibility</dt>
            <dd>{m.consistency.pathReproducibility}%</dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">Timing SD</dt>
            <dd>±{m.consistency.timingSdMs} ms</dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">Grip</dt>
            <dd className="capitalize">{m.grip.replace(/([A-Z])/g, " $1")}</dd>
          </div>
        </dl>
      </div>

      <SetupBridge
        athleteLaunch={m.launchAngleDeg}
        athleteSwingPath={m.swingPathDeg}
        athleteLabel={player.shortName}
      />
    </div>
  );
}

function SetupBridge({
  athleteLaunch,
  athleteSwingPath,
  athleteLabel,
}: {
  athleteLaunch: number;
  athleteSwingPath: number;
  athleteLabel: string;
}) {
  const setup = useGearStore((s) => s.setup);
  const hasGear = Boolean(setup.racketLabel || setup.stringLabel || setup.gripLabel);

  return (
    <div className="mt-5 border-t border-[var(--line)] pt-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        Your gear setup
      </p>
      {hasGear ? (
        <>
          <p className="mt-2 text-sm leading-relaxed text-[var(--foreground)]/90">
            {setupSummary(setup)}
          </p>
          {setup.racketLabel ? (
            <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">
              {athleteLabel}&apos;s stroke targets ~{athleteLaunch.toFixed(1)}° launch and ~
              {athleteSwingPath.toFixed(0)}° low-to-high path. Open Gear lab to see whether your
              frame&apos;s ideal launch/swing window sits above, on, or flatter than that pattern.
            </p>
          ) : (
            <p className="mt-2 text-xs text-[var(--muted)]">
              Add a racket in Gear lab to compare its ideal launch/swing path with this stroke.
            </p>
          )}
          <Link
            href="/gear"
            className="mt-3 inline-block text-xs font-medium text-[var(--accent)] transition hover:brightness-110"
          >
            Edit setup in Gear lab →
          </Link>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Save a racket, string, and grip in Gear lab — it stays in this browser and shows up here
            while you study form.
          </p>
          <Link
            href="/gear"
            className="mt-3 inline-block rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-[#0b1a14] transition hover:brightness-110"
          >
            Build my setup
          </Link>
        </>
      )}
    </div>
  );
}

export function SciencePanel() {
  const playerId = useCoachStore((s) => s.playerId);
  const strokeType = useCoachStore((s) => s.stroke);
  const player = PLAYERS.find((p) => p.id === playerId)!;
  const stroke = player.strokes[strokeType];
  const m = stroke.metrics;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          Signature quirk
        </p>
        <p className="mt-2 text-sm leading-relaxed">{m.consistency.signatureQuirk}</p>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          Kinetic chain
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {m.kineticChain.sequence.map((seg, i) => (
            <span key={seg} className="flex items-center gap-1.5">
              <span className="rounded bg-[var(--accent-dim)] px-2 py-0.5 text-xs text-[var(--accent)]">
                {seg}
              </span>
              {i < m.kineticChain.sequence.length - 1 ? (
                <span className="text-[var(--muted)]">→</span>
              ) : null}
            </span>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          Research notes
        </p>
        <ul className="mt-2 space-y-2 text-sm leading-relaxed text-[var(--foreground)]/85">
          {m.researchNotes.map((n) => (
            <li key={n} className="border-l-2 border-[var(--accent)]/40 pl-3">
              {n}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          Sources
        </p>
        <ul className="mt-2 space-y-1 text-xs text-[var(--muted)]">
          {m.sources.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>

      <p className="text-xs leading-relaxed text-[var(--muted)]">{player.biography}</p>
    </div>
  );
}
