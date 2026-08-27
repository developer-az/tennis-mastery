"use client";

import { useMemo } from "react";
import Link from "next/link";
import { PLAYERS } from "@/data/players";
import { useCoachStore } from "@/store/coachStore";
import { setupSummary, useGearStore } from "@/store/gearStore";
import { synthesizeCombinedSetup } from "@/lib/equipment/setupSynthesis";
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
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--label)]">
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
      <SetupBridge
        athleteLaunch={m.launchAngleDeg}
        athleteSwingPath={m.swingPathDeg}
        athleteLabel={player.shortName}
      />

      <div className="mb-4 mt-6">
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
  const insight = useMemo(
    () => synthesizeCombinedSetup(setup, null, null, null),
    [setup],
  );
  const hasGear = insight.hasAny;
  const launch = insight.launchAngleDeg ?? setup.racketLaunchDeg;
  const path = insight.swingPathDeg ?? setup.racketSwingPathDeg;

  return (
    <div
      className="rounded-md border border-[var(--line)] bg-[var(--bg-sunken)] p-3"
      style={{ boxShadow: "inset 0 0 0 1px rgba(200,245,96,0.06)" }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
        Your combined setup
      </p>
      {hasGear ? (
        <>
          <p className="mt-1.5 text-sm font-medium text-[var(--foreground)]">
            {insight.playability.headline}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
            Court-ready {insight.playability.score}/100 · {insight.playstyle}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{setupSummary(setup)}</p>
          {launch != null && path != null ? (
            <p className="mt-2 text-xs leading-relaxed text-[var(--foreground)]/80">
              Molded ~{launch.toFixed(1)}° / ~{path.toFixed(0)}° vs {athleteLabel}&apos;s{" "}
              {athleteLaunch.toFixed(1)}° / {athleteSwingPath.toFixed(0)}°
            </p>
          ) : null}
          <Link
            href="/you"
            className="mt-3 inline-block text-xs text-[var(--accent)] hover:underline"
          >
            Tweak bag
          </Link>
        </>
      ) : (
        <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">
          <Link href="/you" className="text-[var(--accent)] hover:underline">
            Finish setup
          </Link>{" "}
          to see your bag vs this stroke.
        </p>
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
