"use client";

import {
  platformDisplayName,
  platformLogoPx,
  platformLogoSrc,
  type PlatformLogoInput,
  type PlatformLogoSize,
} from "@/lib/platform-logos";

export function PlatformLogo({
  platform,
  size = "table",
  className = "",
  alt,
}: {
  platform: PlatformLogoInput;
  size?: PlatformLogoSize;
  className?: string;
  alt?: string;
}) {
  const src = platformLogoSrc(platform);
  const px = platformLogoPx(size);
  if (!src) return null;
  const label = alt ?? (platformDisplayName(platform) || "Plataforma");

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={label}
      width={px}
      height={px}
      className={`shrink-0 object-contain ${className}`}
      style={{ width: px, height: px }}
      suppressHydrationWarning
    />
  );
}

export function PlatformName({
  platform,
  label,
  size = "table",
  className = "",
}: {
  platform: PlatformLogoInput;
  label?: string;
  size?: PlatformLogoSize;
  className?: string;
}) {
  const text = label ?? platformDisplayName(platform);

  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 ${className}`}>
      <PlatformLogo platform={platform} size={size} alt={text} />
      <span className="truncate">{text}</span>
    </span>
  );
}
