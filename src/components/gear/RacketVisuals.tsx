"use client";

/**
 * Gear Lab teaching visuals — launch and path are taught from the ideal strike
 * on the string bed, not from a court-ground wedge.
 */

function pathTypeLabel(degrees: number): string {
  if (degrees >= 30) return "Steep spin shape";
  if (degrees >= 22) return "Modern low→high drive";
  if (degrees >= 14) return "Flatter penetrating drive";
  return "Level / block-friendly path";
}

function strikeWindowCopy(launchDeg: number, pathDeg: number): string {
  if (pathDeg >= 28 || launchDeg >= 10) {
    return "Best to strike slightly higher (waist–chest) and brush up through the ball out in front.";
  }
  if (pathDeg <= 14 || launchDeg <= 5) {
    return "Best to strike out in front at a comfortable height — drive through; avoid late, low contact.";
  }
  return "Best to strike the ball out in front at mid-body height — let the bed launch it; don’t scoop from the ground.";
}

/** Ball exit from the ideal strike on the string bed (side view of the hoop). */
export function LaunchAngleVisual({
  degrees,
  label = "Strike launch",
}: {
  degrees: number;
  label?: string;
}) {
  const deg = Math.max(0, Math.min(20, degrees));
  const rad = (deg * Math.PI) / 180;
  // Ideal strike near center of hoop (hoop center ~ 95, 58)
  const sx = 95;
  const sy = 58;
  const len = 78;
  const ex = sx + Math.cos(rad) * len;
  const ey = sy - Math.sin(rad) * len;
  // Closed face cue (slight tip-forward lean of hoop)
  const faceTilt = Math.min(12, deg * 0.35);

  return (
    <div className="relative">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
        {label}
      </p>
      <svg viewBox="0 0 220 150" className="h-auto w-full max-w-sm" aria-hidden>
        <defs>
          <linearGradient id="strikeLaunchGlow" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#c8f560" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#c8f560" stopOpacity="0.55" />
          </linearGradient>
        </defs>
        {/* Racket handle */}
        <line
          x1="40"
          y1="120"
          x2="72"
          y2="88"
          stroke="#8aa396"
          strokeWidth="5"
          strokeLinecap="round"
        />
        {/* Throat */}
        <line x1="72" y1="88" x2="82" y2="74" stroke="#8aa396" strokeWidth="3" />
        {/* Hoop (string bed) — side-ish oval */}
        <g transform={`rotate(${-faceTilt} 95 58)`}>
          <ellipse
            cx="95"
            cy="58"
            rx="42"
            ry="28"
            fill="rgba(200,245,96,0.06)"
            stroke="#c8f560"
            strokeWidth="2.5"
          />
          {/* String grid hint */}
          <line x1="70" y1="48" x2="120" y2="48" stroke="rgba(232,239,233,0.2)" strokeWidth="1" />
          <line x1="70" y1="58" x2="120" y2="58" stroke="rgba(232,239,233,0.25)" strokeWidth="1" />
          <line x1="70" y1="68" x2="120" y2="68" stroke="rgba(232,239,233,0.2)" strokeWidth="1" />
          <line x1="85" y1="40" x2="85" y2="76" stroke="rgba(232,239,233,0.15)" strokeWidth="1" />
          <line x1="105" y1="40" x2="105" y2="76" stroke="rgba(232,239,233,0.15)" strokeWidth="1" />
          {/* Ideal strike point */}
          <circle cx={sx} cy={sy} r="5" fill="#c8f560">
            <animate attributeName="opacity" values="0.55;1;0.55" dur="2.2s" repeatCount="indefinite" />
          </circle>
        </g>
        {/* Horizontal reference through strike (face plane cue) */}
        <line
          x1={sx}
          y1={sy}
          x2={sx + 70}
          y2={sy}
          stroke="#8aa396"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        {/* Launch wedge from strike */}
        <path
          d={`M ${sx} ${sy} L ${sx + 70} ${sy} L ${ex} ${ey} Z`}
          fill="url(#strikeLaunchGlow)"
        />
        {/* Ball exit vector */}
        <line
          x1={sx}
          y1={sy}
          x2={ex}
          y2={ey}
          stroke="#c8f560"
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{ transition: "all 0.55s ease" }}
        />
        <circle cx={ex} cy={ey} r="4" fill="#e8efe9" style={{ transition: "all 0.55s ease" }} />
        <text x="148" y="28" fill="#8aa396" fontSize="10">
          off the strings →
        </text>
        <text x="58" y="138" fill="#8aa396" fontSize="9">
          ideal strike
        </text>
      </svg>
      <p className="mt-1 font-[family-name:var(--font-display)] text-3xl tracking-tight">
        {deg.toFixed(1)}
        <span className="ml-1 text-base text-[var(--muted)]">° off the bed</span>
      </p>
      <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
        Probable ball launch from a clean strike near the sweet spot — trajectory leaves the string
        bed, not the court floor.
      </p>
    </div>
  );
}

