/** Textos y reglas de Disney Premium / Disney Estándar. Sin acceso a base de datos: lo usa el navegador y el servidor. */

export const DISNEY_CODE_WARNING =
  "⚠️ Cualquier cambio de correo en esta cuenta será considerado robo y se procederá con la anulación inmediata de todos tus servicios activos y bloqueo permanente del panel, sin derecho a reembolso.";

export const DISNEY_LIMIT_MESSAGE = "Límite alcanzado, comunícate con tu proveedor";
export const DISNEY_PENDING_MESSAGE = "Esperando aprobación";
/** Quedó de cuando un aviso de Disney pausaba la cuenta. Ya no se usa: el aviso no bloquea códigos. */
export const DISNEY_PAUSED_MESSAGE =
  "Esta cuenta está pausada porque Disney avisó un cambio de correo o clave. Solo el administrador puede reactivarla.";
export const DISNEY_EXPIRED_MESSAGE = "La solicitud se canceló porque no se aprobó en 15 minutos.";
export const DISNEY_REJECTED_MESSAGE = "El administrador rechazó esta solicitud.";

/** Misma ventana que el resto de plataformas: solo se entrega si llegó en los últimos 30 minutos. */
export const DISNEY_CODE_MAX_AGE_MINUTES = 30;
/** Máximo de códigos entregados por cuenta (correo) en una hora. */
export const DISNEY_CODE_HOURLY_MAX = 3;
export const DISNEY_APPROVAL_WINDOW_MS = 15 * 60 * 1000;

export function isDisneyPlatform(platform?: { slug?: string | null; name?: string | null } | null) {
  const value = `${platform?.slug ?? ""} ${platform?.name ?? ""}`.toLowerCase();
  return value.includes("disney");
}

/** Interruptor "Requiere mi aprobación": solo Disney Premium y Disney Estándar. */
export function isDisneyApprovalPlatform(platform?: { slug?: string | null; name?: string | null } | null) {
  if (!isDisneyPlatform(platform)) return false;
  const value = `${platform?.slug ?? ""} ${platform?.name ?? ""}`.toLowerCase();
  return value.includes("premium") || value.includes("estandar") || value.includes("estándar");
}
