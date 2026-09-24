"use server";

import { revalidatePath } from "next/cache";
import { getAppSession, requireRole } from "@/lib/auth/get-session";
import {
  loadConnectedEmails,
  loadEmailFilterPolicy,
  loadPlatforms,
  loadServices,
  loadStreamingAccounts,
} from "@/lib/data/queries";
import { readFilteredAccessCode } from "@/lib/email-mailbox-read";
import { deleteOAuthTokens } from "@/lib/email-oauth";
import {
  classifyEmailMessage,
  demoCodeForPlatform,
  EMAIL_CODES_SQL_HINT,
  extractAccessCode,
  mailboxMatchesService,
  mergeEmailFilterPolicies,
  simulatedRecentMessages,
} from "@/lib/email-code-filter";
import {
  demoEmailState,
  filterPolicyPayload,
  findDemoMailbox,
  mapEmailLookupStatus,
  missingEmailCodesSql,
  parseProvider,
  pushDemoLookup,
  removeDemoEmail,
  upsertDemoEmail,
  upsertDemoFilter,
  withCodesToken,
} from "@/lib/email-codes";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { ConnectedEmailAccount, EmailCodeFilterPolicy, EmailLookupResult, EmailLookupType } from "@/lib/types";

const RATE_LIMIT = { max: 5, windowMinutes: 10 };

function revalidateEmailPaths() {
  revalidatePath("/panel/correos");
  revalidatePath("/admin/correos");
  revalidatePath("/panel/acceso");
  revalidatePath("/cliente/acceso");
}

function db() {
  return createServiceClient();
}

function sqlError(message: string) {
  if (missingEmailCodesSql(message)) return EMAIL_CODES_SQL_HINT;
  return message;
}

async function writeInventoryCodes(
  supabase: NonNullable<ReturnType<typeof createServiceClient>> | NonNullable<Awaited<ReturnType<typeof createClient>>>,
  sellerId: string,
  email: string,
  enabled: boolean,
) {
  const { data, error } = await supabase
    .from("streaming_accounts")
    .select("id, supplier_note")
    .eq("seller_id", sellerId)
    .ilike("email", email);
  if (error) return { ok: false as const, error: error.message };
  if (!data?.length) {
    return {
      ok: false as const,
      error: "Ese correo no está en Inventario. Agrégalo ahí o ejecuta el SQL 0027 para registrar buzones sueltos.",
    };
  }
  for (const row of data) {
    const { error: updateError } = await supabase
      .from("streaming_accounts")
      .update({ supplier_note: withCodesToken(String(row.supplier_note ?? ""), enabled) })
      .eq("id", row.id)
      .eq("seller_id", sellerId);
    if (updateError) return { ok: false as const, error: updateError.message };
  }
  return { ok: true as const };
}