/** Swing path through an out-front contact window, with strike timing cue. */
export function SwingPathVisual({
  degrees,
  label = "Swing path through contact",
}: {
  degrees: number;
  label?: string;
}) {
  const deg = Math.max(5, Math.min(40, degrees));
  const steep = deg / 40;
  const midY = 95 - steep * 35;
  const endY = 70 - steep * 45;
  const type = pathTypeLabel(deg);

  return (
    <div className="relative">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--amber)]">
        {label}
      </p>
      <svg viewBox="0 0 220 150" className="h-auto w-full max-w-sm" aria-hidden>
        <defs>
          <linearGradient id="pathStrokeStrike" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f4a261" stopOpacity="0.25" />
            <stop offset="55%" stopColor="#f4a261" stopOpacity="1" />
            <stop offset="100%" stopColor="#c8f560" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        {/* Body / contact-in-front cue */}
        <circle cx="48" cy="78" r="10" fill="rgba(232,239,233,0.12)" stroke="rgba(232,239,233,0.35)" />
        <text x="28" y="102" fill="#8aa396" fontSize="9">
          body
        </text>
        {/* Contact window out front */}
        <rect
          x="100"
          y="52"
          width="34"
          height="44"
          rx="3"
          fill="rgba(200,245,96,0.1)"
          stroke="rgba(200,245,96,0.45)"
        />
        <text x="102" y="48" fill="#c8f560" fontSize="9">
          strike zone
        </text>
        <text x="104" y="118" fill="#8aa396" fontSize="8">
          out front
        </text>
        <path
          d={`M 30 118 Q 70 ${midY + 20}, 116 74 Q 155 ${endY}, 198 ${endY - 8}`}
          fill="none"
          stroke="url(#pathStrokeStrike)"
          strokeWidth="3"
          strokeLinecap="round"
          style={{ transition: "d 0.55s ease" }}
        >
          <animate attributeName="stroke-opacity" values="0.7;1;0.7" dur="2.8s" repeatCount="indefinite" />
        </path>
        <polygon
          points={`198,${endY - 8} 189,${endY - 2} 191,${endY - 14}`}
          fill="#c8f560"
          style={{ transition: "all 0.55s ease" }}
        />
      </svg>
      <p className="mt-1 font-[family-name:var(--font-display)] text-3xl tracking-tight">
        {deg.toFixed(1)}
        <span className="ml-1 text-base text-[var(--muted)]">° · {type}</span>
      </p>
      <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
        {strikeWindowCopy(8, deg)} Steeper paths favor brush/spin; flatter paths favor drive depth.
      </p>
    </div>
  );
}

/** Three coaching bullets from molded launch/path/scores. */
export function StrikeCoachingBullets({
  launchDeg,
  pathDeg,
  spin,
  control,
  power,
}: {
  launchDeg: number | null;
  pathDeg: number | null;
  spin?: number | null;
  control?: number | null;
  power?: number | null;
}) {
  if (launchDeg == null && pathDeg == null) return null;
  const launch = launchDeg ?? 8;
  const path = pathDeg ?? 20;
  const bullets: string[] = [];

  bullets.push(strikeWindowCopy(launch, path));
  bullets.push(
    `Path type: ${pathTypeLabel(path).toLowerCase()} (~${path.toFixed(0)}°). Aim to match that shape through the strike zone — don’t invent a different swing for the frame.`,
  );

  if ((spin ?? 0) >= 72 || path >= 28) {
    bullets.push(
      "Adjustment lever: keep (or add) spin window — open pattern, shaped poly, or tip mass can support this launch; don’t drop tension so far that you scoop.",
    );
  } else if ((control ?? 0) >= 72 || path <= 16) {
    bullets.push(
      "Adjustment lever: precision first — denser pattern / tighter bed / less tip mass keeps launch honest; strike earlier if balls sail long.",
    );
  } else if ((power ?? 0) >= 72) {
    bullets.push(
      "Adjustment lever: easy depth — you can take a shorter swing; watch late contact or you’ll float long. Slightly higher tension flattens launch if needed.",
    );
  } else {
    bullets.push(
      "Adjustment lever: mold tension, gauge, or a few grams of tip/handle tape to nudge strike launch — then re-check this diagram.",
    );
  }

  return (
    <div className="mt-4 border-t border-[var(--line)] pt-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
        How to use this at a high level
      </p>
      <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[var(--foreground)]/90">
        {bullets.map((b) => (
          <li key={b} className="border-l-2 border-[var(--accent)]/45 pl-3">
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
}
