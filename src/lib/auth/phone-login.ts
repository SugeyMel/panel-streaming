const PHONE_AUTH_DOMAIN = "wa.panel.local";

export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("51") && digits.length >= 11) return digits;
  if (digits.length === 9 && digits.startsWith("9")) return `51${digits}`;
  return digits;
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
