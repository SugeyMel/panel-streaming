export type OAuthProvider = "google" | "microsoft";

export function isOAuthProvider(value: string): value is OAuthProvider {
  return value === "google" || value === "microsoft";
}

export function isGoogleOAuthConfigured() {
  return Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET);
}

export function isMicrosoftOAuthConfigured() {
  return Boolean(process.env.MICROSOFT_OAUTH_CLIENT_ID && process.env.MICROSOFT_OAUTH_CLIENT_SECRET);
}

export function isProviderOAuthConfigured(provider: OAuthProvider) {
  return provider === "google" ? isGoogleOAuthConfigured() : isMicrosoftOAuthConfigured();
}

export function siteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}

export function oauthRedirectUri(provider: OAuthProvider) {
  const override =
    provider === "google" ? process.env.GOOGLE_OAUTH_REDIRECT_URI : process.env.MICROSOFT_OAUTH_REDIRECT_URI;
  if (override) return override.replace(/\/$/, "");
  return `${siteUrl()}/api/oauth/${provider}/callback`;
}

export function googleOAuthEnv() {
  const clientId = (process.env.GOOGLE_OAUTH_CLIENT_ID ?? "").trim();
  const clientSecret = (process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "").trim();
  return { clientId, clientSecret, redirectUri: oauthRedirectUri("google") };
}

export function microsoftOAuthEnv() {
  const clientId = process.env.MICROSOFT_OAUTH_CLIENT_ID ?? "";
  const clientSecret = process.env.MICROSOFT_OAUTH_CLIENT_SECRET ?? "";
  const tenant = process.env.MICROSOFT_OAUTH_TENANT || "common";
  return { clientId, clientSecret, tenant, redirectUri: oauthRedirectUri("microsoft") };
}

export const GOOGLE_SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/gmail.readonly",
].join(" ");

export const MICROSOFT_SCOPES = ["offline_access", "User.Read", "Mail.Read"].join(" ");
