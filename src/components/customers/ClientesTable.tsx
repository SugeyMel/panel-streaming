"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EyeIcon,
  MoreIcon,
  PencilIcon,
  PlusIcon,
} from "@/components/icons";
import { AccountRowActions, IconBtn, WhatsAppMenu } from "@/components/accounts/AccountRowActions";
import { AccountsFilterBar } from "@/components/accounts/AccountsFilterBar";
import { AccountsPageHeader } from "@/components/accounts/AccountsPageHeader";
import { AccountsPagination } from "@/components/accounts/AccountsPagination";
import { CopyField } from "@/components/accounts/CopyField";
import { ServiceMark } from "@/components/accounts/ServiceMark";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { HealthStatusBadge } from "@/components/ui/StatusBadge";
import { agruparClientesPorServicios, whatsappParaMostrar } from "@/lib/clientes";
import {
  colorDias,
  cumpleEstado,
  cumpleVence,
  diasDesdeVencimiento,
  estadoDesdeDias,
  FILAS_POR_PAGINA_DEFAULT,
  formatDdMmYyyy,
  isoFromToday,
  parseFilasPorPagina,
  type ComboFiltro,
  type EstadoFiltro,
  type FilasPorPagina,
  type VenceFiltro,
} from "@/lib/cuenta-salud";
import { filtrarPorVencimiento, type FiltroVencimiento } from "@/lib/vencimiento";
import type { PlantillasWhatsapp } from "@/lib/whatsapp";


export type Perfil = {
  id: string;
  etiqueta: string;
  pin: string | null;
  vencimiento?: string;
  clienteTelefono: string | null;
  clienteNombre: string | null;
};

export type Cuenta = {
  id: string;
  servicio: string;
  correo: string;
  clave: string;
  proveedor: string;
  proveedorContacto: string | null;
  vencimiento: string;
  perfiles: Perfil[];
};

function fechasDeCuentaYPerfiles(cuenta: Cuenta): string[] {
  return [cuenta.vencimiento, ...cuenta.perfiles.map((perfil) => perfil.vencimiento ?? cuenta.vencimiento)];
}

function buildMockCuentas(): Cuenta[] {
  const servicios = ["HBO MAX", "Netflix", "Disney+", "Prime Video", "Paramount+", "Crunchyroll", "Star+", "Spotify"];
  const proveedores = ["luchito", "Mayorista Lima", "Andes Play", "—", "GlobalStream"];
  const contactosProveedor: Array<string | null> = ["51987654321", "987100200", null, null, "51999111222"];
  const offsets = [20, 12, 8, 6, 4, 2, 1, 0, -2, -8];
  const cuentas: Cuenta[] = [];
  for (let index = 0; index < 32; index += 1) {
    const servicio = servicios[index % servicios.length];
    const vencimiento = isoFromToday(offsets[index % offsets.length] + Math.floor(index / 10));
    const perfilCount = 5;
    const perfiles: Perfil[] = Array.from({ length: perfilCount }, (_, slot) => ({
      id: `p-${index + 1}-${slot + 1}`,
      etiqueta: slot === 0 ? "Perfil 1 (Principal)" : `Perfil ${slot + 1}`,
      pin: slot % 3 === 0 ? null : String(1000 + index * 7 + slot).slice(0, 4),
      clienteTelefono: null,
      clienteNombre: null,
    }));
    cuentas.push({
      id: `cta-${index + 1}`,
      servicio,
      correo: `cuenta${index + 1}@correo.com`,
      clave: `Clave${100 + index}`,
      proveedor: proveedores[index % proveedores.length],
      proveedorContacto: contactosProveedor[index % contactosProveedor.length],
      vencimiento,
      perfiles,
    });
  }

  function asignar(cuentaIndex: number, slot: number, telefono: string, nombre: string) {
    const cuenta = cuentas[cuentaIndex];
    const perfil = cuenta?.perfiles[slot];
    if (!cuenta || !perfil) return;
    cuenta.perfiles[slot] = { ...perfil, clienteTelefono: telefono, clienteNombre: nombre };
  }

  asignar(1, 0, "987111111", "Carlos Rojas");
  asignar(0, 1, "987654321", "María Quispe");
  asignar(2, 1, "987-654-321", "Maria Quispe");
  asignar(1, 1, "912345678", "Luis Paredes");
  asignar(1, 3, "912345678", "Luis Paredes");
  asignar(3, 2, "912345678", "Luis Paredes");
  asignar(7, 1, "912345678", "Luis Paredes");
  asignar(0, 2, "999888777", "Ana Torres");
  asignar(1, 2, "999888777", "Ana Torres");
  asignar(2, 2, "999888777", "Ana Torres");
  asignar(4, 1, "999888777", "Ana Torres");

  return cuentas;
}

