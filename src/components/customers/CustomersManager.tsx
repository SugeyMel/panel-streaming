"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upsertCustomerAction } from "@/app/actions/business";
import { DownloadIcon, UploadIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CustomerTable } from "@/components/customers/CustomerTable";
import { Filters } from "@/components/ui/Filters";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchBar } from "@/components/ui/SearchBar";
import { WhatsAppInput } from "@/components/ui/WhatsAppInput";
import { whatsappParaMostrar } from "@/lib/clientes";
import type { CustomerRow } from "@/lib/selectors";
import type { Customer } from "@/lib/types";

const filters = [
  { value: "todos", label: "Todos" },
  { value: "activos", label: "Activos" },
  { value: "por_vencer", label: "Próximos a vencer" },
  { value: "vencidos", label: "Vencidos" },
  { value: "sin_servicios", label: "Sin servicios" },
] as const;

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function filenameFrom(res: Response, fallback: string) {
  const header = res.headers.get("Content-Disposition") ?? "";
  const match = /filename="?([^"]+)"?/i.exec(header);
  return match?.[1] || fallback;
}

export function CustomersManager({
  rows,
  detailBase,
}: {
  rows: CustomerRow[];
  detailBase: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<(typeof filters)[number]["value"]>("todos");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<"export" | "import" | "template" | null>(null);
  const [importResult, setImportResult] = useState<{
    created: number;
    updated: number;
    failed: number;
    errors: Array<{ excelRow: number; message: string }>;
  } | null>(null);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const matchQuery = `${row.name} ${whatsappParaMostrar(row.whatsapp)} ${row.whatsapp} ${row.email}`
        .toLowerCase()
        .includes(query.toLowerCase());
      if (!matchQuery) return false;
      if (filter === "activos") return row.activeServices > 0;
      if (filter === "por_vencer") return Boolean(row.nextExpiry) && row.activeServices > 0;
      if (filter === "vencidos") return row.expiredServices > 0 && row.activeServices === 0;
      if (filter === "sin_servicios") return row.activeServices === 0 && row.expiredServices === 0;
      return true;
    });
  }, [filter, rows, query]);

  async function onExport() {
    setBusy("export");
    setMessage(null);
    try {
      const res = await fetch("/api/panel/clientes/excel");
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setMessage(data?.error ?? "No se pudo exportar.");
        return;
      }
      downloadBlob(await res.blob(), filenameFrom(res, "clientes.xlsx"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo exportar.");
    } finally {
      setBusy(null);
    }
  }

  async function onTemplate() {
    setBusy("template");
    try {
      const res = await fetch("/api/panel/clientes/excel?plantilla=1");
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setMessage(data?.error ?? "No se pudo descargar la plantilla.");
        return;
      }
      downloadBlob(await res.blob(), filenameFrom(res, "plantilla-clientes.xlsx"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo descargar la plantilla.");
    } finally {
      setBusy(null);
    }
  }

  async function onImport(formData: FormData) {
    setBusy("import");
    setImportResult(null);
    setMessage(null);
    try {
      const res = await fetch("/api/panel/clientes/excel", { method: "POST", body: formData });
      const result = (await res.json()) as {
        ok?: boolean;
        error?: string;
        created?: number;
        updated?: number;
        failed?: number;
        errors?: Array<{ excelRow: number; message: string }>;
      };
      if (!res.ok || !result.ok) {
        setMessage(result.error ?? "No se pudo importar.");
        return;
      }
      setImportResult({
        created: result.created ?? 0,
        updated: result.updated ?? 0,
        failed: result.failed ?? 0,
        errors: result.errors ?? [],
      });
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo importar.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Clientes"
        description="Importa o exporta un Excel con Nombre, WhatsApp, correo y estado. Si el WhatsApp ya existe, se actualiza; si no, se crea en tu lista."
        action={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="toolbar" disabled={busy !== null} onClick={onExport}>
              <DownloadIcon className="h-4 w-4" />
              {busy === "export" ? "Exportando…" : "Exportar Excel"}
            </Button>
            <Button
              type="button"
              variant="toolbar"
              disabled={busy !== null}
              onClick={() => {
                setImportResult(null);
                setImportOpen(true);
              }}
            >
              <UploadIcon className="h-4 w-4" />
              Importar Excel
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              + Crear cliente
            </Button>
          </div>
        }
      />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Filters value={filter} onChange={setFilter} options={[...filters]} />
        <SearchBar value={query} onChange={setQuery} placeholder="Buscar cliente" />
      </div>
      {message ? <p className="text-sm text-cyan-300">{message}</p> : null}
      <Card>
        <CustomerTable
          rows={filtered}
          hrefFor={(row) => `${detailBase}/${row.id}`}
          onEdit={(row) => {
            setEditing(row);
            setOpen(true);
          }}
        />
      </Card>
      <Modal open={open} title={editing ? "Editar cliente" : "Crear cliente"} onClose={() => setOpen(false)}>
        <form
          className="space-y-3"
          action={async (formData) => {
            if (editing) formData.set("id", editing.id);
            const result = await upsertCustomerAction(formData);
            setMessage(result.ok ? "Guardado." : result.error ?? "No se pudo guardar");
            if (result.ok) {
              setOpen(false);
              router.refresh();
            }
          }}
        >
          <input name="name" defaultValue={editing?.name} placeholder="Nombre" className="ui-field" />
          <WhatsAppInput name="whatsapp" defaultValue={editing?.whatsapp} required />
          <input name="email" type="email" defaultValue={editing?.email} placeholder="Correo (opcional)" className="ui-field" />
          {editing ? null : (
            <input name="password" type="password" placeholder="Clave del cliente (opcional, mín. 6)" className="ui-field" />
          )}
          <select name="status" defaultValue={editing?.status ?? "activo"} className="ui-field">
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
            <option value="suspendido">Suspendido</option>
          </select>
          <Button type="submit" className="w-full">
            Guardar
          </Button>
        </form>
      </Modal>
      <Modal open={importOpen} title="Importar clientes" onClose={() => setImportOpen(false)}>
        <form className="space-y-4" action={onImport}>
          <p className="text-sm text-[#94A3B8]">
            Columnas: <span className="text-white">Nombre</span>, <span className="text-white">WhatsApp</span> (9 dígitos),
            Correo y Estado (Activo, Inactivo o Suspendido). El WhatsApp es la clave: si ya está en tu lista, se
            actualiza; si no, se crea.
          </p>
          <button
            type="button"
            className="text-sm text-cyan-300 hover:text-cyan-200"
            disabled={busy !== null}
            onClick={onTemplate}
          >
            {busy === "template" ? "Preparando plantilla…" : "Descargar plantilla Excel"}
          </button>
          <input
            ref={fileRef}
            name="file"
            type="file"
            accept=".xlsx,.xls,.csv"
            required
            className="ui-field file:mr-3 file:rounded-lg file:border-0 file:bg-[#172033] file:px-3 file:py-1.5 file:text-sm file:text-white"
          />
          {importResult ? (
            <div className="rounded-xl border border-[#253047] bg-[#0B111C] p-3 text-sm">
              <p className="text-[#F8FAFC]">
                Creados: {importResult.created} · Actualizados: {importResult.updated} · Con error: {importResult.failed}
              </p>
              {importResult.errors.length > 0 ? (
                <ul className="mt-2 space-y-1 text-[#FCA5A5]">
                  {importResult.errors.map((item) => (
                    <li key={`${item.excelRow}-${item.message}`}>
                      Fila {item.excelRow}: {item.message}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          <Button type="submit" className="w-full" disabled={busy !== null}>
            {busy === "import" ? "Importando…" : "Importar al sistema"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
