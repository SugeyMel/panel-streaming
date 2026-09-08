"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  deleteStreamingAccountAction,
  patchInventoryServiceAction,
  upsertCustomerAction,
  upsertStreamingAccountAction,
} from "@/app/actions/business";
import {
  AccountForm,
  AssignModal,
  ExpiryDateInput,
  ProfileDrawer,
  SecretValue,
  accountToForm,
  healthClass,
} from "@/components/inventory/InventoryAccountsManager";
import {
  CopyIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  MoreIcon,
  PencilIcon,
} from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { WhatsAppInput } from "@/components/ui/WhatsAppInput";
import { PlatformLogo } from "@/components/ui/PlatformLogo";
import { SearchBar } from "@/components/ui/SearchBar";
import {
  buildInventoryRows,
  inventoryEndDate,
  inventoryHealth,
  parseProfileSlot,
  servicesOnAccount,
  type InventoryAccountRow,
  type ProfileSlot,
} from "@/lib/inventory-matrix";
import { platformDisplayName } from "@/lib/platform-logos";
import { whatsappParaMostrar } from "@/lib/clientes";
import type { Customer, Platform, Product, StreamingAccount, Subscription } from "@/lib/types";

const PAGE_SIZE = 8;
const dateFieldClass =
  "min-w-[7.5rem] rounded-md border border-[#253047] bg-[#0B111C] px-2 py-1 pr-7 text-[11px] leading-4 text-[#F8FAFC]";
const sheetCell = "border border-[#253047] px-2.5 py-2 align-middle";
const sheetHead =
  "border border-[#253047] bg-[#080d16] px-2.5 py-2 text-left text-[10px] font-medium tracking-[0.12em] text-[#94A3B8] uppercase";
const MIN_ZOOM = 0.45;
const MAX_ZOOM = 1.8;

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(2))));
}

type StatusFilter = "all" | "active" | "expiring" | "expired";

function displayHealth(endDate: string | null) {
  const health = inventoryHealth(endDate);
  if (health.tone === "ok") return { ...health, label: "Activo" };
  if (health.tone === "warn") return { ...health, label: "Por vencer" };
  if (health.tone === "bad") return { ...health, label: "Vencido" };
  return { ...health, label: "—" };
}

function slotLabel(slot: ProfileSlot) {
  const parsed = parseProfileSlot(slot.service?.accessProfile);
  const name = slot.customer?.name || parsed.name;
  if (!slot.service) return `Perfil ${slot.index}`;
  if (name) return `Perfil ${slot.index} (${name})`;
  return `Perfil ${slot.index}`;
}

