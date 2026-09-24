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
