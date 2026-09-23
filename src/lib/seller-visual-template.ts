import { isHomeImageSlot } from "@/lib/home-images";
import { createServiceClient } from "@/lib/supabase/server";

const BUCKET = "seller-logos";

type AdminClient = NonNullable<ReturnType<typeof createServiceClient>>;

function fileExt(path: string) {
  const match = path.toLowerCase().match(/\.(png|jpe?g|webp)$/);
  if (!match) return "png";
  return match[1] === "jpeg" ? "jpg" : match[1];
}

function looksLikeTeodoro(row: { name?: string | null; business_name?: string | null; slug?: string | null }) {
  const haystack = `${row.name ?? ""} ${row.business_name ?? ""} ${row.slug ?? ""}`.toLowerCase();
  return haystack.includes("teodoro");
}

async function copyStorageFile(admin: AdminClient, fromPath: string, toPath: string) {
  if (!fromPath || fromPath === toPath) return fromPath;
  const copied = await admin.storage.from(BUCKET).copy(fromPath, toPath);
  if (!copied.error) return toPath;
  const downloaded = await admin.storage.from(BUCKET).download(fromPath);
  if (downloaded.error || !downloaded.data) return null;
  const blob = downloaded.data;
  const uploaded = await admin.storage.from(BUCKET).upload(toPath, blob, {
    upsert: true,
    contentType: blob.type || "image/jpeg",
    cacheControl: "0",
  });
  if (uploaded.error) return null;
  return toPath;
}

async function findTemplateSellerId(admin: AdminClient, excludeId: string) {
  const { data: sellers } = await admin
    .from("sellers")
    .select("id, name, business_name, slug")
    .neq("id", excludeId);
  const named = (sellers ?? []).find((row) => looksLikeTeodoro(row));
  if (named?.id) return String(named.id);

  const { data: images } = await admin.from("home_images").select("seller_id").neq("seller_id", excludeId);
  const counts = new Map<string, number>();
  for (const row of images ?? []) {
    const id = String(row.seller_id ?? "");
    if (!id) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  let bestId = "";
  let bestCount = 0;
  for (const [id, count] of counts) {
    if (count > bestCount) {
      bestId = id;
      bestCount = count;
    }
  }
  if (bestId) return bestId;

  const { data: withBanner } = await admin
    .from("sellers")
    .select("id")
    .neq("id", excludeId)
    .not("store_banner_path", "is", null)
    .limit(1)
    .maybeSingle();
  return withBanner?.id ? String(withBanner.id) : null;
}

export async function copySellerVisualTemplate(targetSellerId: string) {
  const admin = createServiceClient();
  if (!admin || !targetSellerId) return;

  const sourceId = await findTemplateSellerId(admin, targetSellerId);
  if (!sourceId || sourceId === targetSellerId) return;

  const [{ data: source }, { count: targetImageCount }, { data: target }] = await Promise.all([
    admin
      .from("sellers")
      .select(
        "store_banner_enabled, store_banner_kicker, store_banner_title, store_banner_accent, store_banner_description, store_message, store_banner_path",
      )
      .eq("id", sourceId)
      .maybeSingle(),
    admin.from("home_images").select("id", { count: "exact", head: true }).eq("seller_id", targetSellerId),
    admin.from("sellers").select("store_banner_path").eq("id", targetSellerId).maybeSingle(),
  ]);
  if (!source) return;

  if (!target?.store_banner_path) {
    const patch: Record<string, unknown> = {
      store_banner_enabled: source.store_banner_enabled !== false,
      store_banner_kicker: String(source.store_banner_kicker ?? ""),
      store_banner_title: String(source.store_banner_title ?? ""),
      store_banner_accent: String(source.store_banner_accent ?? ""),
      store_banner_description: String(source.store_banner_description ?? ""),
      store_message: String(source.store_message ?? ""),
    };
    const sourceBanner = source.store_banner_path ? String(source.store_banner_path) : "";
    if (sourceBanner) {
      const destBanner = `${targetSellerId}/store/banner.${fileExt(sourceBanner)}`;
      const copied = await copyStorageFile(admin, sourceBanner, destBanner);
      if (copied) patch.store_banner_path = copied;
    }
    await admin.from("sellers").update(patch).eq("id", targetSellerId);
  }

  if ((targetImageCount ?? 0) > 0) return;

  const { data: images } = await admin.from("home_images").select("slot, storage_path").eq("seller_id", sourceId);
  for (const row of images ?? []) {
    const slot = String(row.slot ?? "");
    if (!isHomeImageSlot(slot)) continue;
    const fromPath = String(row.storage_path ?? "");
    if (!fromPath) continue;
    const toPath = `${targetSellerId}/home/${slot}.${fileExt(fromPath)}`;
    const copied = await copyStorageFile(admin, fromPath, toPath);
    if (!copied) continue;
    await admin.from("home_images").upsert(
      { seller_id: targetSellerId, slot, storage_path: copied },
      { onConflict: "seller_id,slot" },
    );
  }
}

export async function ensureSellerVisualTemplate(sellerId: string | null) {
  if (!sellerId) return;
  const admin = createServiceClient();
  if (!admin) return;
  const [{ count }, { data: me }] = await Promise.all([
    admin.from("home_images").select("id", { count: "exact", head: true }).eq("seller_id", sellerId),
    admin.from("sellers").select("store_banner_path").eq("id", sellerId).maybeSingle(),
  ]);
  if ((count ?? 0) > 0 && me?.store_banner_path) return;
  await copySellerVisualTemplate(sellerId);
}