function parseKeywords(raw: string) {
  return [
    ...new Set(
      raw
        .split(/[\n,;]+/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ].slice(0, 40);
}

function parseBool(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "");
  return value === "on" || value === "true" || value === "1";
}

async function ownedSellerId(formData?: FormData) {
  const session = await getAppSession();
  if (session.role === "superadmin" || session.role === "support") {
    const requested = String(formData?.get("sellerId") ?? "").trim();
    return requested || session.sellerId;
  }
  requireRole(session, ["seller"]);
  return session.sellerId;
}

export async function upsertConnectedEmailAction(formData: FormData) {
  const session = await getAppSession();
  requireRole(session, ["seller", "superadmin"]);
  const requestedSeller = await ownedSellerId(formData);
  const isAdminUser = session.role === "superadmin" || session.role === "support";
  if (!requestedSeller && !isAdminUser) return { ok: false as const, error: "Elige un vendedor." };
  // El administrador puede dejar el vendedor vacío: buzón general que sirve a todos sus vendedores.
  const sellerId = requestedSeller ?? "";

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) return { ok: false as const, error: "Escribe un correo válido." };

  const account: ConnectedEmailAccount = {
    id: String(formData.get("id") ?? "").trim() || crypto.randomUUID(),
    sellerId,
    email,
    provider: parseProvider(String(formData.get("provider") ?? "google")),
    status: "registrado",
    lastSyncAt: null,
    linkedPlatformIds: formData.getAll("platformId").map((item) => String(item)).filter(Boolean),
    codesEnabled: formData.has("codesEnabled") ? parseBool(formData, "codesEnabled") : true,
  };

  if (!isSupabaseConfigured()) {
    const existing = findDemoMailbox(sellerId, email);
    if (existing && existing.id !== account.id) account.id = existing.id;
    if (existing) {
      account.status = existing.status;
      account.lastSyncAt = existing.lastSyncAt;
    }
    upsertDemoEmail(account);
    revalidateEmailPaths();
    return { ok: true as const };
  }

  const supabase = db() ?? (await createClient());
  if (!supabase) return { ok: false as const, error: "Sin cliente de base de datos." };

  const currentQuery = supabase
    .from("connected_emails")
    .select("id, status, last_sync_at")
    .ilike("email", email);
  const currentRes = await (sellerId ? currentQuery.eq("seller_id", sellerId) : currentQuery.is("seller_id", null)).maybeSingle();

  if (currentRes.error) {
    if (missingEmailCodesSql(currentRes.error.message)) {
      const fallback = await writeInventoryCodes(supabase, sellerId, email, account.codesEnabled);
      if (!fallback.ok) return fallback;
      revalidateEmailPaths();
      revalidatePath("/panel/inventario");
      return { ok: true as const };
    }
    return { ok: false as const, error: sqlError(currentRes.error.message) };
  }

  const current = currentRes.data;
  const payload: Record<string, unknown> = {
    seller_id: sellerId || null,
    email,
    provider: account.provider,
    codes_enabled: account.codesEnabled,
    linked_platform_ids: account.linkedPlatformIds,
  };
  if (!current?.id) payload.status = "registrado";

  const query = current?.id
    ? supabase.from("connected_emails").update(payload).eq("id", current.id)
    : supabase.from("connected_emails").insert(payload);

  const { error } = await query;
  if (error) {
    if (missingEmailCodesSql(error.message)) {
      const fallback = await writeInventoryCodes(supabase, sellerId, email, account.codesEnabled);
      if (!fallback.ok) return fallback;
      revalidateEmailPaths();
      revalidatePath("/panel/inventario");
      return { ok: true as const };
    }
    return { ok: false as const, error: sqlError(error.message) };
  }
  revalidateEmailPaths();
  return { ok: true as const };
}

export async function toggleEmailCodesAction(id: string, enabled: boolean) {
  const session = await getAppSession();
  requireRole(session, ["seller", "superadmin"]);

  if (!isSupabaseConfigured()) {
    const current = demoEmailState().emails.find((item) => item.id === id);
    if (!current) return { ok: false as const, error: "No se encontró el buzón." };
    if (session.role === "seller" && current.sellerId !== session.sellerId) {
      return { ok: false as const, error: "No autorizado." };
    }
    upsertDemoEmail({ ...current, codesEnabled: enabled });
    revalidateEmailPaths();
    return { ok: true as const };
  }

  const supabase = db() ?? (await createClient());
  if (!supabase) return { ok: false as const, error: "Sin cliente de base de datos." };
  let query = supabase.from("connected_emails").update({ codes_enabled: enabled }).eq("id", id);
  if (session.role === "seller" && session.sellerId) query = query.eq("seller_id", session.sellerId);
  const { error } = await query;
  if (error) {
    if (missingEmailCodesSql(error.message)) {
      const row = await supabase.from("streaming_accounts").select("email, seller_id").eq("id", id).maybeSingle();
      const email = String(row.data?.email ?? "").trim();
      const ownerId = String(row.data?.seller_id ?? session.sellerId ?? "");
      if (!email || !ownerId) return { ok: false as const, error: "No se encontró el buzón en inventario." };
      const fallback = await writeInventoryCodes(supabase, ownerId, email, enabled);
      if (!fallback.ok) return fallback;
      revalidateEmailPaths();
      revalidatePath("/panel/inventario");
      return { ok: true as const };
    }
    return { ok: false as const, error: sqlError(error.message) };
  }
  revalidateEmailPaths();
  return { ok: true as const };
}

