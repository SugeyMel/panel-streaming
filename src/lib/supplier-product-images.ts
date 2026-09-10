const BUCKET = "supplier-product-images";

export function supplierProductImagePublicUrl(
  path: string | null | undefined,
  version?: string | null,
): string | null {
  if (!path) return null;
  const raw =
    path.startsWith("http://") || path.startsWith("https://") || path.startsWith("/")
      ? path
      : (() => {
          const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
          if (!base) return null;
          return `${base}/storage/v1/object/public/${BUCKET}/${path.replace(/^\/+/, "")}`;
        })();
  if (!raw) return null;
  const v = version?.trim();
  if (!v) return raw;
  return `${raw}${raw.includes("?") ? "&" : "?"}v=${encodeURIComponent(v)}`;
}
