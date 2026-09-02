"use client";

/** Product photo via media API (TW redirect) or SVG portrait. */
export function EquipmentThumb({
  src,
  alt,
  size = "sm",
}: {
  src: string;
  alt: string;
  size?: "sm" | "md" | "lg";
}) {
  const dim =
    size === "lg"
      ? "h-44 w-32 sm:h-52 sm:w-36"
      : size === "md"
        ? "h-28 w-[5.5rem]"
        : "h-[4.5rem] w-14";

  return (
    <span className={`sf-thumb-well relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius)] ${dim}`}>
      <span
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,color-mix(in_srgb,var(--foreground)_8%,transparent),transparent_58%)]"
        aria-hidden
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- mixed TW JPEG redirects + SVG */}
      <img
        src={src}
        alt={alt}
        width={size === "lg" ? 144 : size === "md" ? 80 : 56}
        height={size === "lg" ? 192 : size === "md" ? 112 : 72}
        loading="lazy"
        decoding="async"
        className={`relative z-[1] ${dim} object-contain object-center`}
        onError={(e) => {
          const img = e.currentTarget;
          if (img.dataset.fallback === "1") return;
          if (src.includes("/api/equipment/") && !src.includes("format=svg")) {
            img.dataset.fallback = "1";
            img.src = `${src}${src.includes("?") ? "&" : "?"}format=svg`;
          }
        }}
      />
    </span>
  );
}
