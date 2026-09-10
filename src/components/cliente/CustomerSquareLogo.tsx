import {
  colorWithAlpha,
  customerBrandCardStyle,
  customerPlatformLogoSrc,
  type PlatformLogoInput,
} from "@/lib/platform-logos";

export function CustomerSquareLogo({
  platform,
  title,
  size = 48,
}: {
  platform: PlatformLogoInput | null | undefined;
  title: string;
  size?: number;
}) {
  const src = customerPlatformLogoSrc(platform);
  const theme = customerBrandCardStyle(platform).theme;

  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-[10px] bg-black/50 ring-1 ring-white/10"
      style={{
        width: size,
        height: size,
        boxShadow: `0 0 18px ${colorWithAlpha(theme.to, 0.35)}`,
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-contain p-[3px]" />
      ) : (
        <span className="text-sm font-bold text-white">{title.slice(0, 1)}</span>
      )}
    </span>
  );
}

export function customerBrandSurfaceStyle(platform: PlatformLogoInput | null | undefined) {
  const { background, borderColor, boxShadow } = customerBrandCardStyle(platform);
  return { background, borderColor, boxShadow };
}
