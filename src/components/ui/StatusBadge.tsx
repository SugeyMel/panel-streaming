import type { ReactNode } from "react";
import {
  customerStatusLabel,
  emailConnectionLabel,
  emailLookupLabel,
  orderStatusLabel,
  sellerStatusLabel,
  subscriptionStatusLabel,
  supportStatusLabel,
} from "@/lib/format";
import type {
  CustomerStatus,
  EmailConnectionStatus,
  EmailLookupStatus,
  OrderStatus,
  SellerStatus,
  SubscriptionStatus,
  SupportStatus,
} from "@/lib/types";

export type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "violet";

const tones: Record<Tone, string> = {
  neutral: "bg-[#172033] text-[#94A3B8]",
  success: "bg-[#22C55E]/15 text-[#22C55E]",
  warning: "bg-[#F59E0B]/15 text-[#F59E0B]",
  danger: "bg-[#EF4444]/15 text-[#EF4444]",
  info: "bg-[#38BDF8]/15 text-[#38BDF8]",
  violet: "bg-[#8B5CF6]/15 text-[#8B5CF6]",
};

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export type HealthStatus = "activo" | "por_vencer" | "vencido";

const healthLabel: Record<HealthStatus, string> = {
  activo: "Activo",
  por_vencer: "Por vencer",
  vencido: "Vencido",
};

const healthClass: Record<HealthStatus, string> = {
  activo: "bg-[#16A34A] text-white",
  por_vencer: "bg-[#FBBF24] text-[#1C1917]",
  vencido: "bg-[#DC2626] text-white",
};

export function HealthStatusBadge({ status }: { status: HealthStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${healthClass[status]}`}>
      {healthLabel[status]}
    </span>
  );
}

const orderTone: Record<OrderStatus, Tone> = {
  pendiente_pago: "warning",
  pago_enviado: "info",
  pago_aprobado: "violet",
  preparando: "info",
  entregado: "success",
  cancelado: "danger",
};

const sellerTone: Record<SellerStatus, Tone> = {
  activo: "success",
  suspendido: "warning",
  pendiente: "info",
  desactivado: "danger",
};

const customerTone: Record<CustomerStatus, Tone> = {
  activo: "success",
  inactivo: "neutral",
  suspendido: "warning",
};

const subscriptionTone: Record<SubscriptionStatus, Tone> = {
  activo: "success",
  proximo_a_vencer: "warning",
  vencido: "danger",
  suspendido: "warning",
  cancelado: "danger",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={orderTone[status]}>{orderStatusLabel[status]}</Badge>;
}

export function SellerStatusBadge({ status }: { status: SellerStatus }) {
  return <Badge tone={sellerTone[status]}>{sellerStatusLabel[status]}</Badge>;
}

export function CustomerStatusBadge({ status }: { status: CustomerStatus }) {
  return <Badge tone={customerTone[status]}>{customerStatusLabel[status]}</Badge>;
}

export function SubscriptionStatusBadge({ status }: { status: SubscriptionStatus }) {
  return <Badge tone={subscriptionTone[status]}>{subscriptionStatusLabel[status]}</Badge>;
}

export function SupportStatusBadge({ status }: { status: SupportStatus }) {
  const map: Record<SupportStatus, Tone> = {
    pendiente: "warning",
    en_proceso: "info",
    respondido: "success",
    cerrado: "neutral",
  };
  return <Badge tone={map[status]}>{supportStatusLabel[status]}</Badge>;
}

export function EmailStatusBadge({ status }: { status: EmailConnectionStatus }) {
  const map: Record<EmailConnectionStatus, Tone> = {
    conectado: "success",
    requiere_reconexion: "warning",
    desconectado: "neutral",
    error: "danger",
  };
  return <Badge tone={map[status]}>{emailConnectionLabel[status]}</Badge>;
}

export function LookupStatusBadge({ status }: { status: EmailLookupStatus }) {
  const map: Record<EmailLookupStatus, Tone> = {
    encontrado: "success",
    no_encontrado: "warning",
    bloqueado: "danger",
    error: "danger",
    sin_autorizacion: "danger",
    servicio_vencido: "warning",
  };
  return <Badge tone={map[status]}>{emailLookupLabel[status]}</Badge>;
}
