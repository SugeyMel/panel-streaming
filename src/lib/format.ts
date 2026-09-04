import type {
  CustomerStatus,
  EmailConnectionStatus,
  EmailLookupStatus,
  OrderStatus,
  PaymentStatus,
  SellerStatus,
  SubscriptionStatus,
  SupportStatus,
} from "./types";

const currencyFormatter = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatCurrency(amount: number) {
  return currencyFormatter.format(amount);
}

function parseCalendarDate(isoDate: string) {
  const day = isoDate.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  return new Date(isoDate);
}

export function formatDate(isoDate: string) {
  return dateFormatter.format(parseCalendarDate(isoDate));
}

export function daysRemaining(endDate: string, now = new Date()) {
  const end = parseCalendarDate(endDate);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const finish = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((finish.getTime() - start.getTime()) / 86_400_000);
}

export function daysLeftLabel(endDate: string) {
  const days = daysRemaining(endDate);
  if (days > 1) return `Faltan ${days} días`;
  if (days === 1) return "Falta 1 día";
  if (days === 0) return "Vence hoy";
  return `Vencido hace ${Math.abs(days)} ${Math.abs(days) === 1 ? "día" : "días"}`;
}

export function serviceStatusFromDates(
  endDate: string,
  stored: SubscriptionStatus,
): SubscriptionStatus {
  if (stored === "cancelado" || stored === "suspendido") return stored;
  const days = daysRemaining(endDate);
  if (days < 0) return "vencido";
  if (days <= 7) return "proximo_a_vencer";
  return "activo";
}

export function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  const visible = user.slice(-2);
  return `${"•".repeat(Math.max(user.length - 2, 3))}${visible}@${domain}`;
}

export const orderStatusLabel: Record<OrderStatus, string> = {
  pendiente_pago: "Pendiente de pago",
  pago_enviado: "Pago enviado",
  pago_aprobado: "Pago aprobado",
  preparando: "Preparando",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export const sellerStatusLabel: Record<SellerStatus, string> = {
  activo: "Activo",
  suspendido: "Suspendido",
  pendiente: "Pendiente",
  desactivado: "Desactivado",
};

export const customerStatusLabel: Record<CustomerStatus, string> = {
  activo: "Activo",
  inactivo: "Inactivo",
  suspendido: "Suspendido",
};

export const subscriptionStatusLabel: Record<SubscriptionStatus, string> = {
  activo: "Activo",
  proximo_a_vencer: "Próximo a vencer",
  vencido: "Vencido",
  suspendido: "Suspendido",
  cancelado: "Cancelado",
};

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  pendiente: "Pendiente",
  enviado: "Enviado",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
};

export const supportStatusLabel: Record<SupportStatus, string> = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  respondido: "Respondido",
  cerrado: "Cerrado",
};

export const emailConnectionLabel: Record<EmailConnectionStatus, string> = {
  conectado: "Conectado",
  requiere_reconexion: "Requiere reconexión",
  desconectado: "Desconectado",
  error: "Error",
};

export const emailLookupLabel: Record<EmailLookupStatus, string> = {
  encontrado: "Encontrado",
  no_encontrado: "No encontrado",
  bloqueado: "Bloqueado",
  error: "Error",
  sin_autorizacion: "Sin autorización",
  servicio_vencido: "Servicio vencido",
};