export async function deleteConnectedEmailAction(id: string) {
  const session = await getAppSession();
  requireRole(session, ["seller", "superadmin"]);

  if (!isSupabaseConfigured()) {
    const current = demoEmailState().emails.find((item) => item.id === id);
    if (session.role === "seller" && current && current.sellerId !== session.sellerId) {
      return { ok: false as const, error: "No autorizado." };
    }
    removeDemoEmail(id);
    revalidateEmailPaths();
    return { ok: true as const };
  }

  const supabase = db() ?? (await createClient());
  if (!supabase) return { ok: false as const, error: "Sin cliente de base de datos." };
  let query = supabase.from("connected_emails").delete().eq("id", id);
  if (session.role === "seller" && session.sellerId) query = query.eq("seller_id", session.sellerId);
  const { error } = await query;
  if (error) {
    if (missingEmailCodesSql(error.message)) {
      const row = await supabase.from("streaming_accounts").select("email, seller_id").eq("id", id).maybeSingle();
      const email = String(row.data?.email ?? "").trim();
      const ownerId = String(row.data?.seller_id ?? session.sellerId ?? "");
      if (!email || !ownerId) return { ok: false as const, error: "No se encontró el buzón en inventario." };
      const fallback = await writeInventoryCodes(supabase, ownerId, email, false);
      if (!fallback.ok) return fallback;
      revalidateEmailPaths();
      revalidatePath("/panel/inventario");
      return { ok: true as const };
    }
    return { ok: false as const, error: sqlError(error.message) };
  }
  revalidateEmailPaths();
  return { ok: true as const };
}

export async function disconnectOAuthAction(id: string) {
  const session = await getAppSession();
  requireRole(session, ["seller", "superadmin"]);
  if (!id.trim()) return { ok: false as const, error: "Falta el buzón." };

  if (!isSupabaseConfigured()) {
    const current = demoEmailState().emails.find((item) => item.id === id);
    if (!current) return { ok: false as const, error: "No se encontró el buzón." };
    if (session.role === "seller" && current.sellerId !== session.sellerId) {
      return { ok: false as const, error: "No autorizado." };
    }
    upsertDemoEmail({ ...current, status: "registrado", lastSyncAt: null, oauthEmail: null });
    revalidateEmailPaths();
    return { ok: true as const };
  }

  const supabase = db() ?? (await createClient());
  if (!supabase) return { ok: false as const, error: "Sin cliente de base de datos." };

  let query = supabase.from("connected_emails").select("id, seller_id").eq("id", id);
  if (session.role === "seller" && session.sellerId) query = query.eq("seller_id", session.sellerId);
  const { data: mailbox, error } = await query.maybeSingle();
  if (error) return { ok: false as const, error: sqlError(error.message) };
  if (!mailbox) return { ok: false as const, error: "No se encontró el buzón." };

  const result = await deleteOAuthTokens(String(mailbox.id), String(mailbox.seller_id));
  if (!result.ok) return { ok: false as const, error: sqlError(result.error) };
  revalidateEmailPaths();
  return { ok: true as const };
}

export async function saveEmailFilterAction(formData: FormData) {
  const session = await getAppSession();
  const scope = String(formData.get("scope") ?? "seller");
  if (scope === "global") requireRole(session, ["superadmin"]);
  else requireRole(session, ["seller", "superadmin"]);

  const sellerId =
    scope === "global" ? null : ((await ownedSellerId(formData)) ?? (session.role === "seller" ? session.sellerId : null));
  if (scope !== "global" && !sellerId) return { ok: false as const, error: "Elige un vendedor." };

  const policy: EmailCodeFilterPolicy = {
    id: String(formData.get("id") ?? "").trim() || crypto.randomUUID(),
    sellerId,
    allowLoginCode: parseBool(formData, "allowLoginCode"),
    allowVerificationCode: parseBool(formData, "allowVerificationCode"),
    allowNetflixTravel: parseBool(formData, "allowNetflixTravel"),
    allowNetflixHousehold: parseBool(formData, "allowNetflixHousehold"),
    extraBlockKeywords: parseKeywords(String(formData.get("extraBlockKeywords") ?? "")),
  };

  if (!isSupabaseConfigured()) {
    upsertDemoFilter(policy);
    revalidateEmailPaths();
    return { ok: true as const };
  }

  const supabase = db() ?? (await createClient());
  if (!supabase) return { ok: false as const, error: "Sin cliente de base de datos." };

  const existing = sellerId
    ? await supabase.from("email_code_filters").select("id").eq("seller_id", sellerId).maybeSingle()
    : await supabase.from("email_code_filters").select("id").is("seller_id", null).maybeSingle();

  const payload = filterPolicyPayload(policy);
  const query = existing.data?.id
    ? supabase.from("email_code_filters").update(payload).eq("id", existing.data.id)
    : supabase.from("email_code_filters").insert(payload);

  const { error } = await query;
  if (error) return { ok: false as const, error: sqlError(error.message) };
  revalidateEmailPaths();
  return { ok: true as const };
}

