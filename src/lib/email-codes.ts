import { connectedEmails, emailAuditLogs } from "@/data/mock";
import { defaultEmailFilterPolicy } from "@/lib/email-code-filter";
import { isMissingRelation } from "@/lib/wholesale";
import type {
  ConnectedEmailAccount,
  EmailCodeFilterPolicy,
  EmailConnectionStatus,
  EmailAuditLog,
  EmailLookupStatus,
  EmailProvider,
} from "@/lib/types";

const EMAIL_STATUSES: EmailConnectionStatus[] = [
  "registrado",
  "conectado",
  "requiere_reconexion",
  "desconectado",
  "error",
];

export function mapConnectedEmail(row: Record<string, unknown>): ConnectedEmailAccount {
  const status = String(row.status ?? "registrado") as EmailConnectionStatus;
  const platforms = row.linked_platform_ids ?? row.linkedPlatformIds;
  return {
    id: String(row.id),
    sellerId: String(row.seller_id ?? row.sellerId ?? ""),
    email: String(row.email ?? "").trim(),
    provider: String(row.provider) === "microsoft" ? "microsoft" : "google",
    status: EMAIL_STATUSES.includes(status) ? status : "registrado",
    lastSyncAt: row.last_sync_at ? String(row.last_sync_at) : row.lastSyncAt ? String(row.lastSyncAt) : null,
    linkedPlatformIds: Array.isArray(platforms) ? platforms.map(String).filter(Boolean) : [],
    codesEnabled: row.codes_enabled !== false && row.codesEnabled !== false,
    oauthEmail: row.oauth_email ? String(row.oauth_email) : row.oauthEmail ? String(row.oauthEmail) : null,
  };
}

export function mapEmailFilterPolicy(row: Record<string, unknown>): EmailCodeFilterPolicy {
  const extra = row.extra_block_keywords ?? row.extraBlockKeywords;
  return {
    id: String(row.id),
    sellerId: row.seller_id ? String(row.seller_id) : row.sellerId ? String(row.sellerId) : null,
    allowLoginCode: row.allow_login_code !== false && row.allowLoginCode !== false,
    allowVerificationCode: row.allow_verification_code !== false && row.allowVerificationCode !== false,
    allowNetflixTravel: row.allow_netflix_travel !== false && row.allowNetflixTravel !== false,
    allowNetflixHousehold: row.allow_netflix_household === true || row.allowNetflixHousehold === true,
    extraBlockKeywords: Array.isArray(extra) ? extra.map(String).filter(Boolean) : [],
  };
}

export function filterPolicyPayload(policy: EmailCodeFilterPolicy) {
  return {
    seller_id: policy.sellerId,
    allow_login_code: policy.allowLoginCode,
    allow_verification_code: policy.allowVerificationCode,
    allow_netflix_travel: policy.allowNetflixTravel,
    allow_netflix_household: policy.allowNetflixHousehold,
    extra_block_keywords: policy.extraBlockKeywords,
  };
}

export function mapEmailLookupStatus(status: string): EmailLookupStatus {
  if (status === "FOUND" || status === "encontrado") return "encontrado";
  if (status === "NOT_FOUND" || status === "no_encontrado") return "no_encontrado";
  if (status === "DENIED" || status === "sin_autorizacion") return "sin_autorizacion";
  if (status === "servicio_vencido") return "servicio_vencido";
  if (status === "RATE_LIMITED" || status === "error") return "error";
  return "bloqueado";
}

export function mapEmailAuditLog(row: Record<string, unknown>): EmailAuditLog {
  return {
    id: String(row.id),
    sellerId: String(row.seller_id ?? row.sellerId ?? ""),
    customerId: String(row.customer_id ?? row.customerId ?? ""),
    subscriptionId: String(row.service_id ?? row.subscriptionId ?? ""),
    platformId: String(row.platform_id ?? row.platformId ?? ""),
    createdAt: String(row.created_at ?? row.createdAt ?? new Date().toISOString()),
    result: mapEmailLookupStatus(String(row.result ?? "bloqueado")),
  };
}

