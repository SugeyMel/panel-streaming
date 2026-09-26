import {
  accountChangeNotice,
  classifyEmailMessage,
  extractAccessCode,
  htmlToText,
  type ClassifiableMessage,
} from "@/lib/email-code-filter";
import { getValidAccessToken, markMailboxReconnect, touchMailboxSync } from "@/lib/email-oauth";
import type { EmailCodeFilterPolicy, EmailLookupType, Platform } from "@/lib/types";

export type MailboxReadResult =
  | { status: "found"; type: EmailLookupType; code: string; history: { code: string; at?: number }[] }
  | { status: "not_found" }
  | { status: "not_connected" }
  | { status: "reconnect" }
  | { status: "error"; message: string };

/** Antigüedad máxima de un código para mostrarse (los de Netflix/HBO/Disney vencen en pocos minutos). */
const CODE_MAX_AGE_MINUTES = 30;
/** Cuántos códigos recientes se devuelven como máximo (historial). */
const CODE_HISTORY_MAX = 5;

type GmailList ={ messages?: { id: string }[]; error?: { message?: string } };
type GmailMessage = {
  snippet?: string;
  internalDate?: string;
  payload?: {
    mimeType?: string;
    headers?: { name?: string; value?: string }[];
    body?: { data?: string };
    parts?: GmailMessage["payload"][];
  };
};
type GraphList = {
  value?: {
    id?: string;
    from?: { emailAddress?: { address?: string; name?: string } };
    subject?: string;
    bodyPreview?: string;
    receivedDateTime?: string;
    toRecipients?: { emailAddress?: { address?: string } }[];
  }[];
  error?: { message?: string };
};

