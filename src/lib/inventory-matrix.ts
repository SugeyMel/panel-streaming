import { daysRemaining, serviceStatusFromDates } from "@/lib/format";
import type { Customer, StreamingAccount, Subscription } from "@/lib/types";

export type ProfileSlot = {
  index: number;
  service: Subscription | null;
  customer: Customer | null;
};

export type InventoryAccountRow = {
  account: StreamingAccount;
  slots: ProfileSlot[];
  freeCount: number;
  usedCount: number;
  isFullAccount: boolean;
  nearestEnd: string | null;
  hasExpiring: boolean;
  hasExpired: boolean;
  hasActive: boolean;
};

export function parseProfileSlot(value?: string) {
  const raw = (value ?? "").trim();
  const match = /^(\d+)\b/.exec(raw);
  if (!match) return { slot: 0, name: raw };
  return { slot: Number(match[1]), name: raw.replace(/^\d+\s*[·\-–.]?\s*/, "").trim() };
}

export function servicesOnAccount(account: StreamingAccount, services: Subscription[]) {
  const email = account.email.trim().toLowerCase();
  return services.filter((item) => {
    if (item.status === "cancelado") return false;
    if (item.accountId === account.id) return true;
    if (item.accountId) return false;
    return Boolean(email && item.platformEmail.toLowerCase() === email);
  });
}

export function buildInventoryRows(
  accounts: StreamingAccount[],
  services: Subscription[],
  customers: Customer[],
): InventoryAccountRow[] {
  return accounts.map((account) => {
    const max = Math.min(8, Math.max(1, account.maxProfiles || 5));
    const isFullAccount = account.saleKind === "full" || max <= 1 || /completa/i.test(account.label);
    const related = servicesOnAccount(account, services);
    const slots: ProfileSlot[] = Array.from({ length: max }, (_, index) => ({
      index: index + 1,
      service: null,
      customer: null,
    }));

    for (const service of related) {
      const parsed = parseProfileSlot(service.accessProfile);
      const slot = slots.find((item) => item.index === parsed.slot);
      if (slot && !slot.service) slot.service = service;
    }
    for (const service of related) {
      if (slots.some((item) => item.service?.id === service.id)) continue;
      const empty = slots.find((item) => !item.service);
      if (empty) empty.service = service;
    }

    for (const slot of slots) {
      if (!slot.service) continue;
      slot.customer = customers.find((item) => item.id === slot.service?.customerId) ?? null;
    }

    const occupied = slots.filter((item) => item.service);
    const ends = occupied.map((item) => item.service?.endDate).filter(Boolean) as string[];
    const statuses = occupied.map((item) =>
      serviceStatusFromDates(item.service!.endDate, item.service!.status),
    );

    return {
      account,
      slots,
      freeCount: slots.filter((item) => !item.service).length,
      usedCount: occupied.length,
      isFullAccount,
      nearestEnd: ends.sort()[0] ?? null,
      hasExpiring: statuses.includes("proximo_a_vencer"),
      hasExpired: statuses.includes("vencido"),
      hasActive: statuses.includes("activo") || statuses.includes("proximo_a_vencer"),
    };
  });
}

export function slotTone(service: Subscription | null) {
  if (!service) return "free" as const;
  const status = serviceStatusFromDates(service.endDate, service.status);
  if (status === "vencido") return "expired" as const;
  if (status === "proximo_a_vencer") return "expiring" as const;
  return "active" as const;
}

export function inventoryEndDate(row: InventoryAccountRow) {
  return row.account.expiresAt || row.nearestEnd;
}

export function inventoryHealth(endDate: string | null) {
  if (!endDate) {
    return { days: null as number | null, tone: "none" as const, label: "Sin fecha" };
  }
  const days = daysRemaining(endDate);
  if (days > 3) return { days, tone: "ok" as const, label: "Vigente" };
  if (days >= 2) return { days, tone: "warn" as const, label: "Por vencer" };
  if (days < 0) return { days, tone: "bad" as const, label: "Vencido" };
  return { days, tone: "bad" as const, label: days === 0 ? "Vencido" : "Por vencer" };
}

export function compactDays(endDate: string) {
  const days = daysRemaining(endDate);
  if (days < 0) return "VENCIDO";
  if (days === 0) return "Hoy";
  return `${days}d`;
}
