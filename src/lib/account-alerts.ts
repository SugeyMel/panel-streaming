import { loadConnectedEmails, loadSellers } from "@/lib/data/queries";
import { findAccountChangeNotices } from "@/lib/email-mailbox-read";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServiceClient } from "@/lib/supabase/server";

export type AccountChangeAlert = {
  id: string;
  email: string;
  kind: "password" | "email" | "account";
  at?: number;
  sellerName?: string;
  lookupAt?: number;
};

/** Para no dejar colgada la página de inicio si un buzón tarda en responder. */
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T) {
  return Promise.race([promise, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);
}

/**
 * Revisa los buzones conectados buscando avisos de Disney de cambio de clave o correo
 * (últimas 24 horas) y cruza cada aviso con el último vendedor que pidió un código de esa cuenta.
 */
export async function loadAccountChangeAlerts(): Promise<AccountChangeAlert[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const mailboxes = (await loadConnectedEmails()).filter((item) => item.codesEnabled);
    const found = await Promise.all(
      mailboxes.map((mailbox) => withTimeout(findAccountChangeNotices(mailbox).catch(() => []), 6000, [])),
    );
    const notices = new Map<string, { id: string; to: string; kind: AccountChangeAlert["kind"]; at?: number }>();
    for (const list of found) for (const item of list) notices.set(item.id, item);
    if (!notices.size) return [];

    const supabase = createServiceClient();
    const sellers = await loadSellers();
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const alerts: AccountChangeAlert[] = [];
    for (const notice of notices.values()) {
      const alert: AccountChangeAlert = { id: notice.id, email: notice.to, kind: notice.kind, at: notice.at };
      if (supabase && notice.to) {
        const before = new Date(notice.at ?? Date.now()).toISOString();
        const { data } = await supabase
          .from("seller_code_lookups")
          .select("seller_id, created_at")
          .eq("email", notice.to)
          .gte("created_at", since)
          .lte("created_at", before)
          .order("created_at", { ascending: false })
          .limit(1);
        const row = data?.[0] as { seller_id?: string; created_at?: string } | undefined;
        if (row) {
          alert.sellerName = sellers.find((item) => item.id === row.seller_id)?.name ?? "Vendedor desconocido";
          alert.lookupAt = row.created_at ? Date.parse(row.created_at) : undefined;
        }
      }
      alerts.push(alert);
    }
    return alerts.sort((a, b) => (b.at ?? 0) - (a.at ?? 0));
  } catch {
    return [];
  }
}
