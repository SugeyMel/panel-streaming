"use server";

import { revalidatePath } from "next/cache";
import { prepareDirectSalesSeller } from "@/app/actions/admin-customers";
import { DIRECT_ASSIGNED_PRODUCT_NAME } from "@/lib/direct-sales";
import { createServiceClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

const DURATION_DAYS = [30, 90, 180, 365] as const;

function optionalMoney(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim().replace(",", ".");
  if (!raw) return null;
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return amount;
}

/** Productos de la tienda que ven los clientes de Venta directa. */
export async function adminUpsertDirectProductAction(formData: FormData): Promise<Result> {
  const ready = await prepareDirectSalesSeller();
  if (!ready.ok) return ready;
  const admin = createServiceClient();
  if (!admin) return { ok: false, error: "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor." };

  const sellerId = ready.sellerId;
  const platformId = String(formData.get("platformId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "");
  const costPrice = Number(formData.get("costPrice") || 0);
  const stock = Number(formData.get("stock") || 0);
  const status = String(formData.get("active") ?? "true") === "true" ? "active" : "inactive";
  const onOffer = formData.getAll("onOffer").includes("true");
  const compareAt = optionalMoney(formData.get("compareAtPrice"));
  const groupPlatformId = String(formData.get("groupPlatformId") ?? platformId);
  const groupName = String(formData.get("groupName") ?? name);
  if (!name || !platformId) return { ok: false, error: "Elige la plataforma." };
  if (name === DIRECT_ASSIGNED_PRODUCT_NAME || groupName === DIRECT_ASSIGNED_PRODUCT_NAME) {
    return { ok: false, error: "Ese nombre está reservado para las cuentas asignadas." };
  }

  const { data: siblings, error: loadError } = await admin
    .from("products")
    .select("*")
    .eq("seller_id", sellerId)
    .eq("platform_id", groupPlatformId)
    .eq("name", groupName);
  if (loadError) return { ok: false, error: loadError.message };

  const prices = DURATION_DAYS.map((days) => ({
    days,
    amount: optionalMoney(formData.get(`price${days}`)),
  }));
  if (prices.every((item) => item.amount == null) && !(siblings ?? []).length) {
    return { ok: false, error: "Pon al menos un precio (1, 3, 6 o 12 meses)." };
  }

  for (const term of prices) {
    const existing = (siblings ?? []).find((row) => Number(row.duration_days) === term.days);
    const payload = {
      seller_id: sellerId,
      platform_id: platformId,
      name,
      description,
      cost_price: costPrice,
      sale_price: term.amount ?? existing?.sale_price ?? 0,
      duration_days: term.days,
      status: term.amount == null ? "inactive" : status,
      stock,
      on_offer: onOffer,
      compare_at_price: onOffer ? compareAt : null,
    };
    if (existing) {
      const { error } = await admin.from("products").update(payload).eq("id", existing.id).eq("seller_id", sellerId);
      if (error) return { ok: false, error: error.message };
    } else if (term.amount != null) {
      const { error } = await admin.from("products").insert(payload);
      if (error) return { ok: false, error: error.message };
    }
  }

  revalidatePath("/admin/productos");
  revalidatePath("/cliente");
  revalidatePath("/cliente/comprar");
  revalidatePath("/tienda/venta-directa");
  return { ok: true };
}
