import { getAppSession } from "@/lib/auth/get-session";
import { createServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/** Una solicitud de código (de vendedor o de cliente) para el Historial del administrador. */
export type CodeHistoryRow = {
  id: string;
  at: string;
  kind: "vendedor" | "cliente";
  who: string;
  sellerName: string;
  platformId: string;
  email: string;
  result: string;
};

const DAYS = 30;
const LIMIT = 1000;

/** Solicitudes de los últimos 30 días. Nunca devuelve el código, solo el registro. */
export async function loadCodeHistory(): Promise<CodeHistoryRow[]> {
  if (!isSupabaseConfigured()) return [];
  const session = await getAppSession();
  if (session.mode !== "live" || (session.role !== "superadmin" && session.role !== "support")) return [];
  const admin = createServiceClient();
  if (!admin) return [];
  const since = new Date(Date.now() - DAYS * 86400000).toISOString();

  const [sellerRes, customerRes, sellersRes] = await Promise.all([
    admin
      .from("seller_code_lookups")
      .select("*")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(LIMIT),
    admin
      .from("email_code_lookups")
      .select("id, seller_id, customer_id, service_id, platform_id, result, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(LIMIT),
    admin.from("sellers").select("id, name"),
  ]);

  const sellerNames = new Map<string, string>(
    (sellersRes.data ?? []).map((row) => [String(row.id), String(row.name ?? "")] as [string, string]),
  );

  const customerRows = customerRes.data ?? [];
  const customerIds = [...new Set(customerRows.map((row) => String(row.customer_id)))];
  const serviceIds = [...new Set(customerRows.map((row) => String(row.service_id)))];
  const [customersRes, servicesRes] = await Promise.all([
    customerIds.length ? admin.from("customers").select("id, name").in("id", customerIds) : Promise.resolve({ data: [] }),
    serviceIds.length
      ? admin.from("services").select("id, platform_email").in("id", serviceIds)
      : Promise.resolve({ data: [] }),
  ]);
  const customerNames = new Map<string, string>(
    ((customersRes.data ?? []) as { id: string; name: string | null }[]).map(
      (row) => [String(row.id), String(row.name ?? "")] as [string, string],
    ),
  );
  const serviceEmails = new Map<string, string>(
    ((servicesRes.data ?? []) as { id: string; platform_email: string | null }[]).map(
      (row) => [String(row.id), String(row.platform_email ?? "")] as [string, string],
    ),
  );

  const rows: CodeHistoryRow[] = [];
  for (const row of (sellerRes.data ?? []) as Record<string, unknown>[]) {
    rows.push({
      id: `v-${row.id}`,
      at: String(row.created_at),
      kind: "vendedor",
      who: sellerNames.get(String(row.seller_id)) ?? "Vendedor",
      sellerName: sellerNames.get(String(row.seller_id)) ?? "",
      platformId: String(row.platform_id ?? ""),
      email: String(row.email ?? ""),
      // Registros antiguos (sin columna result) solo existían cuando se encontró el código.
      result: String(row.result ?? (row.code ? "FOUND" : "NOT_FOUND")),
    });
  }
  for (const row of customerRows as Record<string, unknown>[]) {
    rows.push({
      id: `c-${row.id}`,
      at: String(row.created_at),
      kind: "cliente",
      who: customerNames.get(String(row.customer_id)) ?? "Cliente",
      sellerName: sellerNames.get(String(row.seller_id)) ?? "",
      platformId: String(row.platform_id ?? ""),
      email: serviceEmails.get(String(row.service_id)) ?? "",
      result: String(row.result ?? ""),
    });
  }
  return rows.sort((a, b) => b.at.localeCompare(a.at));
}