export async function importInventoryEmailsAction(sellerIdInput?: string) {
  const session = await getAppSession();
  requireRole(session, ["seller", "superadmin"]);
  const sellerId = session.role === "seller" ? session.sellerId : sellerIdInput || session.sellerId;
  if (!sellerId) return { ok: false as const, error: "Elige un vendedor." };

  const accounts = await loadStreamingAccounts(sellerId);
  const grouped = new Map<string, string[]>();
  for (const account of accounts) {
    const email = account.email.trim().toLowerCase();
    if (!email.includes("@")) continue;
    const platforms = grouped.get(email) ?? [];
    if (!platforms.includes(account.platformId)) platforms.push(account.platformId);
    grouped.set(email, platforms);
  }
  if (!grouped.size) return { ok: false as const, error: "No hay correos en el inventario para importar." };

  let imported = 0;
  for (const [email, linkedPlatformIds] of grouped) {
    const form = new FormData();
    form.set("sellerId", sellerId);
    form.set("email", email);
    form.set("provider", email.includes("outlook") || email.includes("hotmail") ? "microsoft" : "google");
    form.set("codesEnabled", "true");
    for (const platformId of linkedPlatformIds) form.append("platformId", platformId);
    const result = await upsertConnectedEmailAction(form);
    if (result.ok) imported += 1;
    else return result;
  }
  return { ok: true as const, imported };
}

async function recordLookup(input: {
  sellerId: string;
  customerId: string;
  serviceId: string;
  platformId: string;
  mailboxId?: string;
  result: EmailLookupResult["status"];
  type: EmailLookupType;
}) {
  const audit = {
    id: crypto.randomUUID(),
    sellerId: input.sellerId,
    customerId: input.customerId,
    subscriptionId: input.serviceId,
    platformId: input.platformId,
    createdAt: new Date().toISOString(),
    result: mapEmailLookupStatus(input.result),
  };

  if (!isSupabaseConfigured()) {
    pushDemoLookup(audit);
    return;
  }

  const supabase = db();
  if (!supabase) return;
  const { error } = await supabase.from("email_code_lookups").insert({
    seller_id: input.sellerId,
    customer_id: input.customerId,
    service_id: input.serviceId,
    platform_id: input.platformId,
    connected_email_id: input.mailboxId || null,
    result: input.result,
    lookup_type: input.type,
  });
  if (error && !missingEmailCodesSql(error.message)) {
    /* no bloquear al cliente si el historial falla */
  }
}

async function recentLookupCount(customerId: string, serviceId: string) {
  const since = new Date(Date.now() - RATE_LIMIT.windowMinutes * 60 * 1000).toISOString();
  if (!isSupabaseConfigured()) {
    return demoEmailState().lookups.filter(
      (item) => item.customerId === customerId && item.subscriptionId === serviceId && item.createdAt >= since,
    ).length;
  }
  const supabase = db() ?? (await createClient());
  if (!supabase) return 0;
  const { data, error } = await supabase
    .from("email_code_lookups")
    .select("id")
    .eq("customer_id", customerId)
    .eq("service_id", serviceId)
    .gte("created_at", since);
  if (error) return 0;
  return data?.length ?? 0;
}

