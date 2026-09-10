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
      customerLogoUrl?: string | null;
      accentFrom?: string | null;
      accentTo?: string | null;
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
  if (key === "max") return "HBO MAX";
  if (key) return PLATFORM_DISPLAY_NAME[key];
  if (typeof platform === "string") return platform;
  return platform?.name || platform?.slug || "";
}

/** Max se muestra siempre como HBO MAX. El resto respeta el nombre guardado. */
export function canonicalPlatformName(platform: PlatformLogoInput | null | undefined): string {
  const key = resolvePlatformLogoKey(platform);
  if (key === "max") return "HBO MAX";
  if (typeof platform === "string") return platform.trim();
  return (platform?.name || "").trim();
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

/** Logo cuadrado de Inicio cliente. No usa el horizontal de tienda ni fotos de mayorista. */
export function customerPlatformLogoSrc(platform: PlatformLogoInput | null | undefined): string | null {
  if (platform && typeof platform !== "string" && platform.customerLogoUrl) return platform.customerLogoUrl;
  const key = resolvePlatformLogoKey(platform);
  return key ? PLATFORM_LOGO_SRC[key] : null;
}

const PLATFORM_CARD_ACCENT: Partial<Record<PlatformLogoKey, { from: string; to: string }>> = {
  netflix: { from: "#3f0d0d", to: "#e50914" },
  "disney-premium": { from: "#041c3c", to: "#1a8cff" },
  "disney-estandar": { from: "#041c3c", to: "#1a8cff" },
  max: { from: "#1a1033", to: "#7c3aed" },
  prime: { from: "#082f49", to: "#38bdf8" },
  crunchyroll: { from: "#431407", to: "#f97316" },
  paramount: { from: "#1e3a8a", to: "#60a5fa" },
  spotify: { from: "#052e16", to: "#22c55e" },
  "apple-tv": { from: "#111827", to: "#94a3b8" },
  youtube: { from: "#450a0a", to: "#ef4444" },
};

function hexToRgb(hex: string): [number, number, number] | null {
  const value = hex.trim().replace("#", "");
  const full = value.length === 3 ? value.split("").map((ch) => `${ch}${ch}`).join("") : value;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  const n = Number.parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function colorWithAlpha(hex: string, alpha: number) {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(124, 58, 237, ${alpha})`;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

export function platformCardTheme(platform: PlatformLogoInput | null | undefined) {
  const key = resolvePlatformLogoKey(platform);
  const fallback = (key && PLATFORM_CARD_ACCENT[key]) || { from: "#111827", to: "#7c3aed" };
  const from =
    platform && typeof platform !== "string" && platform.accentFrom ? platform.accentFrom : fallback.from;
  const to = platform && typeof platform !== "string" && platform.accentTo ? platform.accentTo : fallback.to;
  const rgb = hexToRgb(to);
  const light = rgb ? (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255 > 0.64 : false;
  return { from, to, badge: light ? from : to };
}

export function customerBrandCardStyle(platform: PlatformLogoInput | null | undefined) {
  const theme = platformCardTheme(platform);
  return {
    theme,
    background: `radial-gradient(ellipse 80% 140% at 8% 50%, ${colorWithAlpha(theme.to, 0.58)} 0%, transparent 62%), linear-gradient(90deg, ${colorWithAlpha(theme.from, 0.95)} 0%, #080c14 62%)`,
    borderColor: colorWithAlpha(theme.to, 0.55),
    boxShadow: `inset 0 1px 0 ${colorWithAlpha("#ffffff", 0.06)}, 0 0 0 1px ${colorWithAlpha(theme.to, 0.12)}`,
  };
}

export function platformLogoPx(size: PlatformLogoSize = "table") {
  return typeof size === "number" ? size : PLATFORM_LOGO_SIZE[size];
}

/** Plataformas que el catálogo mayorista necesita aunque no estén en el seed original. */
export const REQUIRED_PLATFORM_SEEDS = [
  {
    slug: "disney-estandar",
    name: "Disney Estándar",
    tagline: "Plan estándar de Disney+",
    available: true,
    accent_from: "#0f172a",
    accent_to: "#2563eb",
  },
  {
    slug: "disney-premium",
    name: "Disney Premium",
    tagline: "Plan premium de Disney+",
    available: true,
    accent_from: "#0f172a",
    accent_to: "#2563eb",
  },
] as const;
