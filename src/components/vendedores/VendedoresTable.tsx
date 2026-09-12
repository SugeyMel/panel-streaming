"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { upsertStreamingAccountAction } from "@/app/actions/business";
import { CalendarIcon } from "@/components/icons";
import { AccountRowActions } from "@/components/accounts/AccountRowActions";
import { AccountsFilterBar } from "@/components/accounts/AccountsFilterBar";
import { AccountsPageHeader } from "@/components/accounts/AccountsPageHeader";
import { AccountsPagination } from "@/components/accounts/AccountsPagination";
import { CopyField } from "@/components/accounts/CopyField";
import { ServiceMark } from "@/components/accounts/ServiceMark";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { WhatsAppInput } from "@/components/ui/WhatsAppInput";
import { HealthStatusBadge } from "@/components/ui/StatusBadge";
import { whatsappParaMostrar } from "@/lib/clientes";
import {
  colorDias,
  cumpleEstado,
  cumpleVence,
  diasDesdeVencimiento,
  estadoDesdeDias,
  FILAS_POR_PAGINA_DEFAULT,
  formatCosto,
  formatDdMmYyyy,
  isoFromToday,
  parseFilasPorPagina,
  type EstadoFiltro,
  type FilasPorPagina,
  type VenceFiltro,
} from "@/lib/cuenta-salud";
import { filtrarPorVencimiento, type FiltroVencimiento } from "@/lib/vencimiento";
import { platformDisplayName } from "@/lib/platform-logos";
import type { PlantillasWhatsapp } from "@/lib/whatsapp";
import type { Platform, StreamingAccount } from "@/lib/types";

export type CuentaVendedor = {
  id: string;
  servicio: string;
  correo: string;
  clave: string;
  proveedor: string;
  vencimiento: string;
  vendedorNombre: string | null;
  vendedorTelefono: string | null;
  costo?: number;
};

function toCuentaVendedor(account: StreamingAccount, platforms: Platform[]): CuentaVendedor {
  const platform = platforms.find((item) => item.id === account.platformId);
  return {
    id: account.id,
    servicio: platformDisplayName(platform ?? account.platformId),
    correo: account.email,
    clave: account.password,
    proveedor: account.supplierName || "—",
    vencimiento: account.expiresAt || isoFromToday(30),
    vendedorNombre: account.resellerName || null,
    vendedorTelefono: account.resellerWhatsapp || null,
    ...(account.supplierCost ? { costo: account.supplierCost } : {}),
  };
}