export async function lookupAccessCodeAction(serviceId: string): Promise<EmailLookupResult> {
  const session = await getAppSession();
  requireRole(session, ["customer"]);
  const customerId = session.customerId;
  if (!customerId) {
    return {
      type: "UNKNOWN_BLOCKED",
      status: "DENIED",
      message: "No pudimos validar tu sesión.",
    };
  }

  const [services, platforms] = await Promise.all([loadServices({ customerId }), loadPlatforms()]);
  const service = services.find((item) => item.id === serviceId);
  if (!service || service.customerId !== customerId) {
    return {
      type: "UNKNOWN_BLOCKED",
      status: "DENIED",
      message: "Este servicio no está asignado a tu cuenta.",
    };
  }

  if (service.status === "vencido" || service.status === "cancelado") {
    await recordLookup({
      sellerId: service.sellerId,
      customerId,
      serviceId: service.id,
      platformId: service.platformId,
      result: "DENIED",
      type: "UNKNOWN_BLOCKED",
    });
    return {
      type: "UNKNOWN_BLOCKED",
      status: "DENIED",
      message: "El servicio ya no está activo. Pide renovación a tu vendedor.",
    };
  }

  const attempts = await recentLookupCount(customerId, service.id);
  if (attempts >= RATE_LIMIT.max) {
    return {
      type: "UNKNOWN_BLOCKED",
      status: "RATE_LIMITED",
      message: "Has realizado demasiadas consultas. Inténtalo de nuevo en unos minutos.",
    };
  }

  const mailboxes = await loadConnectedEmails(service.sellerId);
  const mailbox = mailboxes.find(
    (item) =>
      item.codesEnabled &&
      mailboxMatchesService(item.email, service.platformEmail) &&
      (item.linkedPlatformIds.length === 0 || item.linkedPlatformIds.includes(service.platformId)),
  );

  if (!service.platformEmail.trim() || !mailbox) {
    await recordLookup({
      sellerId: service.sellerId,
      customerId,
      serviceId: service.id,
      platformId: service.platformId,
      result: "DENIED",
      type: "UNKNOWN_BLOCKED",
    });
    return {
      type: "UNKNOWN_BLOCKED",
      status: "DENIED",
      message: "Tu vendedor aún no habilitó códigos automáticos para este correo.",
    };
  }

  const [globalFilter, sellerFilter] = await Promise.all([
    loadEmailFilterPolicy(null),
    loadEmailFilterPolicy(service.sellerId),
  ]);
  const policy = mergeEmailFilterPolicies(globalFilter, sellerFilter);
  const platform = platforms.find((item) => item.id === service.platformId);

  if (session.mode === "demo") {
    const messages = simulatedRecentMessages(platform ?? { slug: "", name: "" });
    let allowed: { type: EmailLookupType; code?: string } | null = null;
    for (const message of messages) {
      const verdict = classifyEmailMessage(message, policy, platform);
      if (verdict.decision !== "allow") continue;
      allowed = {
        type: verdict.type,
        code: extractAccessCode(`${message.subject} ${message.snippet ?? ""}`) ?? demoCodeForPlatform(platform?.slug ?? ""),
      };
      break;
    }
    if (!allowed) {
      await recordLookup({
        sellerId: service.sellerId,
        customerId,
        serviceId: service.id,
        platformId: service.platformId,
        mailboxId: mailbox.id,
        result: "NOT_FOUND",
        type: "UNKNOWN_BLOCKED",
      });
      return {
        type: "UNKNOWN_BLOCKED",
        status: "NOT_FOUND",
        message: "No hay un código de acceso reciente. Los mensajes de cambio de correo o contraseña nunca se muestran.",
      };
    }
    await recordLookup({
      sellerId: service.sellerId,
      customerId,
      serviceId: service.id,
      platformId: service.platformId,
      mailboxId: mailbox.id,
      result: "FOUND",
      type: allowed.type,
    });
    return {
      type: allowed.type,
      status: "FOUND",
      code: allowed.code,
      message: "Código temporal encontrado",
    };
  }

  let live;
  try {
    live = await readFilteredAccessCode(mailbox, policy, platform);
  } catch {
    await recordLookup({
      sellerId: service.sellerId,
      customerId,
      serviceId: service.id,
      platformId: service.platformId,
      mailboxId: mailbox.id,
      result: "DENIED",
      type: "UNKNOWN_BLOCKED",
    });
    return {
      type: "UNKNOWN_BLOCKED",
      status: "DENIED",
      message: "No se pudo leer el buzón ahora. Inténtalo de nuevo en unos minutos.",
    };
  }

  if (live.status === "not_connected") {
    await recordLookup({
      sellerId: service.sellerId,
      customerId,
      serviceId: service.id,
      platformId: service.platformId,
      mailboxId: mailbox.id,
      result: "DENIED",
      type: "UNKNOWN_BLOCKED",
    });
    return {
      type: "UNKNOWN_BLOCKED",
      status: "DENIED",
      message: "Tu vendedor aún no conectó el buzón. Pídele que pulse Conectar con Google o Microsoft en Correos.",
    };
  }

  if (live.status === "reconnect") {
    await recordLookup({
      sellerId: service.sellerId,
      customerId,
      serviceId: service.id,
      platformId: service.platformId,
      mailboxId: mailbox.id,
      result: "DENIED",
      type: "UNKNOWN_BLOCKED",
    });
    return {
      type: "UNKNOWN_BLOCKED",
      status: "DENIED",
      message: "El buzón necesita reconectarse. Avisa a tu vendedor.",
    };
  }

  if (live.status === "error") {
    await recordLookup({
      sellerId: service.sellerId,
      customerId,
      serviceId: service.id,
      platformId: service.platformId,
      mailboxId: mailbox.id,
      result: "DENIED",
      type: "UNKNOWN_BLOCKED",
    });
    return {
      type: "UNKNOWN_BLOCKED",
      status: "DENIED",
      message: "No se pudo leer el buzón ahora. Inténtalo de nuevo en unos minutos.",
    };
  }

  if (live.status === "not_found") {
    await recordLookup({
      sellerId: service.sellerId,
      customerId,
      serviceId: service.id,
      platformId: service.platformId,
      mailboxId: mailbox.id,
      result: "NOT_FOUND",
      type: "UNKNOWN_BLOCKED",
    });
    return {
      type: "UNKNOWN_BLOCKED",
      status: "NOT_FOUND",
      message: "No hay un código de acceso reciente. Los mensajes de cambio de correo o contraseña nunca se muestran.",
    };
  }

  await recordLookup({
    sellerId: service.sellerId,
    customerId,
    serviceId: service.id,
    platformId: service.platformId,
    mailboxId: mailbox.id,
    result: "FOUND",
    type: live.type,
  });

  return {
    type: live.type,
    status: "FOUND",
    code: live.code,
    message: "Código temporal encontrado",
  };
}

