import { NextResponse } from "next/server";
import { getAppSession, requireRole } from "@/lib/auth/get-session";
import { customersToExcelTable, parseClientesTable } from "@/lib/clientes-excel";
import { uiCustomerStatusToDb } from "@/lib/db/map";
import { loadCustomerRows } from "@/lib/data/queries";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_EXCEL_BYTES = 2 * 1024 * 1024;
const MAX_EXCEL_ROWS = 1000;
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function jsonError(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

async function sellerGuard() {
  const session = await getAppSession();
  requireRole(session, ["seller"]);
  if (!session.sellerId) throw new Error("Vendedor no encontrado.");
  return session;
}

async function excelFile(table: (string | number)[][], filename: string) {
  const xlsx = await import("xlsx");
  const sheet = xlsx.utils.aoa_to_sheet(table);
  sheet["!cols"] = [
    { wch: 24 },
    { wch: 14 },
    { wch: 28 },
    { wch: 12 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
  ];
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, sheet, "Clientes");
  const bytes = xlsx.write(workbook, { type: "array", bookType: "xlsx" }) as Uint8Array;
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": XLSX_MIME,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function GET(request: Request) {
  try {
    const session = await sellerGuard();
    const plantilla = new URL(request.url).searchParams.get("plantilla") === "1";
    if (plantilla) {
      return excelFile(customersToExcelTable([], true), "plantilla-clientes.xlsx");
    }
    const rows = await loadCustomerRows(session.sellerId);
    return excelFile(customersToExcelTable(rows), `clientes-${new Date().toISOString().slice(0, 10)}.xlsx`);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "No se pudo exportar.", 401);
  }
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return jsonError("Supabase no está configurado. La acción quedó en modo demo.");
  }
  let session: Awaited<ReturnType<typeof sellerGuard>>;
  try {
    session = await sellerGuard();
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "No autorizado", 401);
  }

  const supabase = await createClient();
  if (!supabase || !session.sellerId) return jsonError("Vendedor no encontrado.");

  const formData = await request.formData();
  const raw = formData.get("file");
  const file = raw instanceof File && raw.size > 0 ? raw : null;
  if (!file) return jsonError("Elige un archivo Excel (.xlsx) o CSV.");
  if (file.size > MAX_EXCEL_BYTES) return jsonError("El archivo no debe pesar más de 2 MB.");
  const name = file.name.toLowerCase();
  if (!name.endsWith(".xlsx") && !name.endsWith(".xls") && !name.endsWith(".csv")) {
    return jsonError("Usa un archivo .xlsx, .xls o .csv.");
  }

  let table: unknown[][];
  try {
    const xlsx = await import("xlsx");
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook =
      name.endsWith(".csv") || name.endsWith(".txt")
        ? xlsx.read(buffer.toString("utf8"), { type: "string" })
        : xlsx.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    table = sheet
      ? (xlsx.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" }) as unknown[][])
      : [];
  } catch {
    return jsonError("No se pudo leer el Excel. Revisa que no esté dañado.");
  }

  const parsed = parseClientesTable(table);
  if (parsed.rows.length > MAX_EXCEL_ROWS) {
    return jsonError(`El archivo tiene más de ${MAX_EXCEL_ROWS} clientes. Divídelo en partes.`);
  }
  if (parsed.rows.length === 0 && parsed.errors.length === 0) {
    return jsonError("El archivo no tiene clientes para importar.");
  }

  const { data: existingRows, error: existingError } = await supabase
    .from("customers")
    .select("id, whatsapp")
    .eq("seller_id", session.sellerId);
  if (existingError) return jsonError(existingError.message);

  const byWhatsapp = new Map((existingRows ?? []).map((row) => [String(row.whatsapp), String(row.id)]));
  let created = 0;
  let updated = 0;
  const errors = [...parsed.errors];

  for (const row of parsed.rows) {
    const payload = {
      seller_id: session.sellerId,
      name: row.name,
      whatsapp: row.whatsapp,
      email: row.email || null,
      status: uiCustomerStatusToDb(row.status),
    };
    const existingId = byWhatsapp.get(row.whatsapp);
    if (existingId) {
      const { error } = await supabase
        .from("customers")
        .update({ name: payload.name, email: payload.email, status: payload.status })
        .eq("id", existingId)
        .eq("seller_id", session.sellerId);
      if (error) {
        errors.push({ excelRow: row.excelRow, message: error.message });
        continue;
      }
      updated += 1;
      continue;
    }
    const { data, error } = await supabase.from("customers").insert(payload).select("id").maybeSingle();
    if (error) {
      errors.push({ excelRow: row.excelRow, message: error.message });
      continue;
    }
    if (data?.id) byWhatsapp.set(row.whatsapp, String(data.id));
    created += 1;
  }

  return NextResponse.json({
    ok: true,
    created,
    updated,
    failed: errors.length,
    errors: errors.slice(0, 20),
  });
}
