"use server";

import { revalidatePath } from "next/cache";
import { getAppSession, requireRole } from "@/lib/auth/get-session";
import { customersDisabledMessage } from "@/lib/admin-contact";
import { whatsappParaGuardar } from "@/lib/clientes";
import { ensureCustomerLogin } from "@/lib/customer-login";
import { loadAdminWhatsapp, sellerCanCreateCustomers } from "@/lib/seller-permissions";
import { createServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Clientes del vendedor (Mi Bot).
 * - Crear: solo si la administradora le activó "Crear clientes". El cliente entra con su correo, sin clave.
 * - Editar y Pausar/Reactivar: solo sus propios clientes.
 * - Eliminar: NO (solo la administradora).
 */

type Result = { ok: true; message?: string } | { ok: false; error: string };

async function sellerContext() {
  if (!isSupabaseConfigured()) return { error: "Supabase no está configurado. La acción quedó en modo demo." } as const;
  const session = await getAppSession();
  requireRole(session, ["seller"]);
  if (!session.sellerId) return { error: "Vendedor no encontrado." } as const;
  const admin = createServiceClient();
  if (!admin) return { error: "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor." } as const;
  return { admin, sellerId: session.sellerId } as const;
}

function refresh() {
  revalidatePath("/panel/correos");
  revalidatePath("/admin/clientes");
}

export async function sellerUpsertCustomerAction(formData: FormData): Promise<Result> {
  const ctx = await sellerContext();
  if ("error" in ctx) return { ok: false, error: ctx.error ?? "No autorizado." };
  const { admin, sellerId } = ctx;

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const whatsapp = whatsappParaGuardar(String(formData.get("whatsapp") ?? ""));
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!name) return { ok: false, error: "Escribe el nombre del cliente." };
  if (!whatsapp) return { ok: false, error: "El celular debe tener 9 dígitos." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Escribe un correo válido: con ese correo entrará el cliente." };
  }

  let currentProfileId: string | null = null;
  if (id) {
    const { data: row } = await admin.from("customers").select("seller_id, profile_id").eq("id", id).maybeSingle();
    if (!row || String(row.seller_id) !== sellerId) return { ok: false, error: "No autorizado." };
    currentProfileId = row.profile_id ? String(row.profile_id) : null;
  } else if (!(await sellerCanCreateCustomers(sellerId))) {
    return { ok: false, error: customersDisabledMessage(await loadAdminWhatsapp()) };
  }

  const login = await ensureCustomerLogin(admin, email, whatsapp, name, currentProfileId);
  if ("error" in login) return { ok: false, error: login.error };

  const payload = { seller_id: sellerId, name, whatsapp, email, profile_id: login.id };
  const { error } = id
    ? await admin.from("customers").update(payload).eq("id", id).eq("seller_id", sellerId)
    : await admin.from("customers").insert({ ...payload, status: "active" });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Ya tienes un cliente con ese celular." };
    return { ok: false, error: error.message };
  }
  refresh();
  return { ok: true, message: id ? "Cliente actualizado." : "Cliente creado. Ya puede entrar con su correo." };
}

export async function sellerSetCustomerStatusAction(id: string, paused: boolean): Promise<Result> {
  const ctx = await sellerContext();
  if ("error" in ctx) return { ok: false, error: ctx.error ?? "No autorizado." };
  const { data, error } = await ctx.admin
    .from("customers")
    .update({ status: paused ? "suspended" : "active" })
    .eq("id", id)
    .eq("seller_id", ctx.sellerId)
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) return { ok: false, error: "No autorizado." };
  refresh();
  return { ok: true, message: paused ? "Acceso pausado." : "Acceso reactivado." };
}
