/**
 * Política del Centro de Acceso.
 * La consulta real pasa por lookupAccessCodeAction y el filtro deny-by-default.
 * No conectar Gmail/Outlook con contraseña. No devolver el correo completo.
 */
import type { EmailLookupRequest, EmailLookupResult, Subscription } from "@/lib/types";

const RATE_LIMIT = { max: 5, windowMinutes: 10 };

export const accessPolicy = {
  denyByDefault: true,
  rateLimit: RATE_LIMIT,
  blockedIfUnmatched: true,
  neverReturnFullEmail: true,
};

export function authorizeLookup(
  request: EmailLookupRequest,
  subscription: Subscription | undefined,
) {
  if (!subscription) return false;
  if (subscription.status !== "activo" && subscription.status !== "proximo_a_vencer") {
    return false;
  }
  return (
    subscription.customerId === request.customerId &&
    subscription.sellerId === request.sellerId &&
    subscription.id === request.subscriptionId &&
    subscription.platformId === request.platformId &&
    (!subscription.connectedEmailAccountId ||
      subscription.connectedEmailAccountId === request.connectedEmailAccountId) &&
    (!subscription.platformEmailAssignmentId ||
      subscription.platformEmailAssignmentId === request.platformEmailAssignmentId)
  );
}

export function simulateLookup(
  request: EmailLookupRequest,
  subscription: Subscription | undefined,
  attempt: number,
): EmailLookupResult {
  if (attempt >= RATE_LIMIT.max) {
    return {
      type: "UNKNOWN_BLOCKED",
      status: "RATE_LIMITED",
      message: "Has realizado demasiadas consultas. Inténtalo nuevamente en unos minutos.",
    };
  }

  if (!authorizeLookup(request, subscription)) {
    return {
      type: "UNKNOWN_BLOCKED",
      status: "DENIED",
      message: "Este mensaje no puede procesarse automáticamente. Contacta con tu vendedor.",
    };
  }

  if (subscription?.platformId === "plt_netflix") {
    return {
      type: "LOGIN_CODE",
      status: "FOUND",
      code: "4827",
      message: "Código temporal encontrado",
    };
  }

  if (subscription?.platformId === "plt_disney") {
    return {
      type: "LOGIN_CODE",
      status: "NOT_FOUND",
      message: "Todavía no encontramos un mensaje reciente. Puedes intentarlo nuevamente en unos segundos.",
    };
  }

  return {
    type: "UNKNOWN_BLOCKED",
    status: "BLOCKED",
    message: "Este mensaje no puede procesarse automáticamente. Contacta con tu vendedor.",
  };
}
