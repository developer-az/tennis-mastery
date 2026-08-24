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
          <div>
            <p className="sf-kicker">Live mold</p>
            <p className="mt-1.5 font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
              Semi-western · open pattern
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">Leave 14.2° · path 24° · net +4.1″</p>
          </div>
          <div className="text-right">
            <p className="sf-label">Demand</p>
            <p className="mt-0.5 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums">
              62
            </p>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-[10px] tracking-[0.1em] text-[var(--muted)] uppercase">
            <span>Skill span</span>
            <span className="tabular-nums text-[var(--foreground)]">48 → 78</span>
          </div>
          <div className="relative mt-2 h-1.5 bg-[color-mix(in_srgb,var(--foreground)_08%,transparent)]">
            <div
              className="absolute inset-y-0 bg-[var(--accent)]/40"
              style={{ left: "48%", width: "30%" }}
            />
            <div
              className="absolute top-1/2 h-2.5 w-0.5 -translate-y-1/2 bg-[var(--accent)]"
              style={{ left: "48%" }}
            />
            <div
              className="absolute top-1/2 h-2.5 w-0.5 -translate-y-1/2 bg-[var(--foreground)]"
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
              <p className="text-[10px] font-semibold tracking-[0.12em] text-[var(--label)] uppercase">
                {label}
              </p>
              <div className="mt-1.5 h-[3px] bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)]">
                <div className="h-full bg-[var(--accent)]" style={{ width: `${v}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="sf-intel-quirk mt-5" style={{ borderLeftColor: "var(--accent)" }}>
          <p className="text-[10px] font-semibold tracking-[0.14em] text-[var(--accent)] uppercase">
            Quirk
          </p>
          <p className="mt-1 text-sm font-semibold">16×19 honesty</p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
            Own your low-to-high path — denser beds don&apos;t gift free wipe.
          </p>
        </div>

        <div className="mt-5 flex gap-1">
          {["Ready", "Unit", "Accel", "Contact", "Finish"].map((p, i) => (
            <div
              key={p}
              className="flex-1 py-1.5 text-center text-[9px] font-semibold tracking-[0.08em] uppercase"
              style={{
                background: i === 3 ? "var(--accent)" : "var(--overlay-hover)",
                color: i === 3 ? "var(--accent-fg)" : "var(--muted)",
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
