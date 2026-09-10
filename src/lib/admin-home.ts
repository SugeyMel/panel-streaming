import type { CustomerStatus, SellerStatus, WholesaleSale } from "@/lib/types";

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

export type AdminWholesaleIncome = {
  purchasedAt: string;
  amount: number;
  sellerName: string;
};

export type AdminHomePayload = {
  greetingName: string;
  defaultMonth: string;
  months: MonthOption[];
  sellers: AdminHomeSeller[];
  customers: AdminHomeCustomer[];
  wholesaleSales: AdminWholesaleIncome[];
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

export function calendarMonthKey(iso: string) {
  const day = iso.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) return day.slice(0, 7);
  return limaMonthKey(iso);
}

export function wholesaleAmountInMonth(sales: AdminWholesaleIncome[], monthKey: string) {
  return sales
    .filter((item) => calendarMonthKey(item.purchasedAt) === monthKey)
    .reduce((sum, item) => sum + item.amount, 0);
}

export function previousMonthKey(monthKey: string) {
  const [yearRaw, monthRaw] = monthKey.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!year || !month) return monthKey;
  if (month === 1) return `${year - 1}-12`;
  return `${year}-${String(month - 1).padStart(2, "0")}`;
}

export function monthChangeHint(current: number, previous: number) {
  if (previous > 0) {
    const pct = Math.round(((current - previous) / previous) * 100);
    const arrow = pct > 0 ? "↑" : pct < 0 ? "↓" : "→";
    return `${arrow} ${pct}% vs mes anterior`;
  }
  return current > 0 ? "Primer mes con ventas" : "Sin ventas este mes";
}

export function wholesaleIncomeFromSales(
  sales: WholesaleSale[],
  sellers: { id: string; name: string }[],
): AdminWholesaleIncome[] {
  return sales
    .filter((item) => item.status === "active")
    .map((item) => ({
      purchasedAt: item.purchasedAt,
      amount: item.wholesalePrice * item.quantity,
      sellerName: sellers.find((seller) => seller.id === item.sellerId)?.name ?? "Vendedor",
    }));
}
