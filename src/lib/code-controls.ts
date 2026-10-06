import {
  DISNEY_APPROVAL_WINDOW_MS,
  DISNEY_CODE_HOURLY_MAX,
} from "@/lib/disney-code-policy";
import { createServiceClient } from "@/lib/supabase/server";

const PAUSES_KEY = "codes_paused_accounts";
const REVIEWED_KEY = "codes_reviewed_changes";
const APPROVALS_KEY = "codes_pending_approvals";

export type PausedAccount = {
  email: string;
  kind: "password" | "email" | "account";
  at: number;
  noticeId: string;
  requesterName: string;
  requesterKind: "vendedor" | "cliente" | "";
};

/** Aviso de Disney que el administrador ya cerró con Entendido. */
type ReviewedChange = {
  email: string;
  until: number;
  noticeIds: string[];
};

export type CodeApprovalStatus = "pending" | "approved" | "rejected" | "expired" | "delivered";

export type CodeApproval = {
  id: string;
  email: string;
  platformId: string;
  platformName: string;
  requesterKind: "vendedor" | "cliente";
  requesterId: string;
  requesterName: string;
  sellerId: string;
  customerId?: string;
  serviceId?: string;
  code?: string;
  link?: string;
  lookupType: string;
  history?: { code: string; at?: number; link?: string }[];
  createdAt: number;
  status: CodeApprovalStatus;
};

