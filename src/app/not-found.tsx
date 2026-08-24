import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-20">
      <div className="sf-intel-panel">
        <p className="sf-kicker">Out of bounds</p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
          This court line doesn&apos;t exist
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
          The route you asked for isn&apos;t in the Strokeform map. Pick a hub and keep playing.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/you" className="sf-btn sf-btn-primary">
            Your court
          </Link>
          <Link href="/gear" className="sf-btn sf-btn-secondary">
            Gear lab
          </Link>
          <Link href="/lab" className="sf-btn sf-btn-ghost">
            Form lab
          </Link>
        </div>
      </div>
    </div>
  );
}
