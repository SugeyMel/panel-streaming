import { revalidatePath } from "next/cache";
import { getAppSession, requireRole } from "@/lib/auth/get-session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { writeSupplierProductImage } from "@/lib/supplier-product-upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return Response.json({ ok: false, error: "Supabase no está configurado." }, { status: 400 });
  }
  try {
    const session = await getAppSession();
    requireRole(session, ["superadmin"]);
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "No autorizado" },
      { status: 401 },
    );
  }

  const formData = await request.formData();
  const productId = String(formData.get("id") ?? "").trim();
  if (!productId) {
    return Response.json({ ok: false, error: "Falta el producto." }, { status: 400 });
  }
  const rawImage = formData.get("image") ?? formData.getAll("image")[0];
  const file =
    rawImage instanceof File && rawImage.size > 0
      ? rawImage
      : typeof Blob !== "undefined" && rawImage instanceof Blob && rawImage.size > 0
        ? new File([rawImage], "imagen.jpg", { type: rawImage.type || "image/jpeg" })
        : null;
  const remove = String(formData.get("removeImage") ?? "") === "1";
  if (!file && !remove) {
    return Response.json(
      { ok: false, error: "No llegó la imagen. Elige el archivo otra vez y guarda." },
      { status: 400 },
    );
  }

  const result = await writeSupplierProductImage(productId, file, remove && !file);
  if (result.ok) {
    revalidatePath("/admin/mayorista");
    revalidatePath("/panel");
    revalidatePath("/panel/mayorista");
  }
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
