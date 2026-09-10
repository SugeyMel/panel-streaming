import {
  GOOGLE_SCOPES,
  googleOAuthEnv,
  isOAuthProvider,
  MICROSOFT_SCOPES,
  microsoftOAuthEnv,
  oauthRedirectUri,
  type OAuthProvider,
} from "@/lib/email-oauth-config";
import { decryptSecret, encryptSecret } from "@/lib/email-oauth-crypto";
import { createServiceClient } from "@/lib/supabase/server";

export type StoredOAuthToken = {
  connectedEmailId: string;
  sellerId: string;
  provider: OAuthProvider;
  oauthEmail: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
};

function db() {
  return createServiceClient();
}

export function googleAuthorizeUrl(state: string, loginHint?: string) {
  const env = googleOAuthEnv();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", env.clientId);
  url.searchParams.set("redirect_uri", env.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_SCOPES);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", state);
  if (loginHint) url.searchParams.set("login_hint", loginHint);
  return url.toString();
}

export function microsoftAuthorizeUrl(state: string, loginHint?: string) {
  const env = microsoftOAuthEnv();
  const url = new URL(`https://login.microsoftonline.com/${env.tenant}/oauth2/v2.0/authorize`);
  url.searchParams.set("client_id", env.clientId);
  url.searchParams.set("redirect_uri", env.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", MICROSOFT_SCOPES);
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "consent");
  if (loginHint) url.searchParams.set("login_hint", loginHint);
  return url.toString();
}

export function authorizeUrl(provider: OAuthProvider, state: string, loginHint?: string) {
  return provider === "google" ? googleAuthorizeUrl(state, loginHint) : microsoftAuthorizeUrl(state, loginHint);
}

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
};

