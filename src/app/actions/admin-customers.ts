"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getAppSession, requireRole } from "@/lib/auth/get-session";
import { phoneToAuthEmail } from "@/lib/auth/phone-login";
import { whatsappParaGuardar } from "@/lib/clientes";
import { createServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Clientes desde el panel de la administradora.
 * - Los clientes propios quedan bajo un vendedor interno "Venta directa" (la base de datos exige un vendedor).
 * - Crear un cliente también le da acceso: entra con su celular, sin clave.
 * - Pausar = el cliente no puede entrar a su panel. Eliminar solo si no tiene servicios ni pedidos.
 */

type Result = { ok: true; message?: string } | { ok: false; error: string };

const DIRECT_SALES_SLUG = "venta-directa";

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

/** Crea (o reutiliza) el usuario de acceso del cliente: entra con su celular, sin clave. */
async function ensureCustomerLogin(admin: AdminClient, whatsapp: string, name: string): Promise<string | null> {
  const authEmail = phoneToAuthEmail(whatsapp);
  const { data: profile } = await admin.from("profiles").select("id, role").eq("email", authEmail).maybeSingle();
  if (profile?.id) return String(profile.id);

  const { data: created, error } = await admin.auth.admin.createUser({
    email: authEmail,
    // Clave aleatoria que nadie usa: el cliente entra solo con su celular.
    password: randomBytes(18).toString("base64url"),
    email_confirm: true,
    user_metadata: { full_name: name, role: "customer", phone: whatsapp },
  });
  if (error || !created.user) return null;
  await admin
    .from("profiles")
    .update({ role: "customer", full_name: name, email: authEmail, whatsapp })
    .eq("id", created.user.id);
  return created.user.id;
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

  if (!sellerId) {
    const direct = await ensureDirectSalesSeller(admin, session.email);
    if (!direct) return { ok: false, error: "No se pudo preparar \"Venta directa\"." };
    sellerId = direct;
  }

  const profileId = await ensureCustomerLogin(admin, whatsapp, name);
  if (!profileId) return { ok: false, error: "No se pudo crear el acceso del cliente." };

  const payload = { seller_id: sellerId, name, whatsapp, email: email || null, profile_id: profileId };
  const { error } = id
    ? await admin.from("customers").update(payload).eq("id", id)
    : await admin.from("customers").insert({ ...payload, status: "active" });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Ese celular ya está registrado para este vendedor." };
    return { ok: false, error: error.message };
  }
  refresh();
  return { ok: true, message: id ? "Cliente actualizado." : "Cliente creado. Ya puede entrar con su celular." };
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
