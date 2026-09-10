import { NextRequest, NextResponse } from "next/server";
import { getAppSession, requireRole } from "@/lib/auth/get-session";
import { exchangeOAuthCode, oauthAccountEmail, saveOAuthTokens } from "@/lib/email-oauth";
import { isOAuthProvider, siteUrl } from "@/lib/email-oauth-config";
import { verifyOAuthState } from "@/lib/email-oauth-crypto";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function finish(path: string, oauth: string) {
  const url = new URL(path, siteUrl());
  url.searchParams.set("oauth", oauth);
  const response = NextResponse.redirect(url);
  response.cookies.set("ps_oauth_state", "", { path: "/", maxAge: 0 });
  return response;
}

export async function GET(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  const returnDefault = "/panel/correos";
  if (!isOAuthProvider(provider)) return finish(returnDefault, "proveedor");

  const code = request.nextUrl.searchParams.get("code") ?? "";
  const state = request.nextUrl.searchParams.get("state") ?? "";
  const oauthError = request.nextUrl.searchParams.get("error");
  const cookieState = request.cookies.get("ps_oauth_state")?.value ?? "";

  if (oauthError) return finish(returnDefault, "cancelado");
  if (!code || !state || !cookieState || state !== cookieState) return finish(returnDefault, "estado");

  const payload = verifyOAuthState(state);
  if (!payload) return finish(returnDefault, "estado");
  if (Number(payload.exp || 0) < Date.now()) return finish(returnDefault, "expirado");
  if (payload.provider !== provider) return finish(returnDefault, "proveedor");

  const returnTo = payload.returnTo === "/admin/correos" ? "/admin/correos" : "/panel/correos";

  try {
    const session = await getAppSession();
    requireRole(session, ["seller", "superadmin"]);
    if (session.role === "seller" && session.sellerId && session.sellerId !== payload.sellerId) {
      return finish(returnTo, "sesion");
    }
  } catch {
    return finish(returnTo, "sesion");
  }

  let exchanged;
  try {
    exchanged = await exchangeOAuthCode(provider, code);
  } catch (error) {
    console.error("[oauth-exchange]", error);
    return finish(returnTo, "token");
  }
  if (!exchanged.ok) {
    const googleCode = exchanged.code ?? "";
    if (googleCode === "redirect_uri_mismatch") return finish(returnTo, "redirect");
    if (googleCode === "invalid_client") return finish(returnTo, "cliente");
    if (googleCode === "invalid_grant") return finish(returnTo, "code");
    return finish(returnTo, "token");
  }

  const refreshToken = exchanged.tokens.refresh_token;
  if (!refreshToken) return finish(returnTo, "refresh");

  const supabase = createServiceClient();
  if (!supabase) return finish(returnTo, "servidor");

  const { data: mailbox } = await supabase
    .from("connected_emails")
    .select("id, email, seller_id")
    .eq("id", payload.mailboxId)
    .eq("seller_id", payload.sellerId)
    .maybeSingle();
  if (!mailbox) return finish(returnTo, "buzon");

  let oauthEmail = "";
  try {
    oauthEmail = await oauthAccountEmail(provider, exchanged.tokens.access_token ?? "");
  } catch {
    oauthEmail = "";
  }
  oauthEmail = (oauthEmail || String(mailbox.email)).trim().toLowerCase();

  const saved = await saveOAuthTokens({
    connectedEmailId: payload.mailboxId,
    sellerId: payload.sellerId,
    provider,
    oauthEmail,
    accessToken: exchanged.tokens.access_token ?? "",
    refreshToken,
    expiresIn: exchanged.tokens.expires_in ?? 3600,
    scope: exchanged.tokens.scope,
  });
  if (!saved.ok) {
    if (/email_oauth_tokens|oauth_email/i.test(saved.error)) return finish(returnTo, "sql");
    return finish(returnTo, "guardar");
  }

  return finish(returnTo, "ok");
}