const MOCK_INICIAL = buildMockCuentas();

export function ClientesTable({ plantillas = {} }: { plantillas?: PlantillasWhatsapp }) {
  const [cuentas, setCuentas] = useState<Cuenta[]>(MOCK_INICIAL);
  const [query, setQuery] = useState("");
  const [servicio, setServicio] = useState("all");
  const [estado, setEstado] = useState<EstadoFiltro>("all");
  const [vence, setVence] = useState<VenceFiltro>("all");
  const [proveedor, setProveedor] = useState("all");
  const [venceProveedor, setVenceProveedor] = useState<FiltroVencimiento>("all");
  const [fechaProveedor, setFechaProveedor] = useState("");
  const [combo, setCombo] = useState<ComboFiltro>("all");
  const [page, setPage] = useState(1);
  const [filasPorPagina, setFilasPorPagina] = useState<FilasPorPagina>(FILAS_POR_PAGINA_DEFAULT);
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set([MOCK_INICIAL[0]?.id]));
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

  const grupos = useMemo(() => agruparClientesPorServicios(cuentas), [cuentas]);
  const telefonosCombo = useMemo(() => {
    if (combo === "all") return null;
    const cantidad = Number(combo);
    const telefonos = new Set<string>();
    for (const [telefono, grupo] of grupos) {
      if (grupo.servicios.size === cantidad) telefonos.add(telefono);
    }
    return telefonos;
  }, [combo, grupos]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qDigits = whatsappParaMostrar(query);
    return cuentas.filter((cuenta) => {
      if (servicio !== "all" && cuenta.servicio !== servicio) return false;
      if (proveedor !== "all" && cuenta.proveedor !== proveedor) return false;
      if (!filtrarPorVencimiento(cuenta.vencimiento, venceProveedor, fechaProveedor || null)) return false;
      if (telefonosCombo) {
        const tieneCombo = cuenta.perfiles.some((perfil) => {
          if (!perfil.clienteTelefono) return false;
          return telefonosCombo.has(whatsappParaMostrar(perfil.clienteTelefono));
        });
        if (!tieneCombo) return false;
      }
      if (q) {
        const hay = [
          cuenta.servicio,
          cuenta.correo,
          cuenta.clave,
          cuenta.proveedor,
          ...cuenta.perfiles.flatMap((perfil) => [
            perfil.etiqueta,
            perfil.pin ?? "",
            perfil.clienteNombre ?? "",
            perfil.clienteTelefono ?? "",
          ]),
        ]
          .join(" ")
          .toLowerCase();
        const enTexto = hay.includes(q);
        const enTelefono =
          qDigits.length > 0 &&
          cuenta.perfiles.some(
            (perfil) => perfil.clienteTelefono && whatsappParaMostrar(perfil.clienteTelefono).includes(qDigits),
          );
        if (!enTexto && !enTelefono) return false;
      }
      const fechas = fechasDeCuentaYPerfiles(cuenta);
      const algunaFecha = fechas.some((iso) => {
        const dias = diasDesdeVencimiento(iso);
        return cumpleVence(dias, vence) && cumpleEstado(dias, estado);
      });
      return algunaFecha;
    });
  }, [cuentas, estado, fechaProveedor, proveedor, query, servicio, telefonosCombo, vence, venceProveedor]);

  useEffect(() => {
    if (combo === "all") return;
    setOpenIds(new Set(visible.map((cuenta) => cuenta.id)));
  }, [combo, visible]);

  const pageSize = Number(filasPorPagina);
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const startIndex = (safePage - 1) * pageSize;
  const paged = visible.slice(startIndex, startIndex + pageSize);
  const rangeStart = visible.length === 0 ? 0 : startIndex + 1;
  const rangeEnd = Math.min(visible.length, startIndex + paged.length);

  function toggleOpen(id: string) {
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function copyValue(key: string, value: string) {
    void navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied((current) => (current === key ? null : current)), 1200);
  }

  function showAviso(text: string) {
    setAviso(text);
    window.setTimeout(() => setAviso((current) => (current === text ? null : current)), 2800);
  }

  function limpiarFiltros() {
    setQuery("");
    setServicio("all");
    setEstado("all");
    setVence("all");
    setProveedor("all");
    setVenceProveedor("all");
    setFechaProveedor("");
    setCombo("all");
    setPage(1);
  }

  function addCuenta(formData: FormData) {
    const servicioNombre = String(formData.get("servicio") ?? "").trim();
    const correo = String(formData.get("correo") ?? "").trim();
    const clave = String(formData.get("clave") ?? "").trim();
    const proveedorNombre = String(formData.get("proveedor") ?? "").trim() || "—";
    const vencimiento = String(formData.get("vencimiento") ?? "").trim() || isoFromToday(30);
    if (!servicioNombre || !correo || !clave) return;
    const id = `cta-${Date.now()}`;
    const perfiles: Perfil[] = Array.from({ length: 5 }, (_, slot) => ({
      id: `${id}-p-${slot + 1}`,
      etiqueta: slot === 0 ? "Perfil 1 (Principal)" : `Perfil ${slot + 1}`,
      pin: null,
      clienteTelefono: null,
      clienteNombre: null,
    }));
    const nueva: Cuenta = {
      id,
      servicio: servicioNombre,
      correo,
      clave,
      proveedor: proveedorNombre,
      proveedorContacto: null,
      vencimiento,
      perfiles,
    };
    setCuentas((current) => [nueva, ...current]);
    setOpenIds((current) => new Set([id, ...current]));
    setPage(1);
    setPanel(null);
    showAviso("Cuenta agregada.");
  }

  function addPerfil(cuentaId: string) {
    setCuentas((current) =>
      current.map((cuenta) => {
        if (cuenta.id !== cuentaId) return cuenta;
        const n = cuenta.perfiles.length + 1;
        return {
          ...cuenta,
          perfiles: [...cuenta.perfiles, { id: `${cuenta.id}-p-${n}`, etiqueta: `Perfil ${n}`, pin: null, clienteTelefono: null, clienteNombre: null }],
        };
      }),
    );
  }

  const filterProps = {
    query,
    onQuery: (value: string) => {
      setQuery(value);
      setPage(1);
    },
    searchPlaceholder: "Buscar cliente, correo o servicio...",
    servicio,
    onServicio: (value: string) => {
      setServicio(value);
      setPage(1);
    },
    servicios,
    estado,
    onEstado: (value: EstadoFiltro) => {
      setEstado(value);
      setPage(1);
    },
    vence,
    onVence: (value: VenceFiltro) => {
      setVence(value);
      setPage(1);
    },
    proveedor,
    onProveedor: (value: string) => {
      setProveedor(value);
      setPage(1);
    },
    proveedores,
    venceProveedor,
    onVenceProveedor: (value: FiltroVencimiento) => {
      setVenceProveedor(value);
      if (value !== "exacta") setFechaProveedor("");
      setPage(1);
    },
    fechaProveedor,
    onFechaProveedor: (value: string) => {
      setFechaProveedor(value);
      setPage(1);
    },
    showCombo: true as const,
    combo,
    onCombo: (value: ComboFiltro) => {
      setCombo(value);
      setPage(1);
    },
  };

  return (
    <div className="min-w-0 overflow-x-hidden bg-[#0B0F1A]">
      <div className="flex flex-col gap-3">
        <AccountsPageHeader
          title="Clientes"
          subtitle="Gestiona tus clientes, servicios y perfiles"
          onFiltros={() => setPanel("filtros")}
          onAgregar={() => setPanel("cuenta")}
        />
        <AccountsFilterBar {...filterProps} />
      </div>
      <p className="mt-2 text-right text-xs text-[#94A3B8]">Total: {visible.length} cuentas</p>
      {aviso ? <p className="mt-2 text-sm font-medium text-[#16A34A]">{aviso}</p> : null}

      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[1100px] space-y-3">
          <div className={`${headerGrid} px-0 text-[10px] font-medium tracking-[0.14em] text-[#94A3B8] uppercase`}>
            <span className="px-3">#</span>
            <span className="px-2">Servicio</span>
            <span className="px-2">Correo de la cuenta</span>
            <span className="px-2">Clave</span>
            <span className="px-2">Proveedor</span>
            <span className="px-2">Vencimiento</span>
            <span className="px-2">Perfiles</span>
            <span className="px-2">Días</span>
            <span className="px-2">Estado</span>
            <span className="px-2 tracking-normal">Acciones</span>
          </div>
          {paged.length === 0 ? (
            <p className="rounded-xl border border-[#253047] bg-[#111827] px-4 py-10 text-center text-sm text-[#94A3B8]">
              {combo === "all" ? "No hay cuentas para mostrar." : "No hay clientes con ese combo"}
            </p>
          ) : (
            paged.map((cuenta, index) => {
              const dias = diasDesdeVencimiento(cuenta.vencimiento);
              const health = estadoDesdeDias(dias);
              const open = openIds.has(cuenta.id);
              const perfilesVisibles = telefonosCombo
                ? cuenta.perfiles.filter(
                    (perfil) => perfil.clienteTelefono && telefonosCombo.has(whatsappParaMostrar(perfil.clienteTelefono)),
                  )
                : cuenta.perfiles;
              return (
                <article key={cuenta.id} className="overflow-hidden rounded-xl border border-[#253047] bg-[#111827]">
                  <div className={`${headerGrid} px-0 hover:bg-[#172033]/50`}>
                    <span className="px-3 py-3 text-sm text-[#94A3B8]">{rangeStart + index}</span>
                    <div className="flex min-w-0 items-center gap-2 px-2 py-3">
                      <ServiceMark name={cuenta.servicio} />
                      <p className="truncate text-sm font-semibold text-[#F1F5F9]">{cuenta.servicio}</p>
                    </div>
                    <div className="px-2 py-3">
                      <CopyField id={`${cuenta.id}-mail`} value={cuenta.correo} copied={copied} onCopy={copyValue} />
                    </div>
                    <div className="px-2 py-3">
                      <CopyField id={`${cuenta.id}-clave`} value={cuenta.clave} copied={copied} onCopy={copyValue} />
                    </div>
                    <p className="truncate px-2 py-3 text-sm text-[#F1F5F9]">{cuenta.proveedor}</p>
                    <div className="flex items-center gap-1 px-2 py-3 text-sm text-[#F1F5F9]">
                      <span>{formatDdMmYyyy(cuenta.vencimiento)}</span>
                      <span className="text-[#94A3B8]" aria-hidden>
                        <CalendarIcon className="h-3.5 w-3.5" />
                      </span>
                    </div>
                    <div className="px-2 py-3">
                      <span className="inline-flex rounded-full bg-[#2563EB]/20 px-2.5 py-0.5 text-[11px] font-semibold text-[#93C5FD]">
                        {cuenta.perfiles.length} perfiles
                      </span>
                    </div>
                    <span className={`px-2 py-3 text-sm font-semibold ${colorDias(health)}`}>{dias}</span>
                    <div className="px-2 py-3">
                      <HealthStatusBadge status={health} />
                    </div>
                    <div className="relative flex items-center justify-end gap-0.5 px-2 py-2">
                      <AccountRowActions
                        plantillas={plantillas}
                        whatsapp={
                          cuenta.proveedorContacto
                            ? {
                                telefono: cuenta.proveedorContacto,
                                nombre: cuenta.proveedor === "—" ? "proveedor" : cuenta.proveedor,
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
                      <button
                        type="button"
                        className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#253047] text-[#F1F5F9] hover:border-[#2563EB]"
                        aria-expanded={open}
                        aria-label={open ? "Contraer perfiles" : "Ver perfiles"}
                        onClick={() => toggleOpen(cuenta.id)}
                      >
                        {open ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
                      </button>
                      {menu === cuenta.id ? (
                        <div className="absolute top-10 right-2 z-20 w-40 rounded-lg border border-[#253047] bg-[#111827] py-1 text-xs">
                          <button type="button" className="block w-full px-3 py-2 text-left hover:bg-[#172033]" onClick={() => { setDetail(cuenta.id); setMenu(null); }}>
                            Ver detalle
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  {open ? (
                    <div className="border-t border-[#253047] bg-[#0D1320] py-3 pr-3 pl-12">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className="text-[10px] tracking-[0.12em] text-[#94A3B8] uppercase">
                            <th className="px-2 py-2 font-medium">Perfil (cliente)</th>
                            <th className="px-2 py-2 font-medium">PIN</th>
                            <th className="px-2 py-2 font-medium">Vencimiento</th>
                            <th className="px-2 py-2 font-medium">Días</th>
                            <th className="px-2 py-2 font-medium">Estado</th>
                            <th className="px-2 py-2 font-medium">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {perfilesVisibles.map((perfil) => {
                            const iso = perfil.vencimiento ?? cuenta.vencimiento;
                            const perfilDias = diasDesdeVencimiento(iso);
                            const perfilHealth = estadoDesdeDias(perfilDias);
                            const menuKey = `${cuenta.id}-${perfil.id}`;
                            const perfilWhatsapp = perfil.clienteTelefono
                              ? {
                                  telefono: perfil.clienteTelefono,
                                  nombre: perfil.clienteNombre?.trim() || "cliente",
                                  servicio: cuenta.servicio,
                                  fecha: formatDdMmYyyy(iso),
                                  dias: perfilDias,
                                }
                              : null;
                            return (
                              <tr key={perfil.id} className="border-t border-[#253047] text-[#F1F5F9]">
                                <td className="px-2 py-2">{etiquetaCliente(perfil)}</td>
                                <td className="px-2 py-2">{perfil.pin ? perfil.pin : <span className="text-[#64748B]">Sin PIN</span>}</td>
                                <td className="px-2 py-2">{formatDdMmYyyy(iso)}</td>
                                <td className={`px-2 py-2 font-semibold ${colorDias(perfilHealth)}`}>{perfilDias}</td>
                                <td className="px-2 py-2">
                                  <HealthStatusBadge status={perfilHealth} />
                                </td>
                                <td className="relative px-2 py-2">
                                  <div className="flex items-center gap-0.5">
                                    <WhatsAppMenu destino={perfilWhatsapp} plantillas={plantillas} />
                                    <IconBtn label="Ver" onClick={() => setDetail(perfil.id)}>
                                      <EyeIcon className="h-3.5 w-3.5" />
                                    </IconBtn>
                                    <IconBtn label="Editar" onClick={() => setDetail(perfil.id)}>
                                      <PencilIcon className="h-3.5 w-3.5" />
                                    </IconBtn>
                                    <IconBtn label="Más" onClick={() => setMenu(menu === menuKey ? null : menuKey)}>
                                      <MoreIcon className="h-3.5 w-3.5" />
                                    </IconBtn>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <button type="button" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[#2563EB]" onClick={() => addPerfil(cuenta.id)}>
                        <PlusIcon className="h-4 w-4" />
                        + Agregar perfil
                      </button>
                    </div>
                  ) : null}
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
          setPage(1);
        }}
      />

      <Modal open={Boolean(detail)} title="Detalle" onClose={() => setDetail(null)}>
        <p className="text-sm text-[#94A3B8]">Vista de mock. Este registro aún no está conectado a Supabase.</p>
      </Modal>

      <Modal open={panel === "filtros"} title="Filtros avanzados" onClose={() => setPanel(null)}>
        <div className="space-y-3">
          <AccountsFilterBar {...filterProps} stacked />
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
          <input name="servicio" list="servicios-cuenta" placeholder="Servicio" className={inputClass} required />
          <datalist id="servicios-cuenta">
            {servicios.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          <input name="correo" type="email" placeholder="Correo de la cuenta" className={inputClass} required />
          <input name="clave" placeholder="Clave" className={inputClass} required />
          <input name="proveedor" list="proveedores-cuenta" placeholder="Proveedor" className={inputClass} />
          <datalist id="proveedores-cuenta">
            {proveedores.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
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

const headerGrid =
  "grid grid-cols-[2.25rem_minmax(9.5rem,1.2fr)_minmax(11rem,1.4fr)_minmax(7rem,0.9fr)_minmax(6rem,0.8fr)_minmax(7.5rem,1fr)_minmax(6.5rem,0.8fr)_3rem_minmax(6rem,0.8fr)_minmax(11rem,1.1fr)] items-center gap-x-3";

const inputClass =
  "h-10 w-full rounded-lg border border-[#253047] bg-[#111827] px-3 text-sm text-[#E2E8F0] outline-none placeholder:text-[#94A3B8]";

function etiquetaCliente(perfil: Perfil) {
  if (!perfil.clienteTelefono) {
    return <span className="text-[#94A3B8]">Sin asignar</span>;
  }
  if (!perfil.clienteNombre) return perfil.etiqueta;
  return `${perfil.etiqueta} · ${perfil.clienteNombre}`;
}