export function VendedoresTable({
  plantillas = {},
  platforms = [],
  accounts = [],
}: {
  plantillas?: PlantillasWhatsapp;
  platforms?: Platform[];
  accounts?: StreamingAccount[];
}) {
  const router = useRouter();
  const cuentas = useMemo(
    () => accounts.filter((item) => item.saleKind === "full").map((item) => toCuentaVendedor(item, platforms)),
    [accounts, platforms],
  );
  const headerGrid =
    "grid grid-cols-[2.25rem_minmax(9.5rem,1.1fr)_minmax(8.5rem,1fr)_minmax(11rem,1.3fr)_minmax(7rem,0.9fr)_minmax(6.5rem,0.85fr)_minmax(7.5rem,1fr)_3.25rem_minmax(6.5rem,0.85fr)_minmax(4.75rem,0.7fr)_minmax(10.5rem,1fr)] items-center gap-x-3";
  const inputClass =
    "h-10 w-full rounded-lg border border-[#253047] bg-[#111827] px-3 text-sm text-[#E2E8F0] outline-none placeholder:text-[#94A3B8]";
  const [query, setQuery] = useState("");
  const [servicio, setServicio] = useState("all");
  const [estado, setEstado] = useState<EstadoFiltro>("all");
  const [vence, setVence] = useState<VenceFiltro>("all");
  const [proveedor, setProveedor] = useState("all");
  const [venceProveedor, setVenceProveedor] = useState<FiltroVencimiento>("all");
  const [fechaProveedor, setFechaProveedor] = useState("");
  const [page, setPage] = useState(1);
  const [filasPorPagina, setFilasPorPagina] = useState<FilasPorPagina>(FILAS_POR_PAGINA_DEFAULT);
  const [copied, setCopied] = useState<string | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [panel, setPanel] = useState<null | "filtros" | "cuenta">(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const servicios = useMemo(
    () => [...new Set(cuentas.map((item) => item.servicio))].sort((a, b) => a.localeCompare(b, "es")),
    [cuentas],
  );
  const proveedores = useMemo(
    () => [...new Set(cuentas.map((item) => item.proveedor))].sort((a, b) => a.localeCompare(b, "es")),
    [cuentas],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qDigits = whatsappParaMostrar(query);
    return cuentas.filter((cuenta) => {
      if (servicio !== "all" && cuenta.servicio !== servicio) return false;
      if (proveedor !== "all" && cuenta.proveedor !== proveedor) return false;
      if (!filtrarPorVencimiento(cuenta.vencimiento, venceProveedor, fechaProveedor || null)) return false;
      const dias = diasDesdeVencimiento(cuenta.vencimiento);
      if (!cumpleVence(dias, vence) || !cumpleEstado(dias, estado)) return false;
      if (q) {
        const hay = [cuenta.servicio, cuenta.correo, cuenta.clave, cuenta.proveedor, cuenta.vendedorNombre ?? "", cuenta.vendedorTelefono ?? ""]
          .join(" ")
          .toLowerCase();
        const enTexto = hay.includes(q);
        const enTelefono =
          qDigits.length > 0 && Boolean(cuenta.vendedorTelefono) && whatsappParaMostrar(cuenta.vendedorTelefono ?? "").includes(qDigits);
        if (!enTexto && !enTelefono) return false;
      }
      return true;
    });
  }, [cuentas, estado, fechaProveedor, proveedor, query, servicio, vence, venceProveedor]);

  const pageSize = Number(filasPorPagina);
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const startIndex = (safePage - 1) * pageSize;
  const paged = visible.slice(startIndex, startIndex + pageSize);
  const rangeStart = visible.length === 0 ? 0 : startIndex + 1;
  const rangeEnd = Math.min(visible.length, startIndex + paged.length);

  function goPage1() {
    setPage(1);
  }

  function copyValue(key: string, value: string) {
    void navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied((current) => (current === key ? null : current)), 1200);
  }

  function limpiarFiltros() {
    setQuery("");
    setServicio("all");
    setEstado("all");
    setVence("all");
    setProveedor("all");
    setVenceProveedor("all");
    setFechaProveedor("");
    goPage1();
  }

  async function addCuenta(formData: FormData) {
    formData.set("saleKind", "full");
    formData.set("maxProfiles", "1");
    formData.set("label", "Cuenta completa");
    formData.set("status", String(formData.get("resellerWhatsapp") ?? "").trim() ? "full" : "available");
    formData.set("supplierName", String(formData.get("proveedor") ?? ""));
    formData.set("supplierCost", String(formData.get("costo") ?? "0"));
    formData.set("email", String(formData.get("correo") ?? ""));
    formData.set("password", String(formData.get("clave") ?? ""));
    formData.set("expiresAt", String(formData.get("vencimiento") ?? ""));
    formData.set("resellerName", String(formData.get("vendedorNombre") ?? ""));
    formData.set("resellerWhatsapp", String(formData.get("vendedorTelefono") ?? ""));
    const result = await upsertStreamingAccountAction(formData);
    if (!result.ok) {
      setAviso(result.error ?? "No se pudo guardar");
      window.setTimeout(() => setAviso(null), 2800);
      return;
    }
    setPanel(null);
    setAviso("Cuenta agregada.");
    router.refresh();
    window.setTimeout(() => setAviso((current) => (current === "Cuenta agregada." ? null : current)), 2800);
  }

  const filterProps = {
    query,
    onQuery: (value: string) => {
      setQuery(value);
      goPage1();
    },
    searchPlaceholder: "Buscar vendedor, correo o servicio...",
    servicio,
    onServicio: (value: string) => {
      setServicio(value);
      goPage1();
    },
    servicios,
    estado,
    onEstado: (value: EstadoFiltro) => {
      setEstado(value);
      goPage1();
    },
    vence,
    onVence: (value: VenceFiltro) => {
      setVence(value);
      goPage1();
    },
    proveedor,
    onProveedor: (value: string) => {
      setProveedor(value);
      goPage1();
    },
    proveedores,
    venceProveedor,
    onVenceProveedor: (value: FiltroVencimiento) => {
      setVenceProveedor(value);
      if (value !== "exacta") setFechaProveedor("");
      goPage1();
    },
    fechaProveedor,
    onFechaProveedor: (value: string) => {
      setFechaProveedor(value);
      goPage1();
    },
  };

  return (
    <div className="min-w-0 min-h-[calc(100vh-7rem)] overflow-x-hidden bg-[#F4F7FB]">
      <div className="flex flex-col gap-3">
        <AccountsPageHeader
          title="Vendedores"
          subtitle="Gestiona las cuentas vendidas a tus vendedores"
          onFiltros={() => setPanel("filtros")}
          onAgregar={() => setPanel("cuenta")}
          tone="light"
        />
        <AccountsFilterBar {...filterProps} tone="light" />
      </div>
      <p className="mt-2 text-right text-xs text-[#64748B]">Total: {visible.length} cuentas</p>
      {aviso ? <p className="mt-2 text-sm font-medium text-[#16A34A]">{aviso}</p> : null}

      <div className="mt-4 overflow-x-auto md:overflow-x-auto">
        <div className="min-w-[1100px] space-y-3">
          <div className={`${headerGrid} text-[10px] font-medium tracking-[0.14em] text-[#94A3B8] uppercase`}>
            <span className="px-3">#</span>
            <span className="px-2">Servicio</span>
            <span className="px-2">Vendedor</span>
            <span className="px-2">Correo de la cuenta</span>
            <span className="px-2">Clave</span>
            <span className="px-2">Proveedor</span>
            <span className="px-2">Vencimiento</span>
            <span className="px-2">Días</span>
            <span className="px-2">Estado</span>
            <span className="px-2 pr-4 text-right tracking-normal">Costo</span>
            <span className="border-l border-[#E8EEF6] px-2 pl-3 text-right tracking-normal">Acciones</span>
          </div>
          {paged.length === 0 ? (
            <p className="rounded-xl border border-[#E8EEF6] bg-white px-4 py-10 text-center text-sm text-[#64748B]">
              No hay cuentas para mostrar.
            </p>
          ) : (
            paged.map((cuenta, index) => {
              const dias = diasDesdeVencimiento(cuenta.vencimiento);
              const health = estadoDesdeDias(dias);
              return (
                <article key={cuenta.id} className="overflow-hidden rounded-xl border-2 border-black bg-white">
                  <div className={`${headerGrid} px-0 hover:bg-[#F8FAFC]`}>
                    <span className="px-3 py-3 text-sm text-[#94A3B8]">{rangeStart + index}</span>
                    <div className="flex min-w-0 items-center gap-2 px-2 py-3">
                      <ServiceMark name={cuenta.servicio} />
                      <p className="truncate text-sm font-semibold text-[#0F172A]">{cuenta.servicio}</p>
                    </div>
                    <div className="min-w-0 px-2 py-3">
                      {cuenta.vendedorTelefono ? (
                        <>
                          <p className="truncate text-sm font-medium text-[#0F172A]">{cuenta.vendedorNombre ?? "—"}</p>
                          <p className="text-xs text-[#64748B]">{whatsappParaMostrar(cuenta.vendedorTelefono)}</p>
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#EAB308]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#EAB308]" aria-hidden />
                          Sin asignar
                        </span>
                      )}
                    </div>
                    <div className="px-2 py-3">
                      <CopyField id={`${cuenta.id}-mail`} value={cuenta.correo} copied={copied} onCopy={copyValue} tone="light" />
                    </div>
                    <div className="px-2 py-3">
                      <CopyField id={`${cuenta.id}-clave`} value={cuenta.clave} copied={copied} onCopy={copyValue} tone="light" />
                    </div>
                    <p className="truncate px-2 py-3 text-sm text-[#0F172A]">{cuenta.proveedor}</p>
                    <div className="flex items-center gap-1 px-2 py-3 text-sm text-[#0F172A]">
                      <span>{formatDdMmYyyy(cuenta.vencimiento)}</span>
                      <button type="button" className="text-[#94A3B8]" aria-label="Vencimiento">
                        <CalendarIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className={`px-2 py-3 text-sm font-semibold ${colorDias(health)}`}>{dias}</span>
                    <div className="px-2 py-3">
                      <HealthStatusBadge status={health} look="soft" />
                    </div>
                    <p className="px-2 pr-4 py-3 text-right text-sm">
                      {cuenta.costo === undefined ? (
                        <span className="text-[#94A3B8]">—</span>
                      ) : (
                        <span className="text-[#0F172A]">{formatCosto(cuenta.costo)}</span>
                      )}
                    </p>
                    <div className="relative flex items-center justify-end gap-0.5 border-l border-[#E8EEF6] px-2 py-2">
                      <AccountRowActions
                        tone="light"
                        plantillas={plantillas}
                        whatsapp={
                          cuenta.vendedorTelefono
                            ? {
                                telefono: cuenta.vendedorTelefono,
                                nombre: cuenta.vendedorNombre?.trim() || "vendedor",
                                servicio: cuenta.servicio,
                                fecha: formatDdMmYyyy(cuenta.vencimiento),
                                dias,
                              }
                            : null
                        }
                        onView={() => setDetail(cuenta.id)}
                        onEdit={() => setDetail(cuenta.id)}
                        onMore={() => setMenu(menu === cuenta.id ? null : cuenta.id)}
                      />
                      {menu === cuenta.id ? (
                        <div className="absolute top-10 right-2 z-20 w-40 rounded-lg border border-[#E8EEF6] bg-white py-1 text-xs text-[#0F172A] shadow-sm">
                          <button
                            type="button"
                            className="block w-full px-3 py-2 text-left hover:bg-[#F8FAFC]"
                            onClick={() => {
                              setDetail(cuenta.id);
                              setMenu(null);
                            }}
                          >
                            Ver detalle
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>

      <AccountsPagination
        total={visible.length}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        page={safePage}
        pageCount={pageCount}
        onPage={setPage}
        filasPorPagina={filasPorPagina}
        onFilasPorPagina={(value) => {
          setFilasPorPagina(parseFilasPorPagina(String(value)));
          goPage1();
        }}
        tone="light"
      />

      <Modal open={Boolean(detail)} title="Detalle" onClose={() => setDetail(null)}>
        <p className="text-sm text-[#94A3B8]">Misma cuenta de Inventario, asignada como cuenta completa.</p>
      </Modal>

      <Modal open={panel === "filtros"} title="Filtros avanzados" onClose={() => setPanel(null)}>
        <div className="space-y-3">
          <AccountsFilterBar {...filterProps} stacked tone="light" />
          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <Button type="button" variant="toolbar" className="w-full" onClick={limpiarFiltros}>
              Limpiar filtros
            </Button>
            <Button type="button" variant="gradient" className="w-full" onClick={() => setPanel(null)}>
              Aplicar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={panel === "cuenta"} title="Agregar cuenta" onClose={() => setPanel(null)}>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            addCuenta(new FormData(event.currentTarget));
          }}
        >
          <select name="platformId" className={inputClass} required>
            {platforms.filter((item) => item.available).map((item) => (
              <option key={item.id} value={item.id}>
                {platformDisplayName(item)}
              </option>
            ))}
          </select>
          <input name="correo" type="email" placeholder="Correo de la cuenta" className={inputClass} required />
          <input name="clave" placeholder="Clave" className={inputClass} required />
          <input name="proveedor" list="proveedores-vendedor" placeholder="Proveedor" className={inputClass} />
          <datalist id="proveedores-vendedor">
            {proveedores.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          <input name="vendedorNombre" placeholder="Nombre del vendedor" className={inputClass} />
          <WhatsAppInput name="vendedorTelefono" />
          <input name="costo" type="number" min="0" step="0.01" placeholder="Costo (opcional)" className={inputClass} />
          <label className="block space-y-1">
            <span className="text-sm text-[#94A3B8]">Vencimiento</span>
            <input name="vencimiento" type="date" defaultValue={isoFromToday(30)} className={inputClass} />
          </label>
          <Button type="submit" variant="gradient" className="w-full">
            Guardar cuenta
          </Button>
        </form>
      </Modal>
    </div>
  );
}
