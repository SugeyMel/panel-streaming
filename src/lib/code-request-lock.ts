import { demoEmailState } from "@/lib/email-codes";
import { createServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const CODE_REQUEST_LOCK_LIMIT = 10;
export const CODE_REQUEST_LOCK_MS = 60 * 60 * 1000;

export const CODE_REQUEST_LOCK_MESSAGE =
  "SE HA BLOQUEADO TU OPCION PARA SOLICITAR MAS CODIGOS VUELVE A INTENTARLO DENTRO DE 60 MINUTOS O COMUNICATE CON TU PROVEEDOR";

type Stamp = { result: string; at: number };

function isFound(result: string) {
  return result === "FOUND" || result === "encontrado";
}

function isUnanswered(result: string) {
  return result === "NOT_FOUND" || result === "no_encontrado";
}

/** 10 solicitudes seguidas sin código bloquean la opción 60 minutos. Un código encontrado reinicia la cuenta. */
export function codeRequestLock(rows: Stamp[], now = Date.now()) {
  const ordered = [...rows].sort((a, b) => a.at - b.at);
  let start = 0;
  for (let index = 0; index < ordered.length; index += 1) {
    if (isFound(ordered[index].result)) start = index + 1;
  }
  let count = 0;
  let lockUntil = 0;
  for (const row of ordered.slice(start)) {
    if (!isUnanswered(row.result)) continue;
    if (lockUntil && row.at < lockUntil) continue;
    if (lockUntil && row.at >= lockUntil) {
      lockUntil = 0;
      count = 0;
    }
    count += 1;
    if (count >= CODE_REQUEST_LOCK_LIMIT) {
      lockUntil = row.at + CODE_REQUEST_LOCK_MS;
      count = 0;
    }
  }
  return { locked: lockUntil > now, until: lockUntil > now ? lockUntil : null };
}

export async function lockedServiceIds(customerId: string, serviceIds: string[]) {
  const ids = serviceIds.filter(Boolean);
  if (!customerId || !ids.length) return [];
  const grouped = new Map<string, Stamp[]>();
  for (const id of ids) grouped.set(id, []);

  if (!isSupabaseConfigured()) {
    for (const row of demoEmailState().lookups) {
      if (row.customerId !== customerId || !grouped.has(row.subscriptionId)) continue;
      grouped.get(row.subscriptionId)?.push({ result: row.result, at: Date.parse(row.createdAt) });
    }
  } else {
    const admin = createServiceClient();
    if (!admin) return [];
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await admin
      .from("email_code_lookups")
      .select("service_id, result, created_at")
      .eq("customer_id", customerId)
      .in("service_id", ids)
      .gte("created_at", since);
    for (const row of data ?? []) {
      const serviceId = String(row.service_id ?? "");
      const bucket = grouped.get(serviceId);
      if (!bucket) continue;
      const at = Date.parse(String(row.created_at ?? ""));
      if (!Number.isFinite(at)) continue;
      bucket.push({ result: String(row.result ?? ""), at });
    }
  }

  const now = Date.now();
  return ids.filter((id) => codeRequestLock(grouped.get(id) ?? [], now).locked);
}

export async function isServiceCodeLocked(customerId: string, serviceId: string) {
  const locked = await lockedServiceIds(customerId, [serviceId]);
  return locked.includes(serviceId);
}
