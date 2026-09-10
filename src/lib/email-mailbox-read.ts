import {
  classifyEmailMessage,
  extractAccessCode,
  type ClassifiableMessage,
} from "@/lib/email-code-filter";
import { getValidAccessToken, markMailboxReconnect, touchMailboxSync } from "@/lib/email-oauth";
import type { EmailCodeFilterPolicy, EmailLookupType, Platform } from "@/lib/types";

export type MailboxReadResult =
  | { status: "found"; type: EmailLookupType; code: string }
  | { status: "not_found" }
  | { status: "not_connected" }
  | { status: "reconnect" }
  | { status: "error"; message: string };

type GmailList = { messages?: { id: string }[]; error?: { message?: string } };
type GmailMessage = {
  snippet?: string;
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
    if (mime === "text/html") text = text.replace(/<[^>]+>/g, " ");
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
  }
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (response.status === 401 || response.status === 403) return { unauthorized: true as const };
  if (!response.ok) return { message: null };
  return { message: (await response.json()) as GmailMessage };
}

async function readGmail(accessToken: string): Promise<ClassifiableMessage[] | "unauthorized"> {
  const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  listUrl.searchParams.set("maxResults", "25");
  listUrl.searchParams.set("q", "newer_than:2d");
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
      snippet: message.snippet ?? "",
      id,
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
  if ((json.body?.contentType ?? "").toLowerCase() === "html") text = text.replace(/<[^>]+>/g, " ");
  return { unauthorized: false as const, text: text.slice(0, 8000) };
}

async function readMicrosoft(accessToken: string): Promise<ClassifiableMessage[] | "unauthorized"> {
  const since = Date.now() - 2 * 24 * 60 * 60 * 1000;
  const url = new URL("https://graph.microsoft.com/v1.0/me/messages");
  url.searchParams.set("$top", "25");
  url.searchParams.set("$orderby", "receivedDateTime desc");
  url.searchParams.set("$select", "id,from,subject,bodyPreview,receivedDateTime");
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (response.status === 401 || response.status === 403) return "unauthorized";
  const json = (await response.json()) as GraphList;
  if (!response.ok) return [];
  return (json.value ?? [])
    .filter((item) => {
      if (!item.receivedDateTime) return true;
      const received = Date.parse(item.receivedDateTime);
      return Number.isFinite(received) ? received >= since : true;
    })
    .map((item) => ({
      id: item.id,
      from: item.from?.emailAddress?.address || item.from?.emailAddress?.name || "",
      subject: item.subject ?? "",
      snippet: item.bodyPreview ?? "",
    }));
}

export async function readFilteredAccessCode(
  mailbox: { id: string; sellerId: string; status: string },
  policy: EmailCodeFilterPolicy,
  platform?: Pick<Platform, "slug" | "name"> | null,
): Promise<MailboxReadResult> {
  const access = await getValidAccessToken(mailbox.id);
  if (!access.ok) {
    if (access.reason === "not_connected") return { status: "not_connected" };
    return { status: "reconnect" };
  }

  const raw =
    access.token.provider === "google"
      ? await readGmail(access.token.accessToken)
      : await readMicrosoft(access.token.accessToken);

  if (raw === "unauthorized") {
    await markMailboxReconnect(mailbox.id, mailbox.sellerId);
    return { status: "reconnect" };
  }

  await touchMailboxSync(mailbox.id, mailbox.sellerId);

  for (const message of raw) {
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
    return { status: "found", type: verdict.type, code };
  }

  return { status: "not_found" };
}
