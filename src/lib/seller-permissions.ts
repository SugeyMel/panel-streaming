import { DEFAULT_ADMIN_WHATSAPP, normalizeAdminWhatsapp } from "@/lib/admin-contact";
import { createServiceClient } from "@/lib/supabase/server";

/** ¿Este vendedor puede crear clientes? Si no se puede leer la opción, se permite (no rompe lo existente). */
export async function sellerCanCreateCustomers(sellerId: string | null | undefined): Promise<boolean> {
  if (!sellerId) return true;
  const admin = createServiceClient();
  if (!admin) return true;
  const { data, error } = await admin.from("sellers").select("can_create_customers").eq("id", sellerId).maybeSingle();
  if (error || !data) return true;
  return data.can_create_customers !== false;
}

/** WhatsApp del administrador guardado en Configuración (solo dígitos). Si no hay, usa el predeterminado. */
export async function loadAdminWhatsapp(): Promise<string> {
  const admin = createServiceClient();
  if (!admin) return DEFAULT_ADMIN_WHATSAPP;
  const { data, error } = await admin.from("app_settings").select("value").eq("key", "admin_whatsapp").maybeSingle();
  if (error || !data?.value) return DEFAULT_ADMIN_WHATSAPP;
  return normalizeAdminWhatsapp(String(data.value)) ?? DEFAULT_ADMIN_WHATSAPP;
}

/** Clave en app_settings donde se guarda si los clientes de un vendedor pueden usar el gestor de códigos. */
export function clientCodesSettingKey(sellerId: string) {
  return `client_codes:${sellerId}`;
}

/** ¿Los clientes de este vendedor pueden consultar códigos? Activado por defecto (no rompe lo existente). */
export async function sellerClientCodesEnabled(sellerId: string | null | undefined): Promise<boolean> {
  if (!sellerId) return true;
  const admin = createServiceClient();
  if (!admin) return true;
  const { data, error } = await admin
    .from("app_settings")
    .select("value")
    .eq("key", clientCodesSettingKey(sellerId))
    .maybeSingle();
  if (error || !data) return true;
  return String(data.value) !== "off";
}

/** Estado del gestor de códigos de varios vendedores a la vez (para la lista del administrador). */
export async function loadClientCodesMap(sellerIds: string[]): Promise<Record<string, boolean>> {
  const result: Record<string, boolean> = {};
  for (const id of sellerIds) result[id] = true;
  const admin = createServiceClient();
  if (!admin || sellerIds.length === 0) return result;
  const { data } = await admin
    .from("app_settings")
    .select("key, value")
    .in("key", sellerIds.map(clientCodesSettingKey));
  for (const row of data ?? []) {
    const id = String(row.key).replace("client_codes:", "");
    result[id] = String(row.value) !== "off";
  }
  return result;
}
