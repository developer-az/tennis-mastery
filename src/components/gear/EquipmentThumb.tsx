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
      ? "h-36 w-28 sm:h-44 sm:w-32"
      : size === "md"
        ? "h-20 w-16"
        : "h-14 w-11";

  return (
    // eslint-disable-next-line @next/next/no-img-element -- mixed TW JPEG redirects + SVG
    <img
      src={src}
      alt={alt}
      width={size === "lg" ? 128 : size === "md" ? 64 : 44}
      height={size === "lg" ? 176 : size === "md" ? 80 : 56}
      loading="lazy"
      decoding="async"
      className={`${dim} shrink-0 rounded-md object-contain object-center`}
      style={{
        background:
          "linear-gradient(160deg, rgba(232,239,233,0.08), rgba(0,0,0,0.35))",
        boxShadow: "inset 0 0 0 1px var(--line)",
      }}
      onError={(e) => {
        const img = e.currentTarget;
        if (img.dataset.fallback === "1") return;
        if (src.includes("/api/equipment/") && !src.includes("format=svg")) {
          img.dataset.fallback = "1";
          img.src = `${src}${src.includes("?") ? "&" : "?"}format=svg`;
        }
      }}
    />
  );
}
