import { formatCurrency } from "@/lib/format";
import type { Order } from "@/lib/types";

const PAID: ReadonlySet<string> = new Set(["pago_aprobado", "preparando", "entregado"]);

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;
const MESES_CORTO = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"] as const;

export type PaidSale = {
  createdAt: string;
  amount: number;
  customerId: string;
};

export type PeriodId = "este_mes" | "mes_pasado" | "ultimos_3";
export type Grain = "dia" | "semana" | "mes";

export type ChartPoint = {
  key: string;
  label: string;
  tooltip: string;
  amount: number;
};

export type SalesPerformanceView = {
  points: ChartPoint[];
  total: number;
  totalLabel: string;
  salesCount: number;
  salesLabel: string;
  salesHint: string;
  clientsCount: number;
  clientsLabel: string;
  clientsHint: string;
  variationPct: number | null;
  variationLabel: string;
  variationTone: "muted" | "up" | "down";
  empty: boolean;
};

export function paidSalesFromOrders(orders: Order[]): PaidSale[] {
  return orders
    .filter((item) => PAID.has(item.status))
    .map((item) => ({
      createdAt: item.createdAt,
      amount: item.amount,
      customerId: item.customerId,
    }));
}

export function limaYmd(iso: string): string {
  const date = iso.length <= 10 ? new Date(`${iso.slice(0, 10)}T12:00:00.000-05:00`) : new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const shifted = new Date(date.getTime() - 5 * 60 * 60 * 1000);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function limaToday(): string {
  return limaYmd(new Date().toISOString());
}

function addDays(ymd: string, delta: number): string {
  const date = new Date(`${ymd}T12:00:00-05:00`);
  date.setTime(date.getTime() + delta * 86_400_000);
  return limaYmd(date.toISOString());
}

function weekdayMon0(ymd: string): number {
  return (new Date(`${ymd}T12:00:00-05:00`).getUTCDay() + 6) % 7;
}

function monthStart(ymd: string): string {
  return `${ymd.slice(0, 7)}-01`;
}

function monthEnd(ymd: string): string {
  const year = Number(ymd.slice(0, 4));
  const month = Number(ymd.slice(5, 7));
  const next = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  return addDays(next, -1);
}

function shiftMonthYmd(ymd: string, delta: number): string {
  const year = Number(ymd.slice(0, 4));
  let monthIndex = Number(ymd.slice(5, 7)) - 1 + delta;
  let nextYear = year;
  while (monthIndex < 0) {
    monthIndex += 12;
    nextYear -= 1;
  }
  while (monthIndex > 11) {
    monthIndex -= 12;
    nextYear += 1;
  }
  return `${nextYear}-${String(monthIndex + 1).padStart(2, "0")}-01`;
}

function compareYmd(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function inRange(ymd: string, start: string, end: string) {
  return compareYmd(ymd, start) >= 0 && compareYmd(ymd, end) <= 0;
}

function isoWeek(ymd: string): { year: number; week: number } {
  const thursday = addDays(ymd, 3 - weekdayMon0(ymd));
  const weekYear = Number(thursday.slice(0, 4));
  const jan4 = `${weekYear}-01-04`;
  const week1mon = addDays(jan4, -weekdayMon0(jan4));
  const diff = (Date.parse(`${thursday}T12:00:00-05:00`) - Date.parse(`${week1mon}T12:00:00-05:00`)) / 86_400_000;
  return { year: weekYear, week: Math.floor(diff / 7) + 1 };
}

function periodBounds(period: PeriodId): { start: string; end: string } {
  const today = limaToday();
  if (period === "este_mes") {
    return { start: monthStart(today), end: today };
  }
  if (period === "mes_pasado") {
    const start = shiftMonthYmd(today, -1);
    return { start, end: monthEnd(start) };
  }
  return { start: monthStart(shiftMonthYmd(today, -2)), end: today };
}

function previousBounds(period: PeriodId): { start: string; end: string } {
  const today = limaToday();
  if (period === "este_mes") {
    const start = shiftMonthYmd(today, -1);
    return { start, end: monthEnd(start) };
  }
  if (period === "mes_pasado") {
    const start = shiftMonthYmd(today, -2);
    return { start, end: monthEnd(start) };
  }
  const current = periodBounds("ultimos_3");
  const prevEnd = addDays(current.start, -1);
  return { start: monthStart(shiftMonthYmd(current.start, -3)), end: prevEnd };
}

function eachDay(start: string, end: string): string[] {
  const days: string[] = [];
  let cursor = start;
  while (compareYmd(cursor, end) <= 0) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

function formatDayTooltip(ymd: string) {
  const [year, month, day] = ymd.split("-");
  return `${day}/${month}/${year}`;
}

function niceScale(maxValue: number): { max: number; ticks: number[] } {
  if (maxValue <= 0) {
    return { max: 80, ticks: [0, 20, 40, 60, 80] };
  }
  const rough = maxValue / 4;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const residual = rough / mag;
  const nice = residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 5 ? 5 : 10;
  const step = nice * mag;
  const max = step * 4;
  return { max, ticks: [0, step, step * 2, step * 3, max] };
}

export function yAxisTicks(maxAmount: number) {
  return niceScale(maxAmount);
}

function sumSales(list: PaidSale[]) {
  return list.reduce((sum, item) => sum + item.amount, 0);
}

function inPeriod(sale: PaidSale, start: string, end: string) {
  return inRange(limaYmd(sale.createdAt), start, end);
}

export function computeSalesPerformance(sales: PaidSale[], period: PeriodId, grain: Grain): SalesPerformanceView {
  const { start, end } = periodBounds(period);
  const prev = previousBounds(period);
  const inCurrent = sales.filter((item) => inPeriod(item, start, end));
  const inPrev = sales.filter((item) => inPeriod(item, prev.start, prev.end));
  const total = sumSales(inCurrent);
  const prevTotal = sumSales(inPrev);
  const clients = new Set(inCurrent.map((item) => item.customerId).filter(Boolean));
  const empty = inCurrent.length === 0;

  let variationPct: number | null = null;
  let variationLabel = "Sin periodo anterior para comparar";
  let variationTone: SalesPerformanceView["variationTone"] = "muted";
  if (prevTotal > 0) {
    variationPct = Math.round(((total - prevTotal) / prevTotal) * 100);
    variationLabel = `${variationPct > 0 ? "+" : ""}${variationPct}% vs. mes anterior`;
    variationTone = variationPct > 0 ? "up" : variationPct < 0 ? "down" : "muted";
  } else if (empty) {
    variationLabel = "Sin ventas en este periodo";
  }

  const points: ChartPoint[] = [];
  if (grain === "dia") {
    const last = eachDay(start, end);
    const window = last.slice(-7);
    const filled = window.length < 7 ? eachDay(addDays(window[0] ?? end, window.length - 7), end) : window;
    for (const ymd of filled) {
      const amount = sumSales(inCurrent.filter((item) => limaYmd(item.createdAt) === ymd));
      points.push({
        key: ymd,
        label: DIAS[weekdayMon0(ymd)],
        tooltip: formatDayTooltip(ymd),
        amount,
      });
    }
  } else if (grain === "semana") {
    const days = eachDay(start, end);
    const seen = new Set<string>();
    for (const ymd of days) {
      const { year, week } = isoWeek(ymd);
      const key = `${year}-W${String(week).padStart(2, "0")}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const weekStart = addDays(ymd, -weekdayMon0(ymd));
      const weekEnd = addDays(weekStart, 6);
      const amount = sumSales(
        inCurrent.filter((item) => {
          const day = limaYmd(item.createdAt);
          return inRange(day, weekStart, weekEnd) && inRange(day, start, end);
        }),
      );
      points.push({
        key,
        label: `S${week}`,
        tooltip: `Semana ${week} · ${formatDayTooltip(weekStart)}`,
        amount,
      });
    }
  } else {
    let cursor = monthStart(start);
    const lastMonth = monthStart(end);
    while (compareYmd(cursor, lastMonth) <= 0) {
      const mEnd = monthEnd(cursor);
      const amount = sumSales(
        inCurrent.filter((item) => {
          const day = limaYmd(item.createdAt);
          return inRange(day, cursor, mEnd);
        }),
      );
      const monthIndex = Number(cursor.slice(5, 7)) - 1;
      points.push({
        key: cursor.slice(0, 7),
        label: MESES_CORTO[monthIndex],
        tooltip: `${MESES_CORTO[monthIndex]} ${cursor.slice(0, 4)}`,
        amount,
      });
      cursor = shiftMonthYmd(cursor, 1);
    }
  }

  const grainHint = grain === "dia" ? "últimos 7 días" : "en este periodo";

  return {
    points,
    total,
    totalLabel: formatCurrency(total),
    salesCount: inCurrent.length,
    salesLabel: `${inCurrent.length} ${inCurrent.length === 1 ? "venta" : "ventas"}`,
    salesHint: empty ? "Sin ventas en este periodo" : grainHint,
    clientsCount: clients.size,
    clientsLabel: `${clients.size} ${clients.size === 1 ? "cliente" : "clientes"}`,
    clientsHint: empty ? "Sin ventas en este periodo" : "en este periodo",
    variationPct,
    variationLabel,
    variationTone,
    empty,
  };
}