/**
 * Consulta de código desde el panel del vendedor (pantalla "Consultas").
 * Reutiliza las mismas reglas que la consulta del cliente: solo funciona con correos
 * que el vendedor ya habilitó en "Mi Bot", aplica el filtro de mensajes y nunca
 * devuelve el contenido del correo, solo el código temporal.
 */
export async function sellerLookupCodeAction(platformId: string, emailInput: string): Promise<EmailLookupResult> {
  const blocked = (status: EmailLookupResult["status"], message: string): EmailLookupResult => ({
    type: "UNKNOWN_BLOCKED",
    status,
    message,
  });

  const session = await getAppSession();
  requireRole(session, ["seller"]);
  const sellerId = session.sellerId;
  const email = String(emailInput ?? "").trim();
  if (!sellerId) return blocked("DENIED", "No pudimos validar tu sesión.");
  if (!platformId || !email) {
    return blocked("DENIED", "Selecciona una plataforma e ingresa el correo de la cuenta.");
  }

  const live = session.mode !== "demo";
  // En modo real: solo cuentas que el administrador asignó a este vendedor; el buzón puede ser el del administrador.
  const [platforms, mailboxes, ownAccounts] = await Promise.all([
    loadPlatforms(),
    loadConnectedEmails(live ? undefined : sellerId),
    live ? loadStreamingAccounts(sellerId) : Promise.resolve([]),
  ]);
  const platform = platforms.find((item) => item.id === platformId);
  if (!platform) return blocked("DENIED", "Esa plataforma no está disponible.");

  if (live) {
    const assigned = ownAccounts.some(
      (item) => item.assignedByAdmin && item.email.trim().toLowerCase() === email.toLowerCase(),
    );
    if (!assigned) return blocked("DENIED", "Esta cuenta no está asignada a tu panel.");
  }

  const usable = mailboxes.filter(
    (item) =>
      item.codesEnabled && (item.linkedPlatformIds.length === 0 || item.linkedPlatformIds.includes(platformId)),
  );
  const direct = usable.find(
    (item) => mailboxMatchesService(item.email, email) || mailboxMatchesService(item.email, baseMailboxEmail(email)),
  );
  // Correo de dominio propio reenviado a un Gmail (ej. cuenta@kitiga.com → bernito@gmail.com):
  // se prueban los buzones conectados y se filtra por la dirección exacta, así nunca se mezclan cuentas.
  const candidates = direct ? [direct] : isCustomDomainEmail(email) ? usable : [];
  if (candidates.length === 0) {
    return blocked("DENIED", "Esta cuenta aún no tiene un buzón de códigos enlazado. Avisa al administrador.");
  }

  const [globalFilter, sellerFilter] = await Promise.all([
    loadEmailFilterPolicy(null),
    loadEmailFilterPolicy(sellerId),
  ]);
  const policy = mergeEmailFilterPolicies(globalFilter, sellerFilter);
  const notFound = blocked(
    "NOT_FOUND",
    "No hay un código de acceso reciente. Los mensajes de cambio de correo o contraseña nunca se muestran.",
  );

  if (session.mode === "demo") {
    for (const message of simulatedRecentMessages(platform)) {
      const verdict = classifyEmailMessage(message, policy, platform);
      if (verdict.decision !== "allow") continue;
      return {
        type: verdict.type,
        status: "FOUND",
        code: extractAccessCode(`${message.subject} ${message.snippet ?? ""}`) ?? demoCodeForPlatform(platform.slug),
        message: "Código temporal encontrado",
      };
    }
    return notFound;
  }

  let result: Awaited<ReturnType<typeof readFilteredAccessCode>> | undefined;
  let failed = false;
  for (const mailbox of candidates) {
    // Si el correo es una variante o reenviado se busca el código enviado a esa dirección exacta.
    const recipient = mailboxMatchesService(mailbox.email, email) ? undefined : email;
    let current;
    try {
      current = await readFilteredAccessCode(mailbox, policy, platform, recipient);
    } catch {
      failed = true;
      continue;
    }
    if (current.status === "found") {
      result = current;
      break;
    }
    // Se conserva el resultado más útil: con varios buzones, "no hay código" pesa más que "no conectado".
    if (!result || result.status === "not_connected" || result.status === "reconnect") {
      result = current;
    }
  }
  if (!result) {
    return blocked("DENIED", "No se pudo leer el buzón ahora. Inténtalo de nuevo en unos minutos.");
  }
  if (failed && result.status !== "found" && result.status !== "not_found") {
    return blocked("DENIED", "No se pudo leer el buzón ahora. Inténtalo de nuevo en unos minutos.");
  }
  if (result.status === "not_connected") {
    return blocked("DENIED", "El buzón aún no está conectado. Avisa al administrador.");
  }
  if (result.status === "reconnect") {
    return blocked("DENIED", "El buzón necesita reconectarse. Avisa al administrador.");
  }
  if (result.status === "error") {
    return blocked("DENIED", "No se pudo leer el buzón ahora. Inténtalo de nuevo en unos minutos.");
  }
  if (result.status === "not_found") return notFound;

  return {
    type: result.type,
    status: "FOUND",
    code: result.code,
    message: "Código temporal encontrado",
  };
}

/** ¿Es un correo de dominio propio (no Gmail/Outlook/Yahoo…)? Esos suelen ser reenvíos hacia un Gmail. */
function isCustomDomainEmail(email: string) {
  const value = email.trim().toLowerCase();
  const at = value.lastIndexOf("@");
  if (at < 1) return false;
  const domain = value.slice(at + 1);
  return !["gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "live.com", "yahoo.com", "icloud.com"].includes(
    domain,
  );
}

/** nombre+3@gmail.com → nombre@gmail.com (solo Gmail/Outlook, donde el "+" llega al mismo buzón). */
function baseMailboxEmail(email: string) {
  const value = email.trim().toLowerCase();
  const at = value.lastIndexOf("@");
  if (at < 1) return value;
  const domain = value.slice(at + 1);
  if (!["gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "live.com"].includes(domain)) return value;
  const local = value.slice(0, at).split("+")[0];
  return `${local}@${domain}`;
}
