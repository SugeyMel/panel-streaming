"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DownloadIcon, UploadIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

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

export function ClientesExcelActions() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<"export" | "import" | "template" | null>(null);
  const [importResult, setImportResult] = useState<{
    created: number;
    updated: number;
    failed: number;
    errors: Array<{ excelRow: number; message: string }>;
  } | null>(null);

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
    <>
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
          setMessage(null);
          setImportOpen(true);
        }}
      >
        <UploadIcon className="h-4 w-4" />
        Importar Excel
      </Button>
      <Modal open={importOpen} title="Importar clientes" onClose={() => setImportOpen(false)}>
        <form className="space-y-4" action={onImport}>
          <p className="text-sm text-[#94A3B8]">
            Columnas: <span className="text-white">Nombre</span>, <span className="text-white">WhatsApp</span> (9
            dígitos), Correo y Estado (Activo, Inactivo o Suspendido). El WhatsApp es la clave: si ya está en tu lista,
            se actualiza; si no, se crea.
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
          {message ? <p className="text-sm text-rose-300">{message}</p> : null}
          {importResult ? (
            <div className="rounded-xl border border-[#253047] bg-[#0B111C] p-3 text-sm">
              <p className="text-[#F8FAFC]">
                Creados: {importResult.created} · Actualizados: {importResult.updated} · Con error:{" "}
                {importResult.failed}
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
    </>
  );
}
