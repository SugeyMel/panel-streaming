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

const LIMA_OFFSET_MS = 5 * 60 * 60 * 1000;

function limaParts(date: Date) {
  const shifted = new Date(date.getTime() - LIMA_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

export function formatCurrency(amount: number) {
  const n = Number.isFinite(amount) ? amount : 0;
  const negative = n < 0;
  const [int, frac] = Math.abs(n).toFixed(2).split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}S/ ${grouped}.${frac}`;
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
  const fromIso = isoToDayMonthYear(isoDate);
  if (fromIso) return fromIso;
  const parsed = parseCalendarDate(isoDate);
  if (Number.isNaN(parsed.getTime())) return "";
  const { year, month, day } = limaParts(parsed);
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

export function isoToDayMonthYear(isoDate: string) {
  const day = isoDate.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return "";
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function dayMonthYearToIso(value: string) {
  const match = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/.exec(value.trim());
  if (!match) return "";
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function formatDateTime(isoDate: string) {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return formatDate(isoDate);
  const { year, month, day, hour, minute } = limaParts(parsed);
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
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
  registrado: "Registrado",
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
