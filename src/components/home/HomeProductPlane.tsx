"use client";

/**
 * Hero product plane — live-feeling Strokeform UI composition.
 * Shows mold dials + skill span + phase rail so the first viewport is the product, not a stock gradient.
 */
export function HomeProductPlane() {
  return (
    <div
      className="sf-product-plane relative mx-auto w-full max-w-lg lg:mx-0 lg:max-w-none"
      aria-hidden
    >
      <div className="sf-product-plane-glow" />
      <div className="sf-product-plane-card">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] pb-4">
          <div className="min-w-0">
            <p className="sf-kicker">Live mold</p>
            <p className="mt-1.5 font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
              Semi-western · open pattern
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">Leave 14.2° · path 24° · net +4.1″</p>
          </div>
          <div className="text-right">
            <p className="sf-label">Demand</p>
            <p className="mt-0.5 font-[family-name:var(--font-display)] text-3xl font-semibold tabular-nums tracking-tight text-[var(--accent)]">
              62
            </p>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-[11px] font-semibold tracking-[0.08em] text-[var(--muted)] uppercase">
            <span>Skill span</span>
            <span className="tabular-nums text-[var(--foreground)]">48 → 78</span>
          </div>
          <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)]">
            <div
              className="absolute inset-y-0 rounded-full bg-[color-mix(in_srgb,var(--accent)_42%,transparent)]"
              style={{ left: "48%", width: "30%" }}
            />
            <div
              className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 rounded-full bg-[var(--accent)]"
              style={{ left: "48%" }}
            />
            <div
              className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 rounded-full bg-[var(--foreground)]"
              style={{ left: "78%" }}
            />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          {[
            ["Plow", 72],
            ["Whip", 68],
            ["Honesty", 74],
          ].map(([label, v]) => (
            <div key={String(label)}>
              <p className="sf-label">{label}</p>
              <div className="sf-meter-track mt-1.5">
                <div
                  className="sf-meter-fill"
                  style={{
                    width: `${v}%`,
                    background: "var(--accent)",
                    color: "var(--accent)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="sf-intel-quirk mt-5" style={{ borderLeftColor: "var(--accent)" }}>
          <p className="sf-kicker">Quirk</p>
          <p className="mt-1 text-sm font-semibold">16×19 honesty</p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
            Own your low-to-high path — denser beds don&apos;t gift free wipe.
          </p>
        </div>

        <div className="mt-5 flex gap-1">
          {["Ready", "Unit", "Accel", "Contact", "Finish"].map((p, i) => (
            <div
              key={p}
              className="flex-1 rounded-[var(--radius)] py-2 text-center text-[10px] font-semibold tracking-[0.08em] uppercase"
              style={{
                background: i === 3 ? "var(--accent)" : "var(--overlay-hover)",
                color: i === 3 ? "var(--accent-fg)" : "var(--muted)",
                boxShadow: i === 3 ? "0 0 16px color-mix(in srgb, var(--accent) 40%, transparent)" : undefined,
              }}
            >
              {p}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