function StatusPill({ health }: { health: ReturnType<typeof displayHealth> }) {
  const tone = {
    ok: "bg-[#16A34A] text-white",
    warn: "bg-[#EAB308] text-[#1C1917]",
    bad: "bg-[#DC2626] text-white",
    none: "bg-[#334155] text-[#E2E8F0]",
    free: "bg-[#2563EB] text-white",
  } as const;
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${tone[health.tone]}`}>
      {health.label}
    </span>
  );
}

export function CustomersAccountsBoard({
  accounts,
  platforms,
  services,
  customers,
  products,
}: {
  accounts: StreamingAccount[];
  platforms: Platform[];
  services: Subscription[];
  customers: Customer[];
  products: Product[];
}) {
  const router = useRouter();
  const rows = useMemo(
    () => buildInventoryRows(accounts, services, customers),
    [accounts, customers, services],
  );
  const [query, setQuery] = useState("");
  const [platformId, setPlatformId] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [accountForm, setAccountForm] = useState<StreamingAccount | null | "new">(null);
  const [assign, setAssign] = useState<{ row: InventoryAccountRow; slot: number } | null>(null);
  const [drawer, setDrawer] = useState<{ row: InventoryAccountRow; slot: ProfileSlot } | null>(null);
  const [accountMenu, setAccountMenu] = useState<string | null>(null);
  const [slotMenu, setSlotMenu] = useState<string | null>(null);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [zoom, setZoom] = useState(0.55);
  const sheetRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(1);
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null);
  zoomRef.current = zoom;

  const visible = useMemo(() => {
    let list = rows;
    if (platformId !== "all") list = list.filter((row) => row.account.platformId === platformId);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((row) =>
        [
          row.account.email,
          row.account.password,
          row.account.supplierName,
          row.account.label,
          ...row.slots.flatMap((slot) => [
            slot.customer?.name,
            slot.customer?.whatsapp,
            slot.customer ? whatsappParaMostrar(slot.customer.whatsapp) : "",
            slot.service?.accessProfile,
            slot.service?.accessPassword,
          ]),
        ]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }
    if (status !== "all") {
      list = list.filter((row) => {
        const tone = displayHealth(inventoryEndDate(row)).tone;
        if (status === "active") return tone === "ok";
        if (status === "expiring") return tone === "warn" || displayHealth(inventoryEndDate(row)).days === 1;
        return tone === "bad";
      });
    }
    return [...list].sort((a, b) => {
      const nameA = platformDisplayName(platforms.find((item) => item.id === a.account.platformId) ?? a.account.platformId);
      const nameB = platformDisplayName(platforms.find((item) => item.id === b.account.platformId) ?? b.account.platformId);
      const byPlatform = nameA.localeCompare(nameB, "es");
      if (byPlatform !== 0) return byPlatform;
      return a.account.email.localeCompare(b.account.email);
    });
  }, [platformId, platforms, query, rows, status]);

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const paged = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeStart = visible.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(visible.length, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [platformId, query, status]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  useEffect(() => {
    const node = sheetRef.current;
    if (!node) return;

    const distance = (event: TouchEvent) => {
      const [a, b] = [event.touches[0], event.touches[1]];
      return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    };

    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      setZoom((current) => clampZoom(current + (event.deltaY > 0 ? -0.08 : 0.08)));
    };
    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        pinchRef.current = { dist: distance(event), zoom: zoomRef.current };
      }
    };
    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 2 || !pinchRef.current) return;
      event.preventDefault();
      const ratio = distance(event) / pinchRef.current.dist;
      setZoom(clampZoom(pinchRef.current.zoom * ratio));
    };
    const onTouchEnd = () => {
      pinchRef.current = null;
    };

    node.addEventListener("wheel", onWheel, { passive: false });
    node.addEventListener("touchstart", onTouchStart, { passive: true });
    node.addEventListener("touchmove", onTouchMove, { passive: false });
    node.addEventListener("touchend", onTouchEnd);
    return () => {
      node.removeEventListener("wheel", onWheel);
      node.removeEventListener("touchstart", onTouchStart);
      node.removeEventListener("touchmove", onTouchMove);
      node.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  const platformOf = (id: string) => platforms.find((item) => item.id === id);
  const nameOf = (id: string) => {
    const platform = platformOf(id);
    return platform ? platformDisplayName(platform) : "—";
  };
  const serviceTitle = (row: InventoryAccountRow) => {
    const name = nameOf(row.account.platformId);
    const label = row.account.label.trim();
    if (label && !/completa/i.test(label) && !name.toLowerCase().includes(label.toLowerCase())) {
      return `${name} ${label}`;
    }
    return name;
  };

  function profileSlots(row: InventoryAccountRow) {
    const placed = new Set(row.slots.map((slot) => slot.service?.id).filter(Boolean));
    const overflow = servicesOnAccount(row.account, services)
      .filter((item) => !placed.has(item.id))
      .map((service, index) => ({
        index: row.slots.length + index + 1,
        service,
        customer: customers.find((item) => item.id === service.customerId) ?? null,
      }));
    return [...row.slots, ...overflow];
  }

  async function saveAccountExpiry(account: StreamingAccount, expiresAt: string) {
    const result = await upsertStreamingAccountAction(accountToForm(account, { expiresAt }));
    setMessage(result.ok ? "Vencimiento actualizado." : result.error ?? "No se pudo guardar");
    if (result.ok) router.refresh();
  }

  async function saveSlotExpiry(slot: ProfileSlot, endDate: string) {
    if (!slot.service) return;
    const form = new FormData();
    form.set("serviceId", slot.service.id);
    form.set("endDate", endDate);
    const result = await patchInventoryServiceAction(form);
    setMessage(result.ok ? "Vencimiento del perfil actualizado." : result.error ?? "No se pudo guardar");
    if (result.ok) router.refresh();
  }

  async function addProfile(row: InventoryAccountRow) {
    const free = row.slots.find((slot) => !slot.service);
    if (free) {
      setAssign({ row, slot: free.index });
      return;
    }
    if (row.account.maxProfiles >= 8) {
      setMessage("Máximo 8 perfiles por cuenta.");
      return;
    }
    const nextMax = row.account.maxProfiles + 1;
    const form = accountToForm(row.account);
    form.set("maxProfiles", String(nextMax));
    const result = await upsertStreamingAccountAction(form);
    if (!result.ok) {
      setMessage(result.error ?? "No se pudo agregar el perfil.");
      return;
    }
    setAssign({ row, slot: nextMax });
    router.refresh();
  }

  async function releaseSlot(slot: ProfileSlot) {
    if (!slot.service) return;
    const form = new FormData();
    form.set("serviceId", slot.service.id);
    form.set("free", "1");
    const result = await patchInventoryServiceAction(form);
    setMessage(result.ok ? "Perfil liberado." : result.error ?? "No se pudo liberar");
    setSlotMenu(null);
    if (result.ok) router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <h1 className="text-[1.75rem] leading-none font-semibold tracking-tight text-[#F8FAFC]">Clientes</h1>
          <p className="mt-1 text-sm text-[#94A3B8]">Gestiona tus clientes, servicios y perfiles.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SearchBar className="w-full max-w-none sm:w-64" value={query} onChange={setQuery} placeholder="Buscar cliente, correo o servicio..." />
          <select value={platformId} onChange={(event) => setPlatformId(event.target.value)} className="ui-field h-9 w-auto min-w-[10rem] py-1 text-xs">
            <option value="all">Todos los servicios</option>
            {platforms.map((item) => (
              <option key={item.id} value={item.id}>
                {platformDisplayName(item)}
              </option>
            ))}
          </select>
          <select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)} className="ui-field h-9 w-auto min-w-[9rem] py-1 text-xs">
            <option value="all">Todos los estados</option>
            <option value="active">Activo</option>
            <option value="expiring">Por vencer</option>
            <option value="expired">Vencido</option>
          </select>
          <Button variant="secondary" className="h-9 min-h-9 px-3 text-xs" onClick={() => setCustomerOpen(true)}>
            + Agregar cliente
          </Button>
          <Button className="h-9 min-h-9 px-4 text-sm" onClick={() => setAccountForm("new")}>
            + Agregar cuenta
          </Button>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-[#94A3B8]">Total: {visible.length} cuentas</p>
        <div className="flex items-center gap-1 lg:hidden">
          <button
            type="button"
            className="rounded-md border border-[#334155] px-2 py-1 text-sm text-[#F8FAFC]"
            aria-label="Alejar"
            onClick={() => setZoom((current) => clampZoom(current - 0.1))}
          >
            −
          </button>
          <span className="min-w-12 text-center text-[11px] text-[#94A3B8]">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            className="rounded-md border border-[#334155] px-2 py-1 text-sm text-[#F8FAFC]"
            aria-label="Acercar"
            onClick={() => setZoom((current) => clampZoom(current + 0.1))}
          >
            +
          </button>
        </div>
      </div>
      {message ? <p className="text-xs text-[#38BDF8]">{message}</p> : null}

      <div ref={sheetRef} className="overflow-auto rounded-xl border border-[#253047] bg-[#0B111C]">
        <div className="clientes-sheet-zoom origin-top-left max-lg:w-max" style={{ ["--sheet-zoom" as string]: String(zoom) }}>
        <table className="w-full min-w-[980px] table-fixed border-collapse text-left text-[12px]">
          <colgroup>
            <col className="w-10" />
            <col className="w-[15%]" />
            <col className="w-[16%]" />
            <col className="w-[13%]" />
            <col className="w-[9%]" />
            <col className="w-12" />
            <col className="w-[9%]" />
            <col className="w-[11%]" />
            <col className="w-[11%]" />
            <col className="w-[13%]" />
          </colgroup>
          <thead>
            <tr>
              <th className={sheetHead}>#</th>
              <th className={sheetHead}>Servicio</th>
              <th className={sheetHead}>Correo de la cuenta</th>
              <th className={sheetHead}>Clave</th>
              <th className={sheetHead}>Perfiles</th>
              <th className={sheetHead}>Días</th>
              <th className={sheetHead}>Estado</th>
              <th className={sheetHead}>Acciones</th>
              <th className={sheetHead}>Proveedor</th>
              <th className={sheetHead}>Vencimiento</th>
            </tr>
          </thead>
          {paged.length === 0 ? (
            <tbody>
              <tr>
                <td colSpan={10} className={`${sheetCell} py-8 text-center text-[#94A3B8]`}>
                  Aún no hay cuentas. Agrégalas aquí o en Inventario; ambos usan los mismos registros.
                </td>
              </tr>
            </tbody>
          ) : (
            paged.map((row, index) => {
              const end = inventoryEndDate(row);
              const health = displayHealth(end);
              const slots = profileSlots(row);
              return (
                <tbody key={row.account.id}>
                  <tr className="bg-[#111827]">
                    <td className={`${sheetCell} text-[#94A3B8]`}>{rangeStart + index}</td>
                    <td className={sheetCell}>
                      <div className="flex min-w-0 items-center gap-2">
                        <PlatformLogo platform={platformOf(row.account.platformId) ?? row.account.platformId} size="table" />
                        <p className="truncate font-semibold text-[#F8FAFC]">{serviceTitle(row)}</p>
                      </div>
                    </td>
                    <td className={sheetCell}>
                      <CopyLine value={row.account.email} />
                    </td>
                    <td className={sheetCell}>
                      <SecretValue value={row.account.password} className="" />
                    </td>
                    <td className={sheetCell}>
                      <span className="inline-flex items-center rounded-full bg-[#1E3A5F] px-2.5 py-1 text-[11px] font-semibold text-[#93C5FD]">
                        {slots.length} perfiles
                      </span>
                    </td>
                    <td className={`${sheetCell} text-sm font-semibold ${healthClass[health.tone]}`}>{health.days === null ? "—" : health.days}</td>
                    <td className={sheetCell}>
                      <StatusPill health={health} />
                    </td>
                    <td className={`relative ${sheetCell}`}>
                      <div className="flex items-center justify-end">
                        <RowActions
                          onView={() => {
                            const first = row.slots.find((slot) => slot.service) ?? row.slots[0];
                            if (first?.service) setDrawer({ row, slot: first });
                            else setAccountForm(row.account);
                          }}
                          onEdit={() => setAccountForm(row.account)}
                          menuOpen={accountMenu === row.account.id}
                          onMenu={() => setAccountMenu(accountMenu === row.account.id ? null : row.account.id)}
                        >
                          <button
                            type="button"
                            className="block w-full px-3 py-1.5 text-left hover:bg-[#172033]"
                            onClick={() => {
                              setAccountForm(row.account);
                              setAccountMenu(null);
                            }}
                          >
                            Editar cuenta
                          </button>
                          <button
                            type="button"
                            className="block w-full px-3 py-1.5 text-left text-[#EF4444] hover:bg-[#172033]"
                            onClick={async () => {
                              const result = await deleteStreamingAccountAction(row.account.id);
                              setMessage(result.ok ? "Cuenta quitada." : result.error ?? "No se pudo quitar");
                              setAccountMenu(null);
                              if (result.ok) router.refresh();
                            }}
                          >
                            Quitar
                          </button>
                        </RowActions>
                      </div>
                    </td>
                    <td className={`${sheetCell} truncate text-[#F8FAFC]`}>{row.account.supplierName || "—"}</td>
                    <td className={sheetCell}>
                      <ExpiryDateInput
                        iso={row.account.expiresAt ?? end?.slice(0, 10) ?? ""}
                        className={dateFieldClass}
                        onCommit={(value) => saveAccountExpiry(row.account, value)}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={10} className="border border-[#253047] bg-[#080d16] p-3">
                      <div className="overflow-hidden rounded-lg border border-[#253047] bg-[#0B111C]">
                        <table className="w-full border-collapse text-left text-[12px]">
                          <thead>
                            <tr>
                              <th className={sheetHead}>Perfil (cliente)</th>
                              <th className={`${sheetHead} w-[12%]`}>PIN</th>
                              <th className={`${sheetHead} w-[16%]`}>Vencimiento</th>
                              <th className={`${sheetHead} w-14`}>Días</th>
                              <th className={`${sheetHead} w-[12%]`}>Estado</th>
                              <th className={`${sheetHead} w-[14%]`}>Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {slots.map((slot) => {
                              const slotHealth = displayHealth(slot.service?.endDate ?? null);
                              const menuKey = `${row.account.id}-${slot.index}`;
                              return (
                                <tr key={menuKey} className="text-[#F8FAFC]">
                                  <td className={sheetCell}>{slot.service ? slotLabel(slot) : <span className="text-[#94A3B8]">Perfil {slot.index} · Libre</span>}</td>
                                  <td className={`${sheetCell} text-[#94A3B8]`}>{slot.service?.accessPassword || "Sin PIN"}</td>
                                  <td className={sheetCell}>
                                    {slot.service ? (
                                      <ExpiryDateInput iso={slot.service.endDate.slice(0, 10)} className={dateFieldClass} onCommit={(value) => saveSlotExpiry(slot, value)} />
                                    ) : (
                                      <span className="text-[#64748B]">—</span>
                                    )}
                                  </td>
                                  <td className={`${sheetCell} font-semibold ${healthClass[slotHealth.tone]}`}>{slot.service ? slotHealth.days : "—"}</td>
                                  <td className={sheetCell}>{slot.service ? <StatusPill health={slotHealth} /> : <span className="text-[#64748B]">Libre</span>}</td>
                                  <td className={`relative ${sheetCell}`}>
                                    {slot.service ? (
                                      <RowActions
                                        onView={() => setDrawer({ row, slot })}
                                        onEdit={() => setAssign({ row, slot: slot.index })}
                                        menuOpen={slotMenu === menuKey}
                                        onMenu={() => setSlotMenu(slotMenu === menuKey ? null : menuKey)}
                                      >
                                        <a className="block px-3 py-1.5 hover:bg-[#172033]" href={`/panel/clientes/${slot.service.customerId}`}>
                                          Ver cliente
                                        </a>
                                        <button type="button" className="block w-full px-3 py-1.5 text-left text-[#EF4444] hover:bg-[#172033]" onClick={() => releaseSlot(slot)}>
                                          Liberar perfil
                                        </button>
                                      </RowActions>
                                    ) : (
                                      <button type="button" className="text-[12px] font-semibold text-[#60A5FA]" onClick={() => setAssign({ row, slot: slot.index })}>
                                        Asignar
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                            <tr>
                              <td colSpan={6} className={sheetCell}>
                                <button type="button" className="text-[12px] font-semibold text-[#38BDF8]" onClick={() => addProfile(row)}>
                                  + Agregar perfil
                                </button>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                </tbody>
              );
            })
          )}
        </table>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-[#94A3B8]">
          {visible.length === 0 ? "Sin servicios para mostrar" : `Mostrando ${rangeStart} - ${rangeEnd} de ${visible.length} cuentas`}
        </p>
        {pageCount > 1 ? <Pager page={page} pageCount={pageCount} onPage={setPage} /> : null}
      </div>

      {accountForm !== null ? (
        <AccountForm
          key={accountForm === "new" ? "new" : accountForm.id}
          editing={accountForm !== "new" ? accountForm : null}
          platforms={platforms}
          onClose={() => setAccountForm(null)}
          onMessage={setMessage}
        />
      ) : null}
      {assign ? (
        <AssignModal
          row={assign.row}
          slot={assign.slot}
          customers={customers}
          products={products.filter((item) => item.platformId === assign.row.account.platformId && item.active)}
          onClose={() => setAssign(null)}
          onMessage={setMessage}
        />
      ) : null}
      {drawer?.slot.service ? (
        <ProfileDrawer
          row={drawer.row}
          slot={drawer.slot}
          platformName={nameOf(drawer.row.account.platformId)}
          onClose={() => setDrawer(null)}
          onMessage={setMessage}
          onEdit={() => {
            if (!drawer.slot.service) return;
            setAssign({ row: drawer.row, slot: drawer.slot.index });
            setDrawer(null);
          }}
        />
      ) : null}

      <Modal open={customerOpen} title="Agregar cliente" onClose={() => setCustomerOpen(false)}>
        <form
          className="space-y-3"
          action={async (formData) => {
            const result = await upsertCustomerAction(formData);
            setMessage(result.ok ? "Cliente guardado." : result.error ?? "No se pudo guardar");
            if (result.ok) {
              setCustomerOpen(false);
              router.refresh();
            }
          }}
        >
          <input name="name" placeholder="Nombre" className="ui-field" required />
          <WhatsAppInput name="whatsapp" required />
          <input name="email" type="email" placeholder="Correo (opcional)" className="ui-field" />
          <input name="password" type="password" placeholder="Clave del cliente (mín. 6)" className="ui-field" />
          <Button type="submit" className="w-full">
            Guardar
          </Button>
        </form>
      </Modal>
    </div>
  );
}

function CopyLine({ value }: { value: string }) {
  if (!value) return <span className="text-[#64748B]">—</span>;
  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-0.5">
      <span className="truncate text-[#F8FAFC]">{value}</span>
      <button
        type="button"
        className="shrink-0 rounded p-0.5 text-[#94A3B8] hover:text-white"
        aria-label="Copiar"
        onClick={() => navigator.clipboard.writeText(value)}
      >
        <CopyIcon className="h-3 w-3" />
      </button>
    </span>
  );
}

function RowActions({
  onView,
  onEdit,
  menuOpen,
  onMenu,
  children,
}: {
  onView: () => void;
  onEdit: () => void;
  menuOpen: boolean;
  onMenu: () => void;
  children: ReactNode;
}) {
  return (
    <div className="relative flex items-center gap-0">
      <button type="button" className="rounded p-0.5 text-[#94A3B8] hover:text-white" aria-label="Ver" onClick={onView}>
        <EyeIcon className="h-3.5 w-3.5" />
      </button>
      <button type="button" className="rounded p-0.5 text-[#94A3B8] hover:text-white" aria-label="Editar" onClick={onEdit}>
        <PencilIcon className="h-3.5 w-3.5" />
      </button>
      <button type="button" className="rounded p-0.5 text-[#94A3B8] hover:text-white" aria-label="Más" onClick={onMenu}>
        <MoreIcon className="h-3.5 w-3.5" />
      </button>
      {menuOpen ? <div className="absolute top-6 right-0 z-40 w-36 rounded-lg border border-[#253047] bg-[#111827] py-1 text-xs">{children}</div> : null}
    </div>
  );
}

function Pager({ page, pageCount, onPage }: { page: number; pageCount: number; onPage: (page: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <button type="button" className="rounded-lg border border-[#253047] p-1.5 text-[#94A3B8] disabled:opacity-40" disabled={page <= 1} onClick={() => onPage(Math.max(1, page - 1))} aria-label="Anterior">
        <ChevronLeftIcon className="h-4 w-4" />
      </button>
      {Array.from({ length: pageCount }, (_, index) => index + 1).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onPage(item)}
          className={`min-w-8 rounded-lg px-2 py-1 text-xs font-semibold ${page === item ? "bg-[#2563EB] text-white" : "text-[#94A3B8] hover:bg-[#172033]"}`}
        >
          {item}
        </button>
      ))}
      <button type="button" className="rounded-lg border border-[#253047] p-1.5 text-[#94A3B8] disabled:opacity-40" disabled={page >= pageCount} onClick={() => onPage(Math.min(pageCount, page + 1))} aria-label="Siguiente">
        <ChevronRightIcon className="h-4 w-4" />
      </button>
    </div>
  );
}