export type CodeApprovalView = {
  id: string;
  email: string;
  platformName: string;
  requesterName: string;
  requesterKind: "vendedor" | "cliente";
  createdAt: number;
};

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const admin = createServiceClient();
  if (!admin) return fallback;
  const { data } = await admin.from("app_settings").select("value").eq("key", key).maybeSingle();
  if (!data?.value) return fallback;
  try {
    return JSON.parse(String(data.value)) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown) {
  const admin = createServiceClient();
  if (!admin) return { ok: false as const, error: "Sin conexión a la base de datos." };
  const { error } = await admin.from("app_settings").upsert(
    { key, value: JSON.stringify(value), updated_at: new Date().toISOString() },
    { onConflict: "key" },
  );
  return error ? { ok: false as const, error: error.message } : { ok: true as const };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function listPausedAccounts(): Promise<PausedAccount[]> {
  const rows = await readJson<PausedAccount[]>(PAUSES_KEY, []);
  return Array.isArray(rows) ? rows : [];
}

export async function isAccountPaused(email: string) {
  const wanted = normalizeEmail(email);
  if (!wanted) return false;
  const rows = await listPausedAccounts();
  return rows.some((item) => normalizeEmail(item.email) === wanted);
}

/**
 * El aviso ya se mostró si es el mismo mensaje o si llegó antes de que
 * el administrador pulsara Entendido. Un aviso posterior vuelve a notificarse.
 */
export function noticeWasReviewed(
  review: { until: number; noticeIds: string[] } | undefined,
  notice: { id?: string; at?: number },
) {
  if (!review) return false;
  if (notice.id && review.noticeIds.includes(notice.id)) return true;
  return typeof notice.at === "number" && notice.at <= review.until;
}

async function reviewFor(email: string) {
  const wanted = normalizeEmail(email);
  if (!wanted) return undefined;
  const reviewed = await readJson<ReviewedChange[]>(REVIEWED_KEY, []);
  if (!Array.isArray(reviewed)) return undefined;
  return reviewed.find((item) => normalizeEmail(item.email) === wanted);
}

/** Guarda el aviso para el administrador. No bloquea la entrega de códigos. */
export async function pauseAccount(entry: PausedAccount): Promise<"paused" | "already" | "skipped"> {
  const email = normalizeEmail(entry.email);
  if (!email) return "skipped";
  const notice = { id: entry.noticeId, at: entry.at };
  if (noticeWasReviewed(await reviewFor(email), notice)) return "skipped";
  const rows = await listPausedAccounts();
  if (rows.some((item) => normalizeEmail(item.email) === email)) return "already";
  if (noticeWasReviewed(await reviewFor(email), notice)) return "skipped";
  rows.unshift({ ...entry, email });
  await writeJson(PAUSES_KEY, rows.slice(0, 200));
  return "paused";
}

export async function resumePausedAccount(email: string) {
  const wanted = normalizeEmail(email);
  if (!wanted) return { ok: false as const, error: "Falta el correo de la cuenta." };
  const rows = await listPausedAccounts();
  const removed = rows.filter((item) => normalizeEmail(item.email) === wanted);
  const reviewed = await readJson<ReviewedChange[]>(REVIEWED_KEY, []);
  const list = Array.isArray(reviewed) ? reviewed : [];
  const previous = list.find((item) => normalizeEmail(item.email) === wanted);
  const noticeIds = [
    ...new Set([...(previous?.noticeIds ?? []), ...removed.map((item) => item.noticeId).filter(Boolean)]),
  ];
  const nextReviewed = list.filter((item) => normalizeEmail(item.email) !== wanted);
  nextReviewed.unshift({ email: wanted, until: Date.now(), noticeIds });
  const savedReview = await writeJson(REVIEWED_KEY, nextReviewed.slice(0, 200));
  if (!savedReview.ok) return savedReview;
  const savedPauses = await writeJson(
    PAUSES_KEY,
    rows.filter((item) => normalizeEmail(item.email) !== wanted),
  );
  if (!savedPauses.ok) return savedPauses;
  return { ok: true as const };
}

/** El aviso más reciente que todavía no revisó el administrador, o null. */
export async function pendingChangeNotice<T extends { id: string; to: string; at?: number }>(
  email: string,
  notices: T[],
) {
  const wanted = normalizeEmail(email);
  if (!wanted) return null;
  const review = await reviewFor(wanted);
  const pending = notices
    .filter((notice) => normalizeEmail(notice.to) === wanted && !noticeWasReviewed(review, notice))
    .sort((a, b) => (b.at ?? 0) - (a.at ?? 0));
  return pending[0] ?? null;
}

export async function countDisneyDeliveries(email: string) {
  const admin = createServiceClient();
  if (!admin) return 0;
  const wanted = normalizeEmail(email);
  if (!wanted) return 0;
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const sellerCount = await admin
    .from("seller_code_lookups")
    .select("id", { count: "exact", head: true })
    .ilike("email", wanted)
    .eq("result", "FOUND")
    .gte("created_at", since);
  const { data: services } = await admin.from("services").select("id").ilike("platform_email", wanted);
  const ids = (services ?? []).map((row) => String(row.id));
  let customerCount = 0;
  if (ids.length) {
    const customer = await admin
      .from("email_code_lookups")
      .select("id", { count: "exact", head: true })
      .in("service_id", ids)
      .eq("result", "FOUND")
      .gte("created_at", since);
    customerCount = customer.count ?? 0;
  }
  const sinceMs = Date.now() - 60 * 60 * 1000;
  const open = (await loadApprovals()).filter(
    (item) =>
      normalizeEmail(item.email) === wanted &&
      (item.status === "pending" || item.status === "approved") &&
      item.createdAt >= sinceMs &&
      !expired(item),
  ).length;
  return (sellerCount.count ?? 0) + customerCount + open;
}

export function disneyHourlyLimitReached(count: number) {
  return count >= DISNEY_CODE_HOURLY_MAX;
}

/** Quién pidió el último código entregado de esa cuenta. */
export async function lastCodeRequester(email: string): Promise<{ name: string; kind: "vendedor" | "cliente" } | null> {
  const admin = createServiceClient();
  if (!admin) return null;
  const wanted = normalizeEmail(email);
  if (!wanted) return null;
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const sellerLookup = await admin
    .from("seller_code_lookups")
    .select("seller_id, created_at")
    .ilike("email", wanted)
    .eq("result", "FOUND")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1);
  const sellerRow = sellerLookup.data?.[0] as { seller_id?: string; created_at?: string } | undefined;

  const { data: services } = await admin.from("services").select("id").ilike("platform_email", wanted);
  const serviceIds = (services ?? []).map((row) => String(row.id));
  let customerRow: { customer_id?: string; created_at?: string } | undefined;
  if (serviceIds.length) {
    const customerLookup = await admin
      .from("email_code_lookups")
      .select("customer_id, created_at")
      .in("service_id", serviceIds)
      .eq("result", "FOUND")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1);
    customerRow = customerLookup.data?.[0] as { customer_id?: string; created_at?: string } | undefined;
  }

  const sellerAt = sellerRow?.created_at ? Date.parse(sellerRow.created_at) : 0;
  const customerAt = customerRow?.created_at ? Date.parse(customerRow.created_at) : 0;
  if (customerAt > sellerAt && customerRow?.customer_id) {
    const { data } = await admin.from("customers").select("name").eq("id", customerRow.customer_id).maybeSingle();
    return { name: String(data?.name ?? "Cliente"), kind: "cliente" };
  }
  if (sellerRow?.seller_id) {
    const { data } = await admin.from("sellers").select("name").eq("id", sellerRow.seller_id).maybeSingle();
    return { name: String(data?.name ?? "Vendedor"), kind: "vendedor" };
  }
  return null;
}