export function missingEmailCodesSql(message: string) {
  return isMissingRelation(message) || /connected_emails|email_code_filters|email_code_lookups|email_oauth_tokens|oauth_email/i.test(message);
}

type DemoState = {
  emails: ConnectedEmailAccount[];
  filters: EmailCodeFilterPolicy[];
  lookups: EmailAuditLog[];
};

function cloneEmails() {
  return connectedEmails.map((item) => ({ ...item, linkedPlatformIds: [...item.linkedPlatformIds] }));
}

const demo: DemoState = {
  emails: cloneEmails(),
  filters: [defaultEmailFilterPolicy(null), defaultEmailFilterPolicy("sel_juan")],
  lookups: emailAuditLogs.map((item) => ({ ...item })),
};

export function demoEmailState() {
  return demo;
}

export function upsertDemoEmail(account: ConnectedEmailAccount) {
  const index = demo.emails.findIndex((item) => item.id === account.id);
  if (index >= 0) demo.emails[index] = account;
  else demo.emails.unshift(account);
  return account;
}

export function removeDemoEmail(id: string) {
  demo.emails = demo.emails.filter((item) => item.id !== id);
}

export function upsertDemoFilter(policy: EmailCodeFilterPolicy) {
  const index = demo.filters.findIndex((item) => (item.sellerId ?? "") === (policy.sellerId ?? ""));
  if (index >= 0) demo.filters[index] = policy;
  else demo.filters.push(policy);
  return policy;
}

export function pushDemoLookup(log: EmailAuditLog) {
  demo.lookups.unshift(log);
}

export function findDemoMailbox(sellerId: string, email: string) {
  const needle = email.trim().toLowerCase();
  return demo.emails.find((item) => item.sellerId === sellerId && item.email.toLowerCase() === needle);
}

export function parseProvider(value: string): EmailProvider {
  return value === "microsoft" ? "microsoft" : "google";
}

const CODES_TOKEN = /\[\[emc:([01])\]\]/;

export function parseCodesEnabled(note: string | null | undefined) {
  const match = CODES_TOKEN.exec(note ?? "");
  return match ? match[1] === "1" : false;
}

export function withCodesToken(note: string | null | undefined, enabled: boolean) {
  const stripped = (note ?? "").replace(CODES_TOKEN, "").trim();
  return `${stripped}${stripped ? " " : ""}[[emc:${enabled ? "1" : "0"}]]`.trim();
}

export function inventoryRowsToMailboxes(rows: Record<string, unknown>[]): ConnectedEmailAccount[] {
  const grouped = new Map<string, ConnectedEmailAccount>();
  for (const row of rows) {
    const email = String(row.email ?? "").trim().toLowerCase();
    if (!email.includes("@")) continue;
    const sellerId = String(row.seller_id ?? row.sellerId ?? "");
    const key = `${sellerId}::${email}`;
    const platformId = String(row.platform_id ?? row.platformId ?? "");
    const enabled = parseCodesEnabled(String(row.supplier_note ?? row.supplierNote ?? ""));
    const current = grouped.get(key);
    if (current) {
      if (platformId && !current.linkedPlatformIds.includes(platformId)) current.linkedPlatformIds.push(platformId);
      current.codesEnabled = current.codesEnabled || enabled;
      continue;
    }
    grouped.set(key, {
      id: String(row.id ?? `mail_${sellerId}_${email}`),
      sellerId,
      email,
      provider: parseProvider(email.includes("outlook") || email.includes("hotmail") ? "microsoft" : "google"),
      status: "registrado",
      lastSyncAt: null,
      linkedPlatformIds: platformId ? [platformId] : [],
      codesEnabled: enabled,
    });
  }
  return [...grouped.values()];
}
