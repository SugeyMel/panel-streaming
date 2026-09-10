import { createClient, createServiceClient } from "@/lib/supabase/server";
import { supplierProductImagePublicUrl } from "@/lib/supplier-product-images";
import { parseImageToken, withImageToken } from "@/lib/wholesale";

const BUCKET = "supplier-product-images";
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp"]);

function imageMime(file: File) {
  if (file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg")) return null;
  if (ALLOWED.has(file.type)) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  return null;
}

function imageExt(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

function uploadHint(message: string) {
  if (/service.?role|jwt|invalid api key/i.test(message)) {
    return "Falta SUPABASE_SERVICE_ROLE_KEY en .env.local (la clave service_role de Supabase, no la anon).";
  }
  if (/bucket not found|not found|does not exist/i.test(message)) {
    return "No existe el bucket supplier-product-images. Créalo en Supabase → Storage (público) o vuelve a guardar para que la app lo cree.";
  }
  if (/row-level security|permission|not allowed|policy/i.test(message)) {
    return "Supabase bloqueó la subida. Usa la clave service_role o ejecuta el SQL 0020_supplier_product_images.sql.";
  }
  return message;
}

async function ensurePublicBucket() {
  const admin = createServiceClient();
  if (!admin) {
    return {
      ok: false as const,
      error: "Falta SUPABASE_SERVICE_ROLE_KEY en .env.local para subir fotos mayoristas.",
    };
  }
  const { data: buckets, error: listError } = await admin.storage.listBuckets();
  if (listError) return { ok: false as const, error: uploadHint(listError.message) };
  const exists = (buckets ?? []).some((item) => item.id === BUCKET || item.name === BUCKET);
  if (!exists) {
    const { error } = await admin.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: MAX_BYTES,
    });
    if (error && !/already exists|duplicate|exists/i.test(error.message)) {
      return { ok: false as const, error: uploadHint(error.message) };
    }
  } else {
    await admin.storage.updateBucket(BUCKET, { public: true });
  }
  return { ok: true as const, admin };
}

async function readProductImageState(productId: string) {
  const supabase = await createClient();
  if (!supabase) return { notes: "", previousPath: null as string | null };
  const withColumn = await supabase.from("supplier_products").select("notes, image_path").eq("id", productId).maybeSingle();
  if (!withColumn.error) {
    const notes = withColumn.data?.notes ? String(withColumn.data.notes) : "";
    const previousPath = withColumn.data?.image_path ? String(withColumn.data.image_path) : parseImageToken(notes);
    return { notes, previousPath };
  }
  const withoutColumn = await supabase.from("supplier_products").select("notes").eq("id", productId).maybeSingle();
  const notes = withoutColumn.data?.notes ? String(withoutColumn.data.notes) : "";
  return { notes, previousPath: parseImageToken(notes) };
}

async function persistImagePath(productId: string, path: string | null, currentNotes: string) {
  const supabase = await createClient();
  const admin = createServiceClient() ?? supabase;
  if (!admin) return { ok: false as const, error: "Sin cliente" };
  const writer = admin;
  const { error } = await writer.from("supplier_products").update({ image_path: path }).eq("id", productId);
  if (!error) return { ok: true as const };
  if (!/image_path|schema cache|does not exist/i.test(error.message)) {
    return { ok: false as const, error: error.message };
  }
  const { error: notesError } = await writer
    .from("supplier_products")
    .update({ notes: withImageToken(currentNotes, path) || null })
    .eq("id", productId);
  if (notesError) return { ok: false as const, error: notesError.message };
  return { ok: true as const };
}

export async function writeSupplierProductImage(productId: string, file: File | null, remove: boolean) {
  const bucket = await ensurePublicBucket();
  if (!bucket.ok) return bucket;
  const uploader = bucket.admin;
  const current = await readProductImageState(productId);
  const previousPath = current.previousPath;

  if (remove && !file) {
    if (previousPath) {
      await uploader.storage.from(BUCKET).remove([previousPath]);
    }
    const persisted = await persistImagePath(productId, null, current.notes);
    if (!persisted.ok) return persisted;
    return { ok: true as const, imageUrl: null as string | null };
  }

  if (!file) return { ok: true as const, imageUrl: supplierProductImagePublicUrl(previousPath, String(Date.now())) };

  const mime = imageMime(file);
  if (!mime) return { ok: false as const, error: "La imagen debe ser PNG, WEBP o JPG. SVG no está permitido." };
  if (file.size > MAX_BYTES) return { ok: false as const, error: "La imagen no puede superar 8 MB." };
  const path = `${productId}/image-${Date.now()}.${imageExt(mime)}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  let { error: uploadError } = await uploader.storage
    .from(BUCKET)
    .upload(path, bytes, { upsert: true, contentType: mime, cacheControl: "3600" });
  if (uploadError && /bucket not found|not found/i.test(uploadError.message)) {
    const created = await ensurePublicBucket();
    if (!created.ok) return created;
    ({ error: uploadError } = await created.admin.storage
      .from(BUCKET)
      .upload(path, bytes, { upsert: true, contentType: mime, cacheControl: "3600" }));
  }
  if (uploadError) return { ok: false as const, error: uploadHint(uploadError.message) };

  const persisted = await persistImagePath(productId, path, current.notes);
  if (!persisted.ok) return persisted;
  if (previousPath && previousPath !== path) {
    await uploader.storage.from(BUCKET).remove([previousPath]);
  }
  return { ok: true as const, imageUrl: supplierProductImagePublicUrl(path, String(Date.now())) };
}