async function recordApprovalOutcome(item: CodeApproval, result: "EXPIRED" | "FOUND") {
  const admin = createServiceClient();
  if (!admin) return;
  if (item.requesterKind === "vendedor") {
    await admin.from("seller_code_lookups").insert({
      seller_id: item.sellerId,
      platform_id: item.platformId || null,
      email: item.email,
      code: result === "FOUND" ? item.code || (item.link ? "enlace" : null) : null,
      result,
    });
    return;
  }
  if (!item.customerId || !item.serviceId) return;
  await admin.from("email_code_lookups").insert({
    seller_id: item.sellerId,
    customer_id: item.customerId,
    service_id: item.serviceId,
    platform_id: item.platformId || null,
    result,
    lookup_type: item.lookupType || "LOGIN_CODE",
  });
}

async function loadApprovals() {
  const rows = await readJson<CodeApproval[]>(APPROVALS_KEY, []);
  return Array.isArray(rows) ? rows : [];
}

async function saveApprovals(rows: CodeApproval[]) {
  await writeJson(APPROVALS_KEY, rows.slice(0, 100));
}

function expired(item: CodeApproval, now = Date.now()) {
  return now - item.createdAt > DISNEY_APPROVAL_WINDOW_MS;
}

/** Pasa a canceladas las solicitudes que llevan más de 15 minutos sin aprobarse. */
export async function expireStaleApprovals() {
  const rows = await loadApprovals();
  let changed = false;
  for (const item of rows) {
    if (item.status !== "pending" || !expired(item)) continue;
    item.status = "expired";
    changed = true;
    await recordApprovalOutcome(item, "EXPIRED");
  }
  if (changed) await saveApprovals(rows);
  return rows;
}

export async function listPendingApprovals(): Promise<CodeApprovalView[]> {
  const rows = await expireStaleApprovals();
  return rows
    .filter((item) => item.status === "pending")
    .map((item) => ({
      id: item.id,
      email: item.email,
      platformName: item.platformName,
      requesterName: item.requesterName,
      requesterKind: item.requesterKind,
      createdAt: item.createdAt,
    }));
}

export async function openDisneyApproval(draft: Omit<CodeApproval, "id" | "createdAt" | "status">) {
  const rows = await expireStaleApprovals();
  const email = normalizeEmail(draft.email);
  const reusable = rows.find(
    (item) =>
      normalizeEmail(item.email) === email &&
      item.platformId === draft.platformId &&
      item.requesterId === draft.requesterId &&
      (item.status === "pending" || item.status === "approved") &&
      !expired(item),
  );
  if (reusable) return reusable;
  const created: CodeApproval = {
    ...draft,
    email,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    status: "pending",
  };
  rows.unshift(created);
  await saveApprovals(rows);
  return created;
}

export async function decideCodeApproval(id: string, decision: "approved" | "rejected") {
  const rows = await expireStaleApprovals();
  const item = rows.find((row) => row.id === id);
  if (!item || item.status !== "pending") return { ok: false as const, error: "Esa solicitud ya no está pendiente." };
  item.status = decision === "approved" ? "approved" : "rejected";
  await saveApprovals(rows);
  return { ok: true as const };
}

/** El vendedor o cliente que pidió el código recoge el resultado. El código no sale hacia el admin. */
export async function claimDisneyApproval(id: string, requesterId: string) {
  const rows = await expireStaleApprovals();
  const item = rows.find((row) => row.id === id && row.requesterId === requesterId);
  if (!item) return { state: "missing" as const };
  if (item.status === "pending") {
    if (expired(item)) {
      item.status = "expired";
      await saveApprovals(rows);
      await recordApprovalOutcome(item, "EXPIRED");
      return { state: "expired" as const };
    }
    return { state: "pending" as const, item };
  }
  if (item.status === "rejected") return { state: "rejected" as const };
  if (item.status === "expired") return { state: "expired" as const };
  if (item.status === "approved" || item.status === "delivered") {
    const firstDelivery = item.status === "approved";
    item.status = "delivered";
    await saveApprovals(rows);
    if (firstDelivery) await recordApprovalOutcome(item, "FOUND");
    return { state: "ready" as const, item };
  }
  return { state: "missing" as const };
}
