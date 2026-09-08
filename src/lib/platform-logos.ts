export const PLATFORM_LOGO_KEYS = [
  "netflix",
  "max",
  "disney-premium",
  "disney-estandar",
  "prime",
  "crunchyroll",
  "spotify",
  "apple-tv",
  "paramount",
  "youtube",
  "movistar",
  "claro",
  "directv",
  "universal",
  "vix",
  "viki",
  "iptv",
] as const;

export type PlatformLogoKey = (typeof PLATFORM_LOGO_KEYS)[number];

/** Rutas centralizadas. No repetir estos paths en la UI. */
export const PLATFORM_LOGO_SRC: Record<PlatformLogoKey, string> = {
  netflix: "/platforms/netflix.png",
  max: "/platforms/hbo-max.jpg",
  "disney-premium": "/platforms/disney-plus-premium.jpg",
  "disney-estandar": "/platforms/disney-plus-estandar.jpg",
  prime: "/platforms/prime-video.jpg",
  crunchyroll: "/platforms/crunchyroll.jpg",
  spotify: "/platforms/spotify.jpg",
  "apple-tv": "/platforms/apple-tv.jpg",
  paramount: "/platforms/paramount-plus.jpg",
  youtube: "/platforms/youtube-premium.jpg",
  movistar: "/platforms/movistar-play.jpg",
  claro: "/platforms/claro-video.jpg",
  directv: "/platforms/directv-go.jpg",
  universal: "/platforms/universal-plus.jpg",
  vix: "/platforms/vix.jpg",
  viki: "/platforms/rakuten-viki.jpg",
  iptv: "/platforms/iptv.jpg",
};

const PLATFORM_DISPLAY_NAME: Record<PlatformLogoKey, string> = {
  netflix: "Netflix",
  max: "HBO MAX",
  "disney-premium": "Disney+ Premium",
  "disney-estandar": "Disney+ Estándar",
  prime: "Prime Video",
  crunchyroll: "Crunchyroll",
  spotify: "Spotify",
  "apple-tv": "Apple TV+",
  paramount: "Paramount+",
  youtube: "YouTube Premium",
  movistar: "Movistar Play",
  claro: "Claro video",
  directv: "DIRECTV GO",
  universal: "Universal+",
  vix: "ViX",
  viki: "Rakuten Viki",
  iptv: "IPTV",
};

export const PLATFORM_LOGO_SIZE = {
  filter: 20,
  table: 22,
  card: 36,
  detail: 40,
} as const;

export type PlatformLogoSize = keyof typeof PLATFORM_LOGO_SIZE | number;

export type PlatformLogoInput =
  | PlatformLogoKey
  | string
  | {
      id?: string | null;
      slug?: string | null;
      name?: string | null;
      logoUrl?: string | null;
    };

export function platformLogoPublicUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("/")) return path;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!base) return null;
  return `${base}/storage/v1/object/public/platform-logos/${path.replace(/^\/+/, "")}`;
}

function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9+]+/g, " ")
    .trim();
}

export function resolvePlatformLogoKey(platform: PlatformLogoInput | null | undefined): PlatformLogoKey | null {
  if (!platform) return null;
  const raw =
    typeof platform === "string"
      ? platform
      : [platform.slug, platform.name, platform.id].filter(Boolean).join(" ");
  const text = fold(raw);
  if (!text) return null;

  if (PLATFORM_LOGO_KEYS.includes(text as PlatformLogoKey)) return text as PlatformLogoKey;

  if (text.includes("netflix")) return "netflix";
  if (text.includes("youtube")) return "youtube";
  if (text.includes("movistar")) return "movistar";
  if (text.includes("claro")) return "claro";
  if (text.includes("directv") || text.includes("direc tv")) return "directv";
  if (text.includes("universal")) return "universal";
  if (text.includes("viki") || text.includes("rakuten")) return "viki";
  if (/\bvix\b/.test(text)) return "vix";
  if (text.includes("iptv")) return "iptv";
  if (text.includes("disney") && (text.includes("estandar") || text.includes("standard"))) return "disney-estandar";
  if (text.includes("disney")) return "disney-premium";
  if (/\bmax\b/.test(text) || text.includes("hbo")) return "max";
  if (text.includes("prime") || text.includes("amazon")) return "prime";
  if (text.includes("crunchy")) return "crunchyroll";
  if (text.includes("spotify")) return "spotify";
  if (text.includes("apple")) return "apple-tv";
  if (text.includes("paramount")) return "paramount";

  return null;
}

export function platformDisplayName(platform: PlatformLogoInput | null | undefined): string {
  const key = resolvePlatformLogoKey(platform);
  if (key) return PLATFORM_DISPLAY_NAME[key];
  if (typeof platform === "string") return platform;
  return platform?.name || platform?.slug || "";
}

export function orderPlatformLabel(
  order: { platformId?: string; platformName?: string },
  platforms: PlatformLogoInput[],
) {
  const platform = platforms.find((item) => typeof item !== "string" && item.id === order.platformId);
  return platformDisplayName(platform ?? order.platformName) || "Servicio";
}

export function platformLogoSrc(platform: PlatformLogoInput | null | undefined): string | null {
  if (platform && typeof platform !== "string" && platform.logoUrl) return platform.logoUrl;
  const key = resolvePlatformLogoKey(platform);
  return key ? PLATFORM_LOGO_SRC[key] : null;
}

export function platformLogoPx(size: PlatformLogoSize = "table") {
  return typeof size === "number" ? size : PLATFORM_LOGO_SIZE[size];
}
