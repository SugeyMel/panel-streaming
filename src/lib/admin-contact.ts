/** WhatsApp de contacto del administrador (solo lo ven los vendedores). Se edita en Administrador → Configuración. */
export const DEFAULT_ADMIN_WHATSAPP = "51931330910";

/** "+51 931 330 910", "931330910"… → "51931330910". Devuelve null si no parece un número válido. */
export function normalizeAdminWhatsapp(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 9) digits = `51${digits}`;
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

export function adminWhatsappDisplay(digits: string) {
  return digits.startsWith("51") && digits.length === 11 ? `+51 ${digits.slice(2)}` : `+${digits}`;
}

export function adminWhatsappLink(digits: string, text?: string) {
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function customersDisabledMessage(digits: string) {
  return `Crear clientes está desactivado en tu cuenta. Para activarlo, escribe al administrador por WhatsApp: ${adminWhatsappDisplay(digits)}`;
}
