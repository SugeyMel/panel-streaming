import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getAppSession, requireRole } from "@/lib/auth/get-session";
import { authorizeUrl } from "@/lib/email-oauth";
import { isOAuthProvider, isProviderOAuthConfigured } from "@/lib/email-oauth-config";
import { signOAuthState } from "@/lib/email-oauth-crypto";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function correosRedirect(path: "/panel/correos" | "/admin/correos", error: string) {
  const url = new URL(path, process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
  url.searchParams.set("oauth", error);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  const returnParam = request.nextUrl.searchParams.get("returnTo");
  const returnTo = returnParam === "/admin/correos" ? "/admin/correos" : "/panel/correos";

  if (!isOAuthProvider(provider)) return correosRedirect(returnTo, "proveedor");
  if (!isProviderOAuthConfigured(provider)) return correosRedirect(returnTo, "faltan_claves");

  let session;
  try {
    session = await getAppSession();
    requireRole(session, ["seller", "superadmin"]);
    if (!session.userId && session.mode !== "demo") return correosRedirect(returnTo, "sesion");
  } catch {
    return correosRedirect(returnTo, "sesion");
  }

  if (session.role === "seller" && !session.sellerId) return correosRedirect(returnTo, "sesion");

  const mailboxId = request.nextUrl.searchParams.get("mailboxId")?.trim() ?? "";
  if (!mailboxId) return correosRedirect(returnTo, "buzon");

  const supabase = createServiceClient() ?? (await createClient());
  if (!supabase) return correosRedirect(returnTo, "servidor");

  let query = supabase.from("connected_emails").select("id, seller_id, email, provider").eq("id", mailboxId);
  if (session.role === "seller" && session.sellerId) query = query.eq("seller_id", session.sellerId);
  const { data: mailbox, error } = await query.maybeSingle();
  if (error || !mailbox) return correosRedirect(returnTo, "buzon");

  const nonce = randomBytes(16).toString("hex");
  const state = signOAuthState({
    mailboxId: String(mailbox.id),
    sellerId: mailbox.seller_id ? String(mailbox.seller_id) : "",
    provider,
    nonce,
    exp: String(Date.now() + 10 * 60 * 1000),
    returnTo: session.role === "superadmin" ? "/admin/correos" : returnTo,
  });

  const response = NextResponse.redirect(authorizeUrl(provider, state, String(mailbox.email)));
  response.cookies.set("ps_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 600,
  });
  return response;
}
