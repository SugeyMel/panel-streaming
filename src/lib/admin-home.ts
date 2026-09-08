import type { CustomerStatus, SellerStatus } from "@/lib/types";

const LIMA_OFFSET_MS = 5 * 60 * 60 * 1000;

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export type AdminHomeSeller = {
  id: string;
  name: string;
  status: SellerStatus;
  registeredAt: string;
};

export type AdminHomeCustomer = {
  id: string;
  status: CustomerStatus;
  registeredAt: string;
};

export type AdminHomePayload = {
  greetingName: string;
  defaultMonth: string;
  months: MonthOption[];
  sellers: AdminHomeSeller[];
  customers: AdminHomeCustomer[];
};

export type MonthOption = {
  value: string;
  label: string;
};

export function limaMonthKey(iso: string) {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";
  const shifted = new Date(parsed.getTime() - LIMA_OFFSET_MS);
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function currentLimaMonthKey() {
  return limaMonthKey(new Date().toISOString());
}

export function monthOptions(count = 12): MonthOption[] {
  const shifted = new Date(Date.now() - LIMA_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const monthIndex = shifted.getUTCMonth();
  return Array.from({ length: count }, (_, offset) => {
    const date = new Date(Date.UTC(year, monthIndex - offset, 1));
    return {
      value: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
      label: `${MONTH_NAMES[date.getUTCMonth()]} ${date.getUTCFullYear()}`,
    };
  });
}

export function firstName(fullName: string) {
  const trimmed = fullName.trim();
  if (!trimmed) return "Admin";
  return trimmed.split(/\s+/)[0] ?? "Admin";
}

export function inSelectedMonth(iso: string, monthKey: string) {
  return limaMonthKey(iso) === monthKey;
}