function header(headers: { name?: string; value?: string }[] | undefined, name: string) {
  return headers?.find((item) => item.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function decodeB64Url(data: string) {
  const padded = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64").toString("utf8");
}

function collectText(part: GmailMessage["payload"] | undefined, out: string[]) {
  if (!part) return;
  const mime = part.mimeType ?? "";
  if (part.body?.data && (mime.startsWith("text/plain") || mime === "text/html")) {
    let text = decodeB64Url(part.body.data);
    if (mime === "text/html") text = htmlToText(text);
    out.push(text);
  }
  for (const child of part.parts ?? []) collectText(child, out);
}

async function gmailMessage(accessToken: string, id: string, format: "metadata" | "full") {
  const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`);
  url.searchParams.set("format", format);
  if (format === "metadata") {
    url.searchParams.append("metadataHeaders", "From");
    url.searchParams.append("metadataHeaders", "Subject");
    url.searchParams.append("metadataHeaders", "To");
  }
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (response.status === 401 || response.status === 403) return { unauthorized: true as const };
  if (!response.ok) return { message: null };
  return { message: (await response.json()) as GmailMessage };
}

async function readGmail(accessToken: string, recipient?: string): Promise<ClassifiableMessage[] | "unauthorized"> {
  const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  listUrl.searchParams.set("maxResults", "25");
  // Con recipient solo se leen mensajes enviados a esa dirección exacta (variantes +1, +2 o dominios reenviados).
  const safeRecipient = recipient?.replace(/[^a-z0-9@._+-]/gi, "");
  // Solo mensajes recientes: un código de hace una hora ya no sirve y no debe mostrarse.
  const afterEpoch = Math.floor((Date.now() - CODE_MAX_AGE_MINUTES * 60 * 1000) / 1000);
  listUrl.searchParams.set("q", safeRecipient ? `after:${afterEpoch} to:${safeRecipient}` : `after:${afterEpoch}`);
  const listRes = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (listRes.status === 401 || listRes.status === 403) return "unauthorized";
  const list = (await listRes.json()) as GmailList;
  if (!listRes.ok) return [];
  const metas = await Promise.all((list.messages ?? []).map((item) => gmailMessage(accessToken, item.id, "metadata")));
  const out: ClassifiableMessage[] = [];
  for (let index = 0; index < metas.length; index += 1) {
    const meta = metas[index];
    if ("unauthorized" in meta && meta.unauthorized) return "unauthorized";
    const message = meta.message;
    const id = list.messages?.[index]?.id;
    if (!message || !id) continue;
    out.push({
      from: header(message.payload?.headers, "From"),
      subject: header(message.payload?.headers, "Subject"),
      to: header(message.payload?.headers, "To"),
      snippet: message.snippet ?? "",
      id,
      receivedAt: Number(message.internalDate) || undefined,
    });
  }
  return out;
}

async function gmailFullText(accessToken: string, id: string) {
  const full = await gmailMessage(accessToken, id, "full");
  if ("unauthorized" in full && full.unauthorized) return { unauthorized: true as const, text: "" };
  const parts: string[] = [];
  collectText(full.message?.payload, parts);
  return { unauthorized: false as const, text: parts.join("\n").slice(0, 8000) };
}

async function microsoftFullText(accessToken: string, id: string) {
  const url = new URL(`https://graph.microsoft.com/v1.0/me/messages/${id}`);
  url.searchParams.set("$select", "body");
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (response.status === 401 || response.status === 403) return { unauthorized: true as const, text: "" };
  if (!response.ok) return { unauthorized: false as const, text: "" };
  const json = (await response.json()) as { body?: { contentType?: string; content?: string } };
  let text = json.body?.content ?? "";
  if ((json.body?.contentType ?? "").toLowerCase() === "html") text = htmlToText(text);
  return { unauthorized: false as const, text: text.slice(0, 8000) };
}

async function readMicrosoft(accessToken: string, recipient?: string): Promise<ClassifiableMessage[] | "unauthorized"> {
  const since = Date.now() - CODE_MAX_AGE_MINUTES * 60 * 1000;
  const url = new URL("https://graph.microsoft.com/v1.0/me/messages");
  url.searchParams.set("$top", "25");
  url.searchParams.set("$orderby", "receivedDateTime desc");
  url.searchParams.set("$select", "id,from,subject,bodyPreview,receivedDateTime,toRecipients");
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (response.status === 401 || response.status === 403) return "unauthorized";
  const json = (await response.json()) as GraphList;
  if (!response.ok) return [];
  return (json.value ?? [])
    .filter((item) => {
      if (recipient) {
        const wanted = recipient.trim().toLowerCase();
        const sentToWanted = (item.toRecipients ?? []).some(
          (to) => (to.emailAddress?.address ?? "").trim().toLowerCase() === wanted,
        );
        if (!sentToWanted) return false;
      }
      if (!item.receivedDateTime) return true;
      const received = Date.parse(item.receivedDateTime);
      return Number.isFinite(received) ? received >= since : true;
    })
    .map((item) => ({
      id: item.id,
      from: item.from?.emailAddress?.address || item.from?.emailAddress?.name || "",
      subject: item.subject ?? "",
      snippet: item.bodyPreview ?? "",
      to: item.toRecipients?.[0]?.emailAddress?.address ?? "",
      receivedAt: item.receivedDateTime ? Date.parse(item.receivedDateTime) || undefined : undefined,
    }));
}

export async function readFilteredAccessCode(
  mailbox: { id: string; sellerId: string; status: string },
  policy: EmailCodeFilterPolicy,
  platform?: Pick<Platform, "slug" | "name"> | null,
  recipient?: string,
): Promise<MailboxReadResult> {
  const access = await getValidAccessToken(mailbox.id);
  if (!access.ok) {
    if (access.reason === "not_connected") return { status: "not_connected" };
    return { status: "reconnect" };
  }

  const raw =
    access.token.provider === "google"
      ? await readGmail(access.token.accessToken, recipient)
      : await readMicrosoft(access.token.accessToken, recipient);

  if (raw === "unauthorized") {
    await markMailboxReconnect(mailbox.id, mailbox.sellerId);
    return { status: "reconnect" };
  }

  await touchMailboxSync(mailbox.id, mailbox.sellerId);

  const history: { code: string; at?: number }[] = [];
  let firstType: EmailLookupType | null = null;

  for (const message of raw) {
    if (history.length >= CODE_HISTORY_MAX) break;
    const verdict = classifyEmailMessage(message, policy, platform);
    if (verdict.decision !== "allow") continue;
    let code = extractAccessCode(`${message.subject} ${message.snippet ?? ""}`);
    const maybeId = message.id;
    if (!code && maybeId) {
      const full =
        access.token.provider === "google"
          ? await gmailFullText(access.token.accessToken, maybeId)
          : await microsoftFullText(access.token.accessToken, maybeId);
      if (full.unauthorized) {
        await markMailboxReconnect(mailbox.id, mailbox.sellerId);
        return { status: "reconnect" };
      }
      code = extractAccessCode(full.text);
    }
    if (!code) continue;
    if (history.some((item) => item.code === code)) continue;
    if (!firstType) firstType = verdict.type;
    history.push({ code, at: message.receivedAt });
  }

  if (history.length > 0 && firstType) {
    return { status: "found", type: firstType, code: history[0].code, history };
  }
  return { status: "not_found" };
}

export type AccountChangeNotice = {
  id: string;
  to: string;
  kind: "password" | "email" | "account";
  at?: number;
};

/** Correo "limpio" de la cabecera To: "Nombre <a@b.com>" → "a@b.com". */
function plainAddress(value: string) {
  const match = /<([^>]+)>/.exec(value);
  return (match?.[1] ?? value).split(",")[0].trim().toLowerCase();
}

/**
 * Busca avisos de Disney de cambio de clave o correo en un buzón (por defecto, últimas 24 horas).
 * Solo lee; no marca nada ni muestra estos mensajes a nadie.
 */
export async function findAccountChangeNotices(
  mailbox: { id: string },
  sinceMs = Date.now() - 24 * 60 * 60 * 1000,
): Promise<AccountChangeNotice[]> {
  const access = await getValidAccessToken(mailbox.id);
  if (!access.ok) return [];
  const token = access.token.accessToken;
  let messages: ClassifiableMessage[] = [];

  if (access.token.provider === "google") {
    const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
    listUrl.searchParams.set("maxResults", "20");
    listUrl.searchParams.set(
      "q",
      `after:${Math.floor(sinceMs / 1000)} from:disneyplus.com (subject:"MyDisney actualizada" OR subject:"MyDisney account")`,
    );
    const listRes = await fetch(listUrl, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!listRes.ok) return [];
    const list = (await listRes.json()) as GmailList;
    const metas = await Promise.all((list.messages ?? []).map((item) => gmailMessage(token, item.id, "metadata")));
    metas.forEach((meta, index) => {
      const message = "message" in meta ? meta.message : null;
      const id = list.messages?.[index]?.id;
      if (!message || !id) return;
      messages.push({
        id,
        from: header(message.payload?.headers, "From"),
        subject: header(message.payload?.headers, "Subject"),
        to: header(message.payload?.headers, "To"),
        snippet: message.snippet ?? "",
        receivedAt: Number(message.internalDate) || undefined,
      });
    });
  } else {
    const url = new URL("https://graph.microsoft.com/v1.0/me/messages");
    url.searchParams.set("$top", "50");
    url.searchParams.set("$orderby", "receivedDateTime desc");
    url.searchParams.set("$filter", `receivedDateTime ge ${new Date(sinceMs).toISOString()}`);
    url.searchParams.set("$select", "id,from,subject,bodyPreview,receivedDateTime,toRecipients");
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!response.ok) return [];
    const json = (await response.json()) as GraphList;
    messages = (json.value ?? []).map((item) => ({
      id: item.id,
      from: item.from?.emailAddress?.address || "",
      subject: item.subject ?? "",
      snippet: item.bodyPreview ?? "",
      to: item.toRecipients?.[0]?.emailAddress?.address ?? "",
      receivedAt: item.receivedDateTime ? Date.parse(item.receivedDateTime) || undefined : undefined,
    }));
  }

  const out: AccountChangeNotice[] = [];
  for (const message of messages) {
    const kind = accountChangeNotice(message);
    if (!kind || !message.id) continue;
    out.push({ id: message.id, to: plainAddress(message.to ?? ""), kind, at: message.receivedAt });
  }
  return out;
}
