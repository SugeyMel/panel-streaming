import { formatCurrency } from "@/lib/format";
import type { Order } from "@/lib/types";

const PAID: ReadonlySet<string> = new Set(["pago_aprobado", "preparando", "entregado"]);

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

export type ExpenseRow = {
  amount: number;
  occurredAt: string;
};

export type HomeFinanceTile = {
  label: string;
  value: string;
  context: string;
  contextTone: "muted" | "up" | "down";
};

function limaYearMonth(iso: string): { year: number; month: number } {
  const date = iso.length <= 10 ? new Date(`${iso.slice(0, 10)}T12:00:00.000-05:00`) : new Date(iso);
  if (Number.isNaN(date.getTime())) return { year: 0, month: 1 };
  const shifted = new Date(date.getTime() - 5 * 60 * 60 * 1000);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1 };
}

function shiftMonth(year: number, month: number, delta: number) {
  let monthIndex = month - 1 + delta;
  let nextYear = year;
  while (monthIndex < 0) {
    monthIndex += 12;
    nextYear -= 1;
  }
  while (monthIndex > 11) {
    monthIndex -= 12;
    nextYear += 1;
  }
  return { year: nextYear, month: monthIndex + 1 };
}

function inMonth(iso: string, year: number, month: number) {
  const key = limaYearMonth(iso);
  return key.year === year && key.month === month;
}

function emptyMoney(): Pick<HomeFinanceTile, "value" | "context" | "contextTone"> {
  return { value: formatCurrency(0), context: "Sin movimientos este mes", contextTone: "muted" };
}

export function computeHomeFinanceTiles(orders: Order[], expenses: ExpenseRow[]): HomeFinanceTile[] {
  const now = limaYearMonth(new Date().toISOString());
  const prev = shiftMonth(now.year, now.month, -1);
  const paid = orders.filter((item) => PAID.has(item.status));
  const paidThis = paid.filter((item) => inMonth(item.createdAt, now.year, now.month));
  const paidPrev = paid.filter((item) => inMonth(item.createdAt, prev.year, prev.month));
  const salesThis = paidThis.reduce((sum, item) => sum + item.amount, 0);
  const salesPrev = paidPrev.reduce((sum, item) => sum + item.amount, 0);
  const costsThis = paidThis.reduce((sum, item) => sum + item.internalCost, 0);
  const expensesThis = expenses
    .filter((item) => inMonth(item.occurredAt, now.year, now.month))
    .reduce((sum, item) => sum + item.amount, 0);
  const gastosThis = costsThis + expensesThis;
  const profitThis = salesThis - gastosThis;

  const ventas: HomeFinanceTile =
    salesThis === 0
      ? { label: "Ventas del mes", ...emptyMoney() }
      : {
          label: "Ventas del mes",
          value: formatCurrency(salesThis),
          context: `${paidThis.length} ${paidThis.length === 1 ? "pedido" : "pedidos"}`,
          contextTone: "muted",
        };

  let variacion: HomeFinanceTile;
  if (salesPrev === 0) {
    variacion = {
      label: "Variación",
      value: salesThis === 0 ? "0%" : "—",
      context: salesThis === 0 ? "Sin movimientos este mes" : "Sin mes anterior para comparar",
      contextTone: "muted",
    };
  } else {
    const pct = ((salesThis - salesPrev) / salesPrev) * 100;
    const rounded = Math.round(pct);
    variacion = {
      label: "Variación",
      value: `${rounded > 0 ? "+" : ""}${rounded}%`,
      context: `vs. ${MESES[prev.month - 1]}`,
      contextTone: rounded > 0 ? "up" : rounded < 0 ? "down" : "muted",
    };
  }

  const gastos: HomeFinanceTile =
    gastosThis === 0
      ? { label: "Gastos", ...emptyMoney() }
      : {
          label: "Gastos",
          value: formatCurrency(gastosThis),
          context: "Costos y egresos del mes",
          contextTone: "muted",
        };

  const ganancia: HomeFinanceTile =
    salesThis === 0 && gastosThis === 0
      ? { label: "Ganancia estimada", ...emptyMoney() }
      : {
          label: "Ganancia estimada",
          value: formatCurrency(profitThis),
          context: "Ingresos − gastos",
          contextTone: "muted",
        };

  return [ventas, variacion, gastos, ganancia];
}
