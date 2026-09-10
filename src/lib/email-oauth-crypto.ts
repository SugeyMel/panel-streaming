import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

function secret() {
  return (
    process.env.EMAIL_OAUTH_TOKEN_SECRET ||
    process.env.GOOGLE_OAUTH_CLIENT_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "panel-streaming-email-oauth"
  );
}

function aesKey() {
  return createHash("sha256").update(secret()).digest();
}

export function encryptSecret(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", aesKey(), iv);
  const encoded = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${encoded.toString("base64url")}`;
}

export function decryptSecret(value: string) {
  if (!value.startsWith("v1:")) return value;
  const parts = value.split(":");
  if (parts.length !== 4) return value;
  const [, iv, tag, data] = parts;
  const decipher = createDecipheriv("aes-256-gcm", aesKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}

export function signOAuthState(payload: Record<string, string>) {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyOAuthState(token: string) {
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", secret()).update(body).digest();
  const given = Buffer.from(sig, "base64url");
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Record<string, string>;
  } catch {
    return null;
  }
}
