import { customerStatusLabel } from "@/lib/format";
import { whatsappParaGuardar, whatsappParaMostrar } from "@/lib/clientes";
import type { CustomerRow } from "@/lib/selectors";
import type { CustomerStatus } from "@/lib/types";

export const CLIENTES_EXCEL_HEADERS = [
  "Nombre",
  "WhatsApp",
  "Correo",
  "Estado",
  "Servicios activos",
  "Servicios vencidos",
  "Próximo vencimiento",
  "Total compras",
  "Última compra",
  "Registro",
] as const;

export const CLIENTES_EXCEL_EJEMPLO = ["María Quispe", "987654321", "maria@correo.com", "Activo"];

export type ClienteExcelInput = {
  excelRow: number;
  name: string;
  whatsapp: string;
  email: string;
  status: CustomerStatus;
};

export type ClienteExcelIssue = {
  excelRow: number;
  message: string;
};

type MappedCol = "name" | "whatsapp" | "email" | "status";

function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function cellText(value: unknown) {
  if (value == null) return "";
  if (typeof value === "number" && Number.isFinite(value)) {
    return Number.isInteger(value) ? String(value) : String(value);
  }
  return String(value).trim();
}

function mapHeader(header: string): MappedCol | null {
  const key = fold(header);
  if (!key) return null;
  if (["nombre", "name", "cliente", "nombres"].includes(key)) return "name";
  if (
    [
      "whatsapp",
      "celular",
      "telefono",
      "nro celular",
      "numero celular",
      "nro whatsapp",
      "phone",
    ].includes(key)
  ) {
    return "whatsapp";
  }
  if (["correo", "email", "e mail", "correo electronico"].includes(key)) return "email";
  if (["estado", "status"].includes(key)) return "status";
  return null;
}

export function parseCustomerStatusCell(raw: string): CustomerStatus | "" {
  const key = fold(raw);
  if (!key) return "";
  if (["inactivo", "inactive", "inactiva"].includes(key)) return "inactivo";
  if (["suspendido", "suspended", "suspendida"].includes(key)) return "suspendido";
  if (["activo", "active", "activa"].includes(key)) return "activo";
  return "";
}

function findHeaderRow(table: unknown[][]) {
  for (let index = 0; index < Math.min(table.length, 8); index += 1) {
    const cols = new Map<MappedCol, number>();
    (table[index] ?? []).forEach((cell, col) => {
      const mapped = mapHeader(cellText(cell));
      if (mapped && !cols.has(mapped)) cols.set(mapped, col);
    });
    if (cols.has("name") && cols.has("whatsapp")) {
      return { index, cols };
    }
  }
  return null;
}

export function parseClientesTable(table: unknown[][]): {
  rows: ClienteExcelInput[];
  errors: ClienteExcelIssue[];
} {
  const header = findHeaderRow(table);
  if (!header) {
    return {
      rows: [],
      errors: [
        {
          excelRow: 1,
          message: "No se encontraron las columnas Nombre y WhatsApp. Descarga la plantilla y úsala como guía.",
        },
      ],
    };
  }

  const rows: ClienteExcelInput[] = [];
  const errors: ClienteExcelIssue[] = [];
  const seen = new Map<string, number>();

  for (let index = header.index + 1; index < table.length; index += 1) {
    const line = table[index] ?? [];
    const excelRow = index + 1;
    const nameCol = header.cols.get("name") ?? 0;
    const waCol = header.cols.get("whatsapp") ?? 1;
    const emailCol = header.cols.get("email");
    const statusCol = header.cols.get("status");
    const name = cellText(line[nameCol]);
    const whatsappRaw = cellText(line[waCol]);
    const email = emailCol != null ? cellText(line[emailCol]).toLowerCase() : "";
    const statusRaw = statusCol != null ? cellText(line[statusCol]) : "";
    if (!name && !whatsappRaw && !email && !statusRaw) continue;

    const status = parseCustomerStatusCell(statusRaw);
    if (statusRaw && !status) {
      errors.push({ excelRow, message: `Estado no válido (${statusRaw}). Usa Activo, Inactivo o Suspendido.` });
      continue;
    }
    if (!name) {
      errors.push({ excelRow, message: "Falta el nombre." });
      continue;
    }
    const whatsapp = whatsappParaGuardar(whatsappRaw);
    if (!whatsapp) {
      errors.push({ excelRow, message: "El WhatsApp debe tener 9 dígitos." });
      continue;
    }
    const prev = seen.get(whatsapp);
    if (prev) {
      errors.push({ excelRow, message: `WhatsApp duplicado en el archivo (también en la fila ${prev}).` });
      continue;
    }
    seen.set(whatsapp, excelRow);
    rows.push({
      excelRow,
      name,
      whatsapp,
      email,
      status: status || "activo",
    });
  }

  return { rows, errors };
}

export function customersToExcelTable(rows: CustomerRow[], example = false) {
  const header = [...CLIENTES_EXCEL_HEADERS];
  if (example) {
    return [header, [...CLIENTES_EXCEL_EJEMPLO, "", "", "", "", "", ""]];
  }
  return [
    header,
    ...rows.map((row) => [
      row.name,
      whatsappParaMostrar(row.whatsapp),
      row.email || "",
      customerStatusLabel[row.status],
      row.activeServices,
      row.expiredServices,
      row.nextExpiry ? row.nextExpiry.slice(0, 10) : "",
      row.totalPurchases,
      row.lastPurchase ? row.lastPurchase.slice(0, 10) : "",
      row.registeredAt ? row.registeredAt.slice(0, 10) : "",
    ]),
  ];
}
