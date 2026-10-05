"use server";

import { revalidatePath } from "next/cache";
import { getAppSession, requireRole } from "@/lib/auth/get-session";
import { whatsappParaGuardar } from "@/lib/clientes";
import { ensureCustomerLogin } from "@/lib/customer-login";
import { createServiceClient } from "@/lib/supabase/server";
import { DIRECT_SALES_SLUG } from "@/lib/direct-sales";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Clientes desde el panel de la administradora.
 * - Los clientes propios quedan bajo un vendedor interno "Venta directa" (la base de datos exige un vendedor).
 * - Crear un cliente también le da acceso: entra con su correo, sin clave.
 * - Pausar = el cliente no puede entrar a su panel. Eliminar solo si no tiene servicios ni pedidos.
 */

type Result = { ok: true; message?: string } | { ok: false; error: string };

async function adminContext() {
  if (!isSupabaseConfigured()) return { error: "Supabase no está configurado. La acción quedó en modo demo." } as const;
  const session = await getAppSession();
  requireRole(session, ["superadmin", "support"]);
  const admin = createServiceClient();
  if (!admin) return { error: "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor." } as const;
  return { admin, session } as const;
}

type AdminClient = NonNullable<ReturnType<typeof createServiceClient>>;

/** Devuelve el id del vendedor interno "Venta directa"; lo crea la primera vez. */
async function ensureDirectSalesSeller(admin: AdminClient, email: string): Promise<string | null> {
  const { data: existing } = await admin.from("sellers").select("id").eq("slug", DIRECT_SALES_SLUG).maybeSingle();
  if (existing?.id) return String(existing.id);
  const { data: created, error } = await admin
    .from("sellers")
    .insert({
      name: "Venta directa",
      business_name: "Venta directa",
      slug: DIRECT_SALES_SLUG,
      email: email || "venta-directa@panelstreaming.local",
      status: "active",
    })
    .select("id")
    .maybeSingle();
  if (error || !created?.id) return null;
  return String(created.id);
}

/** Crea el vendedor interno si todavía no existe, para poder cargar su tienda. */
export async function prepareDirectSalesSeller(): Promise<{ ok: true; sellerId: string } | { ok: false; error: string }> {
  const ctx = await adminContext();
  if ("error" in ctx) return { ok: false, error: ctx.error ?? "No autorizado." };
  const sellerId = await ensureDirectSalesSeller(ctx.admin, ctx.session.email);
  if (!sellerId) return { ok: false, error: "No se pudo preparar Venta directa." };
  return { ok: true, sellerId };
}

function refresh() {
  revalidatePath("/admin/clientes");
  revalidatePath("/panel/clientes");
}

export async function adminUpsertCustomerAction(formData: FormData): Promise<Result> {
  const ctx = await adminContext();
  if ("error" in ctx) return { ok: false, error: ctx.error ?? "No autorizado." };
  const { admin, session } = ctx;

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const whatsapp = whatsappParaGuardar(String(formData.get("whatsapp") ?? ""));
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  let sellerId = String(formData.get("sellerId") ?? "").trim();

  if (!name) return { ok: false, error: "Escribe el nombre del cliente." };
  if (!whatsapp) return { ok: false, error: "El celular debe tener 9 dígitos." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Escribe un correo válido: con ese correo entrará el cliente." };
  }

  if (!sellerId) {
    const direct = await ensureDirectSalesSeller(admin, session.email);
    if (!direct) return { ok: false, error: "No se pudo preparar \"Venta directa\"." };
    sellerId = direct;
  }

  let currentProfileId: string | null = null;
  if (id) {
    const { data: row } = await admin.from("customers").select("profile_id").eq("id", id).maybeSingle();
    currentProfileId = row?.profile_id ? String(row.profile_id) : null;
  }
  const login = await ensureCustomerLogin(admin, email, whatsapp, name, currentProfileId);
  if ("error" in login) return { ok: false, error: login.error };

  const payload = { seller_id: sellerId, name, whatsapp, email, profile_id: login.id };
  const { error } = id
    ? await admin.from("customers").update(payload).eq("id", id)
    : await admin.from("customers").insert({ ...payload, status: "active" });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Ese celular ya está registrado para este vendedor." };
    return { ok: false, error: error.message };
  }
  refresh();
  return { ok: true, message: id ? "Cliente actualizado." : "Cliente creado. Ya puede entrar con su correo." };
}

export async function adminSetCustomerStatusAction(id: string, paused: boolean): Promise<Result> {
  const ctx = await adminContext();
  if ("error" in ctx) return { ok: false, error: ctx.error ?? "No autorizado." };
  const { error } = await ctx.admin
    .from("customers")
    .update({ status: paused ? "suspended" : "active" })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true, message: paused ? "Acceso pausado." : "Acceso reactivado." };
}

export async function adminDeleteCustomerAction(id: string): Promise<Result> {
  const ctx = await adminContext();
  if ("error" in ctx) return { ok: false, error: ctx.error ?? "No autorizado." };
  const { admin } = ctx;

  const [{ count: services }, { count: orders }] = await Promise.all([
    admin.from("services").select("id", { count: "exact", head: true }).eq("customer_id", id),
    admin.from("orders").select("id", { count: "exact", head: true }).eq("customer_id", id),
  ]);
  if ((services ?? 0) > 0 || (orders ?? 0) > 0) {
    return {
      ok: false,
      error: "Este cliente tiene servicios o pedidos registrados. Para no perder ese historial, mejor pausa su acceso.",
    };
  }

  const { data: row } = await admin.from("customers").select("profile_id").eq("id", id).maybeSingle();
  const { error } = await admin.from("customers").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  // Si ese acceso ya no pertenece a ningún otro cliente, se borra también el usuario de acceso.
  const profileId = row?.profile_id ? String(row.profile_id) : null;
  if (profileId) {
    const { count } = await admin
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profileId);
    const { data: profile } = await admin.from("profiles").select("role").eq("id", profileId).maybeSingle();
    if ((count ?? 0) === 0 && profile?.role === "customer") {
      await admin.auth.admin.deleteUser(profileId);
    }
  }
  refresh();
  return { ok: true, message: "Cliente eliminado." };
}