async function googleExchange(code: string): Promise<TokenResponse> {
  const env = googleOAuthEnv();
  const body = new URLSearchParams({
    code,
    client_id: env.clientId,
    client_secret: env.clientSecret,
    redirect_uri: env.redirectUri,
    grant_type: "authorization_code",
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const raw = await response.text();
  try {
    return JSON.parse(raw) as TokenResponse;
  } catch {
    return { error: "invalid_response", error_description: `Google token HTTP ${response.status}` };
  }
}

async function microsoftExchange(code: string): Promise<TokenResponse> {
  const env = microsoftOAuthEnv();
  const body = new URLSearchParams({
    code,
    client_id: env.clientId,
    client_secret: env.clientSecret,
    redirect_uri: env.redirectUri,
    grant_type: "authorization_code",
    scope: MICROSOFT_SCOPES,
  });
  const response = await fetch(`https://login.microsoftonline.com/${env.tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  return (await response.json()) as TokenResponse;
}

export async function exchangeOAuthCode(provider: OAuthProvider, code: string) {
  const tokens = provider === "google" ? await googleExchange(code) : await microsoftExchange(code);
  if (!tokens.access_token) {
    const detail = tokens.error_description || tokens.error || "No se pudo completar OAuth.";
    console.error("[oauth-token]", provider, tokens.error, tokens.error_description);
    return { ok: false as const, error: detail, code: tokens.error ?? "token" };
  }
  return { ok: true as const, tokens };
}

async function googleRefresh(refreshToken: string): Promise<TokenResponse> {
  const env = googleOAuthEnv();
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: env.clientId,
    client_secret: env.clientSecret,
    grant_type: "refresh_token",
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  return (await response.json()) as TokenResponse;
}

async function microsoftRefresh(refreshToken: string): Promise<TokenResponse> {
  const env = microsoftOAuthEnv();
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: env.clientId,
    client_secret: env.clientSecret,
    grant_type: "refresh_token",
    scope: MICROSOFT_SCOPES,
  });
  const response = await fetch(`https://login.microsoftonline.com/${env.tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  return (await response.json()) as TokenResponse;
}

export async function oauthAccountEmail(provider: OAuthProvider, accessToken: string) {
  if (provider === "google") {
    const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const json = (await response.json()) as { email?: string };
    return (json.email ?? "").trim().toLowerCase();
  }
  const response = await fetch("https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const json = (await response.json()) as { mail?: string; userPrincipalName?: string };
  return (json.mail || json.userPrincipalName || "").trim().toLowerCase();
}

export async function saveOAuthTokens(input: {
  connectedEmailId: string;
  sellerId: string;
  provider: OAuthProvider;
  oauthEmail: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scope?: string;
}) {
  const supabase = db();
  if (!supabase) return { ok: false as const, error: "Sin cliente de base de datos." };
  const expiresAt = new Date(Date.now() + Math.max(60, input.expiresIn - 60) * 1000).toISOString();
  const payload = {
    connected_email_id: input.connectedEmailId,
    seller_id: input.sellerId,
    provider: input.provider,
    oauth_email: input.oauthEmail,
    access_token: encryptSecret(input.accessToken),
    refresh_token: encryptSecret(input.refreshToken),
    expires_at: expiresAt,
    scope: input.scope ?? "",
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("email_oauth_tokens").upsert(payload, { onConflict: "connected_email_id" });
  if (error) return { ok: false as const, error: error.message };
  const { error: mailboxError } = await supabase
    .from("connected_emails")
    .update({
      status: "conectado",
      oauth_email: input.oauthEmail,
      last_sync_at: new Date().toISOString(),
      provider: input.provider,
    })
    .eq("id", input.connectedEmailId)
    .eq("seller_id", input.sellerId);
  if (mailboxError) return { ok: false as const, error: mailboxError.message };
  return { ok: true as const };
}

export async function loadOAuthToken(connectedEmailId: string): Promise<StoredOAuthToken | null> {
  const supabase = db();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("email_oauth_tokens")
    .select("*")
    .eq("connected_email_id", connectedEmailId)
    .maybeSingle();
  if (error || !data) return null;
  const provider = String(data.provider);
  if (!isOAuthProvider(provider)) return null;
  return {
    connectedEmailId: String(data.connected_email_id),
    sellerId: String(data.seller_id),
    provider,
    oauthEmail: String(data.oauth_email ?? ""),
    accessToken: decryptSecret(String(data.access_token ?? "")),
    refreshToken: decryptSecret(String(data.refresh_token ?? "")),
    expiresAt: String(data.expires_at),
  };
}

export async function getValidAccessToken(connectedEmailId: string) {
  const stored = await loadOAuthToken(connectedEmailId);
  if (!stored) return { ok: false as const, reason: "not_connected" as const };
  const expires = Date.parse(stored.expiresAt);
  if (Number.isFinite(expires) && expires - 30_000 > Date.now() && stored.accessToken) {
    return { ok: true as const, token: stored };
  }
  if (!stored.refreshToken) {
    await markMailboxReconnect(stored.connectedEmailId, stored.sellerId);
    return { ok: false as const, reason: "reconnect" as const };
  }
  const refreshed =
    stored.provider === "google" ? await googleRefresh(stored.refreshToken) : await microsoftRefresh(stored.refreshToken);
  if (!refreshed.access_token) {
    await markMailboxReconnect(stored.connectedEmailId, stored.sellerId);
    return { ok: false as const, reason: "reconnect" as const };
  }
  const next: StoredOAuthToken = {
    ...stored,
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token || stored.refreshToken,
    expiresAt: new Date(Date.now() + Math.max(60, (refreshed.expires_in ?? 3600) - 60) * 1000).toISOString(),
  };
  await saveOAuthTokens({
    connectedEmailId: next.connectedEmailId,
    sellerId: next.sellerId,
    provider: next.provider,
    oauthEmail: next.oauthEmail,
    accessToken: next.accessToken,
    refreshToken: next.refreshToken,
    expiresIn: refreshed.expires_in ?? 3600,
    scope: refreshed.scope,
  });
  return { ok: true as const, token: next };
}

export async function markMailboxReconnect(connectedEmailId: string, sellerId: string) {
  const supabase = db();
  if (!supabase) return;
  await supabase
    .from("connected_emails")
    .update({ status: "requiere_reconexion" })
    .eq("id", connectedEmailId)
    .eq("seller_id", sellerId);
}

export async function deleteOAuthTokens(connectedEmailId: string, sellerId: string) {
  const supabase = db();
  if (!supabase) return { ok: false as const, error: "Sin cliente de base de datos." };
  await supabase.from("email_oauth_tokens").delete().eq("connected_email_id", connectedEmailId).eq("seller_id", sellerId);
  const { error } = await supabase
    .from("connected_emails")
    .update({ status: "registrado", oauth_email: null, last_sync_at: null })
    .eq("id", connectedEmailId)
    .eq("seller_id", sellerId);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function touchMailboxSync(connectedEmailId: string, sellerId: string) {
  const supabase = db();
  if (!supabase) return;
  await supabase
    .from("connected_emails")
    .update({ last_sync_at: new Date().toISOString(), status: "conectado" })
    .eq("id", connectedEmailId)
    .eq("seller_id", sellerId);
}

export { oauthRedirectUri };
