"use client";

/** Visual: ideal ball launch angle from the string bed / frame personality */
export function LaunchAngleVisual({ degrees }: { degrees: number }) {
  const deg = Math.max(0, Math.min(20, degrees));
  const rad = (deg * Math.PI) / 180;
  const x = 40 + Math.cos(rad) * 110;
  const y = 120 - Math.sin(rad) * 110;

  return (
    <div className="relative">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
        Ideal launch angle
      </p>
      <svg viewBox="0 0 200 140" className="h-auto w-full max-w-sm" aria-hidden>
        <defs>
          <linearGradient id="launchGlow" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#c8f560" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#c8f560" stopOpacity="0.55" />
          </linearGradient>
        </defs>
        {/* court horizon */}
        <line x1="20" y1="120" x2="180" y2="120" stroke="rgba(232,239,233,0.25)" strokeWidth="1.5" />
        {/* angle wedge */}
        <path
          d={`M 40 120 L 155 120 L ${x} ${y} Z`}
          fill="url(#launchGlow)"
        />
        {/* baseline reference */}
        <line x1="40" y1="120" x2="160" y2="120" stroke="#8aa396" strokeWidth="1" strokeDasharray="4 4" />
        {/* launch vector */}
        <line
          x1="40"
          y1="120"
          x2={x}
          y2={y}
          stroke="#c8f560"
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{ transition: "all 0.55s ease" }}
        />
        <circle cx="40" cy="120" r="4" fill="#c8f560">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="2.4s" repeatCount="indefinite" />
        </circle>
        <circle cx={x} cy={y} r="3.5" fill="#e8efe9" style={{ transition: "all 0.55s ease" }} />
        <text x="150" y="112" fill="#8aa396" fontSize="10">
          net plane →
        </text>
      </svg>
      <p className="mt-1 font-[family-name:var(--font-display)] text-3xl tracking-tight">
        {deg.toFixed(1)}
        <span className="ml-1 text-base text-[var(--muted)]">°</span>
      </p>
      <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
        Typical first-bounce launch window this frame encourages from a clean modern forehand.
      </p>
    </div>
  );
}

/** Visual: low-to-high swing path steepness */
export function SwingPathVisual({ degrees }: { degrees: number }) {
  const deg = Math.max(5, Math.min(40, degrees));
  // path from low backswing to high follow-through
  const steep = deg / 40;
  const midY = 95 - steep * 35;
  const endY = 70 - steep * 45;

  return (
    <div className="relative">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--amber)]">
        Ideal swing path
      </p>
      <svg viewBox="0 0 220 140" className="h-auto w-full max-w-sm" aria-hidden>
        <defs>
          <linearGradient id="pathStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f4a261" stopOpacity="0.25" />
            <stop offset="55%" stopColor="#f4a261" stopOpacity="1" />
            <stop offset="100%" stopColor="#c8f560" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        <line x1="20" y1="110" x2="200" y2="110" stroke="rgba(232,239,233,0.2)" strokeWidth="1" />
        {/* contact zone */}
        <rect x="95" y="55" width="28" height="40" rx="2" fill="rgba(200,245,96,0.08)" stroke="rgba(200,245,96,0.35)" />
        <text x="100" y="52" fill="#8aa396" fontSize="9">
          contact
        </text>
        <path
          d={`M 30 118 Q 70 ${midY + 20}, 108 78 Q 150 ${endY}, 195 ${endY - 8}`}
          fill="none"
          stroke="url(#pathStroke)"
          strokeWidth="3"
          strokeLinecap="round"
          style={{ transition: "d 0.55s ease" }}
        >
          <animate attributeName="stroke-opacity" values="0.7;1;0.7" dur="2.8s" repeatCount="indefinite" />
        </path>
        {/* arrow head */}
        <polygon
          points={`195,${endY - 8} 186,${endY - 2} 188,${endY - 14}`}
          fill="#c8f560"
          style={{ transition: "all 0.55s ease" }}
        />
      </svg>
      <p className="mt-1 font-[family-name:var(--font-display)] text-3xl tracking-tight">
        {deg.toFixed(1)}
        <span className="ml-1 text-base text-[var(--muted)]">° low→high</span>
      </p>
      <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
        Steeper paths suit open-pattern spin frames; flatter paths suit dense control frames.
      </p>
    </div>
  );
}
