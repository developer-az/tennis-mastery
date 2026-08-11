"use client";

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
    size === "lg" ? "h-40 w-40" : size === "md" ? "h-24 w-24" : "h-12 w-12";

  return (
    <img
      src={src}
      alt={alt}
      width={size === "lg" ? 160 : size === "md" ? 96 : 48}
      height={size === "lg" ? 160 : size === "md" ? 96 : 48}
      loading="lazy"
      decoding="async"
      className={`${dim} shrink-0 rounded-md object-cover`}
      style={{
        background: "rgba(0,0,0,0.25)",
        boxShadow: "inset 0 0 0 1px var(--line)",
      }}
    />
  );
}
