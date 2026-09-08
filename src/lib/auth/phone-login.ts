import { whatsappParaGuardar, whatsappParaMostrar } from "@/lib/clientes";

const PHONE_AUTH_DOMAIN = "wa.panel.local";

export function normalizePhone(value: string) {
  const stored = whatsappParaGuardar(value);
  if (stored) return stored;
  return whatsappParaMostrar(value);
}

export function isPhoneLogin(value: string) {
  const trimmed = value.trim();
  if (trimmed.includes("@")) return false;
  return normalizePhone(trimmed).length >= 9;
}

export function phoneToAuthEmail(phone: string) {
  const normalized = normalizePhone(phone);
  return `${normalized}@${PHONE_AUTH_DOMAIN}`;
}

export function toAuthEmail(identifier: string) {
  const value = identifier.trim();
  if (!value) return "";
  if (isPhoneLogin(value)) return phoneToAuthEmail(value);
  return value.toLowerCase();
}
