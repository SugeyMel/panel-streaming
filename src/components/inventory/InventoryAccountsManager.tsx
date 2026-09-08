"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  deleteStreamingAccountAction,
  patchInventoryServiceAction,
  upsertCustomerAction,
  upsertServiceAction,
  upsertStreamingAccountAction,
} from "@/app/actions/business";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, CloseIcon, CopyIcon, EyeIcon, MoreIcon, WhatsAppIcon } from "@/components/icons";
import { PlatformLogo } from "@/components/ui/PlatformLogo";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { WhatsAppInput } from "@/components/ui/WhatsAppInput";
import { SearchBar } from "@/components/ui/SearchBar";
import { dayMonthYearToIso, daysRemaining, formatCurrency, formatDate, isoToDayMonthYear, serviceStatusFromDates, subscriptionStatusLabel } from "@/lib/format";
import { whatsappParaMostrar } from "@/lib/clientes";
import { platformDisplayName } from "@/lib/platform-logos";
import {
  buildInventoryRows,
  compactDays,
  inventoryEndDate,
  inventoryHealth,
  parseProfileSlot,
  slotTone,
  type InventoryAccountRow,
  type ProfileSlot,
} from "@/lib/inventory-matrix";
import { renewalMessage, supportMessage, waLink, type PlantillasWhatsapp } from "@/lib/whatsapp";
import { groupProductOffers } from "@/lib/selectors";
import type { StoreOfferLink } from "@/lib/data/queries";
import type { Customer, Platform, Product, StreamingAccount, Subscription } from "@/lib/types";

type FilterId = "all" | "free" | "active" | "expiring" | "expired";
type InventoryKind = "shared" | "full";

const PAGE_SIZE = 6;
const VISIBLE_PLATFORMS = 5;

export const healthClass = {
  ok: "text-[#22C55E]",
  warn: "text-[#F59E0B]",
  bad: "text-[#EF4444]",
  none: "text-[#94A3B8]",
  free: "text-[#60A5FA]",
};

export const badgeClass = {
  ok: "bg-[#22C55E]/15 text-[#86EFAC]",
  warn: "bg-[#F59E0B]/15 text-[#FCD34D]",
  bad: "bg-[#EF4444]/15 text-[#FCA5A5]",
  none: "bg-[#172033] text-[#94A3B8]",
  free: "bg-[#2563EB]/15 text-[#93C5FD]",
};

const cellClass = {
  free: "border-[#8B5CF6]/50 bg-[#8B5CF6]/15 text-[#38BDF8]",
  active: "border-[#22C55E]/25 bg-[#22C55E]/10 text-[#F8FAFC]",
  expiring: "border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#F8FAFC]",
  expired: "border-[#EF4444]/40 bg-[#EF4444]/10 text-[#F8FAFC]",
};

export function InventoryAccountsManager({
  accounts,
  platforms,
  services,
  customers,
  products,
  offerLinks = [],
  plantillas = {},
}: {
  accounts: StreamingAccount[];
  platforms: Platform[];
  services: Subscription[];
  customers: Customer[];
  products: Product[];
  offerLinks?: StoreOfferLink[];
  plantillas?: PlantillasWhatsapp;
}) {
  const router = useRouter();
  const rows = useMemo(
    () => buildInventoryRows(accounts, services, customers),
    [accounts, customers, services],
  );
  const [platformId, setPlatformId] = useState("all");
  const [kind, setKind] = useState<InventoryKind>("shared");
  const [filter, setFilter] = useState<FilterId>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [moreOpen, setMoreOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [accountForm, setAccountForm] = useState<StreamingAccount | null | "new">(null);
  const [assign, setAssign] = useState<{ row: InventoryAccountRow; slot: number } | null>(null);
  const [drawer, setDrawer] = useState<{ row: InventoryAccountRow; slot: ProfileSlot } | null>(null);
  const [menu, setMenu] = useState<string | null>(null);

  const scopedRows = useMemo(
    () => rows.filter((row) => (kind === "full" ? row.isFullAccount : !row.isFullAccount)),
    [kind, rows],
  );

  const platformCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of scopedRows) {
      counts.set(row.account.platformId, (counts.get(row.account.platformId) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([id, count]) => {
        const platform = platforms.find((item) => item.id === id);
        return platform ? { platform, count } : null;
      })
      .filter((item): item is { platform: Platform; count: number } => Boolean(item))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return platformDisplayName(a.platform).localeCompare(platformDisplayName(b.platform), "es");
      });
  }, [platforms, scopedRows]);

  const visiblePlatforms = platformCounts.slice(0, VISIBLE_PLATFORMS);
  const extraPlatforms = platformCounts.slice(VISIBLE_PLATFORMS);
  const moreSelected = extraPlatforms.some((item) => item.platform.id === platformId);

  const freeTotal =
    kind === "full"
      ? scopedRows.filter((row) => row.usedCount === 0 && inventoryHealth(inventoryEndDate(row)).tone !== "bad").length
      : scopedRows.reduce((sum, row) => sum + row.freeCount, 0);
  const visible = useMemo(() => {
    let list = scopedRows.filter((row) => platformId === "all" || row.account.platformId === platformId);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((row) => {
        const hay = [
          row.account.email,
          row.account.label,
          row.account.password,
          row.account.supplierName,
          row.account.supplierContact,
          ...row.slots.flatMap((slot) => [
            slot.customer?.name,
            slot.customer?.whatsapp,
            slot.customer ? whatsappParaMostrar(slot.customer.whatsapp) : "",
            slot.service?.accessProfile,
            slot.service?.accessPassword,
          ]),
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }
    if (filter === "free") {
      list =
        kind === "full"
          ? list.filter((row) => row.usedCount === 0 && inventoryHealth(inventoryEndDate(row)).tone !== "bad")
          : list.filter((row) => row.freeCount > 0);
    }
    if (filter === "active") {
      list =
        kind === "full"
          ? list.filter((row) => row.usedCount > 0 && inventoryHealth(inventoryEndDate(row)).tone === "ok")
          : list.filter((row) => inventoryHealth(inventoryEndDate(row)).tone === "ok");
    }
    if (filter === "expiring") {
      list = list.filter((row) => {
        const health = inventoryHealth(inventoryEndDate(row));
        return health.tone === "warn" || health.days === 1;
      });
    }
    if (filter === "expired") {
      list = list.filter((row) => {
        const health = inventoryHealth(inventoryEndDate(row));
        return health.days !== null && health.days <= 0;
      });
    }
    if (filter === "free" && kind !== "full") list = [...list].sort((a, b) => b.freeCount - a.freeCount);
    else {
      list = [...list].sort((a, b) => {
        const nameA = platformDisplayName(platforms.find((item) => item.id === a.account.platformId) ?? a.account.platformId);
        const nameB = platformDisplayName(platforms.find((item) => item.id === b.account.platformId) ?? b.account.platformId);
        const byPlatform = nameA.localeCompare(nameB, "es");
        if (byPlatform !== 0) return byPlatform;
        return a.account.email.localeCompare(b.account.email);
      });
    }
    return list;
  }, [filter, kind, platformId, platforms, query, scopedRows]);

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const paged = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
    setMoreOpen(false);
  }, [filter, kind, platformId, query]);

  useEffect(() => {
    if (platformId !== "all" && !platformCounts.some((item) => item.platform.id === platformId)) {
      setPlatformId("all");
    }
  }, [platformCounts, platformId]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const platformOf = (id: string) => platforms.find((item) => item.id === id);
  const nameOf = (id: string) => {
    const platform = platformOf(id);
    return platform ? platformDisplayName(platform) : "—";
  };
  const planOf = (row: InventoryAccountRow) => {
    const label = row.account.label.trim();
    if (label && !/completa/i.test(label)) return label;
    return row.isFullAccount ? "Completa" : "Compartida";
  };

  function selectKind(next: InventoryKind) {
    setKind(next);
    setPlatformId("all");
    setPage(1);
  }

  function selectPlatform(id: string) {
    setPlatformId(id);
    setMoreOpen(false);
    setPage(1);
  }

  async function saveExpiry(account: StreamingAccount, expiresAt: string) {
    const result = await upsertStreamingAccountAction(accountToForm(account, { expiresAt }));
    setMessage(result.ok ? "Vencimiento actualizado." : result.error ?? "No se pudo guardar");
    if (result.ok) router.refresh();
  }

  async function saveSupplierExpiry(account: StreamingAccount, supplierExpiresAt: string) {
    const result = await upsertStreamingAccountAction(accountToForm(account, { supplierExpiresAt }));
    setMessage(result.ok ? "Vencimiento del proveedor actualizado." : result.error ?? "No se pudo guardar");
    if (result.ok) router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="min-w-0 lg:mr-auto">
          <h1 className="text-[1.65rem] font-semibold tracking-tight text-[#F8FAFC]">Inventario</h1>
          <p className="mt-1 text-sm text-[#94A3B8]">
            {kind === "full"
              ? "Cuentas completas, con cliente asignado y vencimientos."
              : "Cuentas, perfiles libres y vencimientos de tu stock."}
          </p>
        </div>
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder={
            kind === "full"
              ? "Buscar por plataforma, correo, cliente, proveedor..."
              : "Buscar por plataforma, correo, perfil..."
          }
        />
        <Button className="h-11 min-h-11 shrink-0 px-4" onClick={() => setAccountForm("new")}>
          + Agregar cuenta
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <KindTab active={kind === "shared"} onClick={() => selectKind("shared")} label="Cuentas compartidas" />
        <KindTab active={kind === "full"} onClick={() => selectKind("full")} label="Cuentas completas" />
      </div>

      <div className="space-y-2.5">
        <FilterRow label="Plataformas:">
          <FilterChip active={platformId === "all"} onClick={() => selectPlatform("all")} label={`Todas (${scopedRows.length})`} />
          {visiblePlatforms.map((item) => (
            <FilterChip
              key={item.platform.id}
              active={platformId === item.platform.id}
              onClick={() => selectPlatform(item.platform.id)}
              label={`${platformDisplayName(item.platform)} (${item.count})`}
              platform={item.platform}
            />
          ))}
          {extraPlatforms.length > 0 ? (
            <div className="relative">
              <FilterChip
                active={moreSelected}
                onClick={() => setMoreOpen((open) => !open)}
                label="Más"
                icon={<ChevronDownIcon className="h-3.5 w-3.5" />}
              />
              {moreOpen ? (
                <div className="absolute top-full left-0 z-30 mt-1 min-w-[12rem] rounded-xl border border-[#253047] bg-[#111827] py-1 shadow-xl">
                  {extraPlatforms.map((item) => (
                    <button
                      key={item.platform.id}
                      type="button"
                      onClick={() => selectPlatform(item.platform.id)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-[#172033] ${
                        platformId === item.platform.id ? "text-[#F8FAFC]" : "text-[#94A3B8]"
                      }`}
                    >
                      <PlatformLogo platform={item.platform} size="filter" />
                      {platformDisplayName(item.platform)} ({item.count})
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </FilterRow>
        <FilterRow label="Estado:">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="Todas" />
          <FilterChip
            active={filter === "free"}
            onClick={() => setFilter("free")}
            label={kind === "full" ? `Disponibles (${freeTotal})` : `Libres (${freeTotal})`}
          />
          <FilterChip active={filter === "active"} onClick={() => setFilter("active")} label="Vigentes" />
          <FilterChip active={filter === "expiring"} onClick={() => setFilter("expiring")} label="Por vencer" />
          <FilterChip active={filter === "expired"} onClick={() => setFilter("expired")} label="Vencidas" />
        </FilterRow>
      </div>
      {message ? <p className="text-xs text-[#38BDF8]">{message}</p> : null}

      <div className="hidden overflow-auto rounded-xl border border-[#253047] md:block">
        <table className={`w-full border-collapse text-left text-xs ${kind === "full" ? "min-w-[1280px]" : "min-w-[1080px]"}`}>
          <thead className="sticky top-0 z-20 bg-[#0B111C] text-[10px] tracking-[0.16em] text-[#94A3B8] uppercase">
            {kind === "full" ? (
              <tr>
                <th className="px-3 py-2.5 font-medium">Plataforma</th>
                <th className="px-3 py-2.5 font-medium">Cuenta</th>
                <th className="px-3 py-2.5 font-medium">Cliente</th>
                <th className="px-3 py-2.5 font-medium">Venc. cuenta</th>
                <th className="px-3 py-2.5 font-medium">Días</th>
                <th className="px-3 py-2.5 font-medium">Estado</th>
                <th className="px-3 py-2.5 font-medium">Proveedor</th>
                <th className="px-3 py-2.5 font-medium">Venc. proveedor</th>
                <th className="px-3 py-2.5 font-medium">Días</th>
                <th className="px-3 py-2.5 font-medium">Acciones</th>
              </tr>
            ) : (
              <tr>
                <th className="px-3 py-2.5 font-medium">Plataforma</th>
                <th className="px-3 py-2.5 font-medium">Cuenta</th>
                <th className="px-3 py-2.5 font-medium">Perfiles / Detalles</th>
                <th className="px-3 py-2.5 font-medium">Vencimiento</th>
                <th className="px-3 py-2.5 font-medium">Días</th>
                <th className="px-3 py-2.5 font-medium">Estado</th>
                <th className="px-3 py-2.5 font-medium">Acciones</th>
              </tr>
            )}
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={kind === "full" ? 10 : 7} className="px-3 py-10 text-center text-[#94A3B8]">
                  No hay cuentas con ese filtro.
                </td>
              </tr>
            ) : (
              paged.map((row) => {
                const end = inventoryEndDate(row);
                const health = inventoryHealth(end);
                const supplierHealth = inventoryHealth(row.account.supplierExpiresAt);
                const assigned = assignedSlot(row);
                return (
                  <tr key={row.account.id} className="border-t border-[#253047] hover:bg-[#172033]/50">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <PlatformLogo platform={platformOf(row.account.platformId) ?? row.account.platformId} size="table" />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-[#F8FAFC]">{nameOf(row.account.platformId)}</p>
                          <p className="truncate text-[11px] text-[#94A3B8]">{kind === "full" ? "Completa" : planOf(row)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="truncate font-medium text-[#F8FAFC]">{row.account.email}</p>
                      <SecretValue value={row.account.password} />
                    </td>
                    {kind === "full" ? (
                      <>
                        <td className="px-3 py-2.5">
                          <ClientBadge
                            row={row}
                            assigned={assigned}
                            onOccupied={(slot) => setDrawer({ row, slot })}
                            onFree={(slot) => setAssign({ row, slot: slot.index })}
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <ExpiryDateInput
                            iso={row.account.expiresAt ?? ""}
                            onCommit={(value) => saveExpiry(row.account, value)}
                          />
                        </td>
                        <td className={`px-3 py-2.5 font-semibold ${healthClass[health.tone]}`}>
                          {health.days === null ? "—" : health.days}
                        </td>
                        <td className="px-3 py-2.5">
                          <HealthBadge health={fullAccountBadge(row, health)} />
                        </td>
                        <td className="px-3 py-2.5">
                          <SupplierCell account={row.account} />
                        </td>
                        <td className="px-3 py-2.5">
                          <ExpiryDateInput
                            iso={row.account.supplierExpiresAt ?? ""}
                            onCommit={(value) => saveSupplierExpiry(row.account, value)}
                          />
                        </td>
                        <td className={`px-3 py-2.5 font-semibold ${healthClass[supplierHealth.tone]}`}>
                          {row.account.supplierExpiresAt ? supplierHealth.days : "—"}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2.5">
                          <ProfilePills
                            row={row}
                            onOccupied={(slot) => setDrawer({ row, slot })}
                            onFree={(slot) => setAssign({ row, slot: slot.index })}
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <ExpiryDateInput
                            iso={row.account.expiresAt ?? end?.slice(0, 10) ?? ""}
                            onCommit={(value) => saveExpiry(row.account, value)}
                          />
                        </td>
                        <td className={`px-3 py-2.5 font-semibold ${healthClass[health.tone]}`}>
                          {health.days === null ? "—" : health.days}
                        </td>
                        <td className="px-3 py-2.5">
                          <HealthBadge health={health} />
                        </td>
                      </>
                    )}
                    <td className="relative px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="rounded-lg bg-[#F8FAFC] px-3 py-1.5 text-[11px] font-semibold text-[#0B111C]"
                          onClick={() => setAccountForm(row.account)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="rounded p-1 text-[#94A3B8] hover:text-white"
                          onClick={() => setMenu(menu === row.account.id ? null : row.account.id)}
                        >
                          <MoreIcon className="h-4 w-4" />
                        </button>
                      </div>
                      {menu === row.account.id ? (
                        <div className="absolute right-3 z-40 w-36 rounded-lg border border-[#253047] bg-[#111827] py-1 text-xs">
                          <button
                            type="button"
                            className="block w-full px-3 py-1.5 text-left hover:bg-[#172033]"
                            onClick={() => {
                              setAccountForm(row.account);
                              setMenu(null);
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
                              setMenu(null);
                              if (result.ok) router.refresh();
                            }}
                          >
                            Quitar
                          </button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="hidden items-center justify-between gap-3 md:flex">
        <p className="text-xs text-[#94A3B8]">
          {visible.length === 0
            ? "Sin cuentas para mostrar"
            : `Mostrando ${paged.length} de ${visible.length} cuentas`}
        </p>
        {pageCount > 1 ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="rounded-lg border border-[#253047] p-1.5 text-[#94A3B8] disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => setPage((item) => Math.max(1, item - 1))}
              aria-label="Anterior"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPage(item)}
                className={`min-w-8 rounded-lg px-2 py-1 text-xs font-semibold ${
                  page === item ? "bg-[#2563EB] text-white" : "text-[#94A3B8] hover:bg-[#172033]"
                }`}
              >
                {item}
              </button>
            ))}
            <button
              type="button"
              className="rounded-lg border border-[#253047] p-1.5 text-[#94A3B8] disabled:opacity-40"
              disabled={page >= pageCount}
              onClick={() => setPage((item) => Math.min(pageCount, item + 1))}
              aria-label="Siguiente"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>

      <div className="space-y-2 md:hidden">
        {visible.length === 0 ? (
          <p className="rounded-xl border border-[#253047] px-3 py-8 text-center text-sm text-[#94A3B8]">
            No hay cuentas con ese filtro.
          </p>
        ) : (
          paged.map((row) => {
            const end = inventoryEndDate(row);
            const health = inventoryHealth(end);
            const supplierHealth = inventoryHealth(row.account.supplierExpiresAt);
            const assigned = assignedSlot(row);
            return (
              <article key={row.account.id} className="rounded-xl border border-[#253047] bg-[#111827] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <PlatformLogo platform={platformOf(row.account.platformId) ?? row.account.platformId} size={28} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#F8FAFC]">{nameOf(row.account.platformId)}</p>
                      <p className="truncate text-[11px] text-[#94A3B8]">{kind === "full" ? "Completa" : planOf(row)}</p>
                    </div>
                  </div>
                  <HealthBadge health={kind === "full" ? fullAccountBadge(row, health) : health} />
                </div>
                <p className="mt-2 truncate text-xs text-[#F8FAFC]">{row.account.email}</p>
                <SecretValue value={row.account.password} />
                {kind === "full" ? (
                  <>
                    <div className="mt-2">
                      <ClientBadge
                        row={row}
                        assigned={assigned}
                        onOccupied={(slot) => setDrawer({ row, slot })}
                        onFree={(slot) => setAssign({ row, slot: slot.index })}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                      <ExpiryDateInput
                        iso={row.account.expiresAt ?? ""}
                        onCommit={(value) => saveExpiry(row.account, value)}
                      />
                      <span className={`font-semibold ${healthClass[health.tone]}`}>
                        {health.days === null ? "—" : `${health.days}d`}
                      </span>
                    </div>
                    <div className="mt-2">
                      <SupplierCell account={row.account} />
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                      <ExpiryDateInput
                        iso={row.account.supplierExpiresAt ?? ""}
                        onCommit={(value) => saveSupplierExpiry(row.account, value)}
                      />
                      <span className={`font-semibold ${healthClass[supplierHealth.tone]}`}>
                        {row.account.supplierExpiresAt ? `${supplierHealth.days}d` : "—"}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mt-2">
                      <ProfilePills
                        row={row}
                        onOccupied={(slot) => setDrawer({ row, slot })}
                        onFree={(slot) => setAssign({ row, slot: slot.index })}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                      <ExpiryDateInput
                        iso={row.account.expiresAt ?? end?.slice(0, 10) ?? ""}
                        onCommit={(value) => saveExpiry(row.account, value)}
                      />
                      <span className={`font-semibold ${healthClass[health.tone]}`}>
                        {health.days === null ? "—" : `${health.days}d`}
                      </span>
                    </div>
                  </>
                )}
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    className="flex-1 rounded-lg bg-[#F8FAFC] py-1.5 text-xs font-semibold text-[#0B111C]"
                    onClick={() => setAccountForm(row.account)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-[#253047] px-3 py-1.5 text-xs text-[#EF4444]"
                    onClick={async () => {
                      const result = await deleteStreamingAccountAction(row.account.id);
                      setMessage(result.ok ? "Cuenta quitada." : result.error ?? "No se pudo quitar");
                      if (result.ok) router.refresh();
                    }}
                  >
                    Quitar
                  </button>
                </div>
              </article>
            );
          })
        )}
        {visible.length > 0 ? (
          <p className="text-center text-[11px] text-[#94A3B8]">
            Mostrando {paged.length} de {visible.length}
          </p>
        ) : null}
      </div>

      {accountForm !== null ? (
      <AccountForm
        key={accountForm === "new" ? "new" : accountForm.id}
        editing={accountForm !== "new" ? accountForm : null}
        defaultKind={kind === "full" ? "full" : "profiles"}
        platforms={platforms}
        products={products}
        offerLinks={offerLinks}
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
          plantillas={plantillas}
          onClose={() => setDrawer(null)}
          onMessage={setMessage}
          onEdit={() => {
            if (!drawer.slot.service) return;
            setAssign({ row: drawer.row, slot: drawer.slot.index });
            setDrawer(null);
          }}
        />
      ) : null}
    </div>
  );
}

export function accountToForm(account: StreamingAccount, extra?: Partial<{ expiresAt: string; supplierExpiresAt: string }>) {
  const form = new FormData();
  form.set("id", account.id);
  form.set("platformId", account.platformId);
  form.set("email", account.email);
  form.set("password", account.password);
  form.set("label", account.label);
  form.set("maxProfiles", String(account.maxProfiles));
  form.set("status", account.status);
  form.set("expiresAt", extra?.expiresAt ?? account.expiresAt ?? "");
  form.set("supplierName", account.supplierName);
  form.set("supplierContact", account.supplierContact);
  form.set("supplierCost", String(account.supplierCost || 0));
  form.set("supplierNote", account.supplierNote);
  form.set("supplierExpiresAt", extra?.supplierExpiresAt ?? account.supplierExpiresAt ?? "");
  form.set("saleKind", account.saleKind ?? "profiles");
  form.set("resellerName", account.resellerName ?? "");
  form.set("resellerWhatsapp", account.resellerWhatsapp ?? "");
  return form;
}

export function ExpiryDateInput({
  iso,
  name,
  onCommit,
  className = "rounded-lg border border-[#253047] bg-[#0B111C] px-2 py-1 pr-8 text-[11px] text-[#F8FAFC]",
}: {
  iso: string;
  name?: string;
  onCommit?: (iso: string) => void;
  className?: string;
}) {
  const [text, setText] = useState(iso ? isoToDayMonthYear(iso) : "");
  const isoValue = dayMonthYearToIso(text) || iso;
  const fillsWidth = className.includes("w-full");
  const hasMinWidth = className.includes("min-w-");

  function applyIso(next: string) {
    if (!next) return;
    setText(isoToDayMonthYear(next));
    onCommit?.(next);
  }

  return (
    <span className={`relative inline-flex items-center ${fillsWidth ? "w-full" : hasMinWidth ? "" : "min-w-[9.5rem]"}`}>
      {name ? <input type="hidden" name={name} value={isoValue} /> : null}
      <input
        type="text"
        inputMode="numeric"
        placeholder="DD/MM/AAAA"
        value={text}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          const parsed = dayMonthYearToIso(next);
          if (parsed && name) onCommit?.(parsed);
        }}
        onBlur={() => {
          const parsed = dayMonthYearToIso(text);
          if (!parsed) {
            setText(iso ? isoToDayMonthYear(iso) : "");
            return;
          }
          applyIso(parsed);
        }}
        className={className}
      />
      <input
        type="date"
        value={isoValue}
        aria-label="Abrir calendario"
        onChange={(event) => applyIso(event.target.value)}
        className="absolute top-1/2 right-1 h-6 w-6 -translate-y-1/2 cursor-pointer opacity-0"
      />
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="pointer-events-none absolute top-1/2 right-1.5 h-3.5 w-3.5 -translate-y-1/2 text-[#94A3B8]"
        aria-hidden="true"
      >
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M8 3v4M16 3v4M4 10h16" />
      </svg>
    </span>
  );
}

export function SecretValue({ value, className = "mt-0.5" }: { value: string; className?: string }) {
  const [open, setOpen] = useState(false);
  if (!value) return <p className="text-[11px] text-[#64748B]">Sin clave</p>;
  return (
    <div className={`flex items-center gap-0.5 text-[11px] text-[#94A3B8] ${className}`}>
      <span className="font-mono tracking-widest">{open ? value : "••••••••"}</span>
      <button type="button" className="rounded p-0.5 hover:text-white" onClick={() => setOpen((item) => !item)} aria-label="Ver clave">
        <EyeIcon className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className="rounded p-0.5 hover:text-white"
        aria-label="Copiar"
        onClick={() => navigator.clipboard.writeText(value)}
      >
        <CopyIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function assignedSlot(row: InventoryAccountRow) {
  return row.slots.find((slot) => slot.service || slot.customer) ?? row.slots[0] ?? null;
}

function fullAccountBadge(row: InventoryAccountRow, health: ReturnType<typeof inventoryHealth>) {
  if (row.usedCount === 0 && health.tone !== "bad" && health.tone !== "warn" && health.days !== 1) {
    return { ...health, tone: "free" as const, label: "Disponible" };
  }
  return health;
}

function ClientBadge({
  row,
  assigned,
  onOccupied,
  onFree,
}: {
  row: InventoryAccountRow;
  assigned: ProfileSlot | null;
  onOccupied: (slot: ProfileSlot) => void;
  onFree: (slot: ProfileSlot) => void;
}) {
  const slot = assigned ?? row.slots[0];
  const name = slot?.customer?.name || parseProfileSlot(slot?.service?.accessProfile).name;
  const occupied = Boolean(slot?.service);
  return (
    <button
      type="button"
      onClick={() => {
        if (!slot) return;
        if (occupied) onOccupied(slot);
        else onFree(slot);
      }}
      className="rounded-md border border-[#253047] bg-[#172033] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#F8FAFC] uppercase"
    >
      {occupied || name ? name || "Cliente" : "LIBRE"}
    </button>
  );
}

function SupplierCell({ account }: { account: StreamingAccount }) {
  if (!account.supplierName && !account.supplierContact) {
    return <span className="text-[#94A3B8]">—</span>;
  }
  const phone = account.supplierContact.replace(/\D/g, "");
  return (
    <div className="min-w-0">
      <p className="truncate font-medium text-[#F8FAFC]">{account.supplierName || "Proveedor"}</p>
      {phone ? (
        <a
          href={waLink(account.supplierContact, "")}
          target="_blank"
          rel="noreferrer"
          className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-[#22C55E] hover:underline"
        >
          <WhatsAppIcon className="h-3.5 w-3.5" />
          {account.supplierContact}
        </a>
      ) : account.supplierContact ? (
        <p className="truncate text-[11px] text-[#94A3B8]">{account.supplierContact}</p>
      ) : null}
    </div>
  );
}

export function HealthBadge({ health }: { health: { tone: keyof typeof badgeClass; label: string } }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeClass[health.tone]}`}>
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          health.tone === "ok"
            ? "bg-[#22C55E]"
            : health.tone === "warn"
              ? "bg-[#F59E0B]"
              : health.tone === "bad"
                ? "bg-[#EF4444]"
                : health.tone === "free"
                  ? "bg-[#3B82F6]"
                  : "bg-[#64748B]"
        }`}
      />
      {health.label}
    </span>
  );
}

function ProfilePills({
  row,
  onOccupied,
  onFree,
}: {
  row: InventoryAccountRow;
  onOccupied: (slot: ProfileSlot) => void;
  onFree: (slot: ProfileSlot) => void;
}) {
  const occupied = row.slots.filter((slot) => slot.service);
  const free = row.slots.filter((slot) => !slot.service);
  const shown = occupied.slice(0, 4);
  const extra = occupied.length - shown.length;
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((slot) => {
        const parsed = parseProfileSlot(slot.service?.accessProfile);
        const label = parsed.name || slot.customer?.name || `P${slot.index}`;
        const tone = slotTone(slot.service);
        return (
          <button
            key={slot.index}
            type="button"
            onClick={() => onOccupied(slot)}
            className={`max-w-[7rem] truncate rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${cellClass[tone]}`}
          >
            {label}
          </button>
        );
      })}
      {extra > 0 ? (
        <span className="rounded-md border border-[#253047] px-1.5 py-0.5 text-[10px] text-[#94A3B8]">+{extra}</span>
      ) : null}
      {free.map((slot) => (
        <button
          key={slot.index}
          type="button"
          onClick={() => onFree(slot)}
          className="rounded-md border border-[#8B5CF6]/40 px-1.5 py-0.5 text-[10px] font-semibold text-[#C4B5FD]"
        >
          +
        </button>
      ))}
    </div>
  );
}

function KindTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
        active ? "bg-[#2563EB] text-white shadow-[0_8px_20px_rgba(37,99,235,0.28)]" : "border border-[#253047] bg-[#111827] text-[#94A3B8]"
      }`}
    >
      {label}
    </button>
  );
}

function FilterRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
      <span className="shrink-0 text-[11px] font-medium text-[#94A3B8]">{label}</span>
      <div className="flex items-center gap-1.5">{children}</div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
  platform,
  icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  platform?: Platform;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
        active ? "border-[#2563EB] bg-[#2563EB] text-white" : "border-[#253047] bg-[#0B111C] text-[#94A3B8]"
      }`}
    >
      {platform ? <PlatformLogo platform={platform} size="filter" /> : null}
      {label}
      {icon}
    </button>
  );
}

export function AccountForm({
  editing,
  platforms,
  products = [],
  offerLinks = [],
  defaultKind = "profiles",
  onClose,
  onMessage,
}: {
  editing: StreamingAccount | null;
  platforms: Platform[];
  products?: Product[];
  offerLinks?: StoreOfferLink[];
  defaultKind?: "profiles" | "full";
  onClose: () => void;
  onMessage: (value: string | null) => void;
}) {
  const router = useRouter();
  const [expiresAt, setExpiresAt] = useState(editing?.expiresAt ?? "");
  const [supplierExpiresAt, setSupplierExpiresAt] = useState(editing?.supplierExpiresAt ?? "");
  const [kind, setKind] = useState<"profiles" | "full">(
    editing?.saleKind ?? (editing ? (editing.maxProfiles <= 1 || /completa/i.test(editing.label) ? "full" : "profiles") : defaultKind),
  );
  const [platformId, setPlatformId] = useState(editing?.platformId ?? platforms.find((item) => item.available)?.id ?? "");
  const offers = groupProductOffers(products.filter((item) => item.platformId === platformId && item.active));
  const linkedName =
    editing ? offerLinks.find((item) => item.accountId === editing.id)?.productName ?? "" : "";
  const days = expiresAt ? daysRemaining(expiresAt) : null;
  const health = inventoryHealth(expiresAt || null);
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
      <button type="button" className="h-full flex-1" aria-label="Cerrar" onClick={onClose} />
      <aside className="h-full w-full max-w-md overflow-y-auto border-l border-[#253047] bg-[#0B111C] p-5 text-sm">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-[#F8FAFC]">{editing ? "Editar cuenta" : "Agregar cuenta"}</h2>
          <button type="button" className="text-[#94A3B8]" onClick={onClose} aria-label="Cerrar">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        <form
          key={editing?.id ?? "new"}
          className="space-y-3"
          action={async (formData) => {
            if (editing) formData.set("id", editing.id);
            if (kind === "full") {
              formData.set("maxProfiles", "1");
              formData.set("saleKind", "full");
            } else {
              const max = Number(formData.get("maxProfiles") || 5);
              formData.set("maxProfiles", String(Math.max(2, max)));
              formData.set("saleKind", "profiles");
            }
            const result = await upsertStreamingAccountAction(formData);
            onMessage(result.ok ? "Cuenta guardada." : result.error ?? "No se pudo guardar");
            if (result.ok) {
              onClose();
              router.refresh();
            }
          }}
        >
          <p className="text-xs font-semibold tracking-[0.16em] text-[#94A3B8] uppercase">Información de la cuenta</p>
          <div>
            <p className="text-xs text-[#94A3B8]">Tipo de cuenta</p>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setKind("profiles")}
                className={`rounded-xl border px-3 py-2.5 text-left text-xs font-semibold ${
                  kind === "profiles"
                    ? "border-[#8B5CF6] bg-[#8B5CF6]/15 text-[#F8FAFC]"
                    : "border-[#253047] text-[#94A3B8]"
                }`}
              >
                Cuenta compartida
                <span className="mt-0.5 block text-[10px] font-normal text-[#94A3B8]">Varios espacios (P1, P2…)</span>
              </button>
              <button
                type="button"
                onClick={() => setKind("full")}
                className={`rounded-xl border px-3 py-2.5 text-left text-xs font-semibold ${
                  kind === "full"
                    ? "border-[#8B5CF6] bg-[#8B5CF6]/15 text-[#F8FAFC]"
                    : "border-[#253047] text-[#94A3B8]"
                }`}
              >
                Cuenta completa
                <span className="mt-0.5 block text-[10px] font-normal text-[#94A3B8]">Un solo cliente</span>
              </button>
            </div>
          </div>
          <label className="block text-xs text-[#94A3B8]">
            Plataforma
            <select
              name="platformId"
              value={platformId}
              onChange={(event) => setPlatformId(event.target.value)}
              className="ui-field mt-1"
            >
              {platforms.filter((item) => item.available).map((item) => (
                <option key={item.id} value={item.id}>{platformDisplayName(item)}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-[#94A3B8]">
            Plan / etiqueta
            <input
              name="label"
              defaultValue={editing?.label ?? ""}
              placeholder="Premium, Estándar, compartida..."
              className="ui-field mt-1"
            />
          </label>
          <label className="block text-xs text-[#94A3B8]">
            Correo o usuario
            <input name="email" defaultValue={editing?.email} placeholder="correo@cuenta.com" className="ui-field mt-1" />
          </label>
          <label className="block text-xs text-[#94A3B8]">
            Clave de la cuenta
            <input name="password" defaultValue={editing?.password} placeholder="Clave" className="ui-field mt-1" />
          </label>
          {kind === "full" ? (
            <input type="hidden" name="maxProfiles" value="1" />
          ) : (
            <label className="block text-xs text-[#94A3B8]">
              Perfiles máximos
              <input name="maxProfiles" type="number" min={2} max={8} defaultValue={editing && editing.maxProfiles > 1 ? editing.maxProfiles : 5} className="ui-field mt-1" />
            </label>
          )}
          <label className="block text-xs text-[#94A3B8]">
            Vencimiento
            <ExpiryDateInput
              name="expiresAt"
              iso={expiresAt}
              onCommit={setExpiresAt}
              className="ui-field mt-1 w-full pr-8"
            />
          </label>
          <p className={`text-xs font-semibold ${healthClass[health.tone]}`}>
            {days === null ? "Días restantes: —" : `Días restantes: ${days}`}
          </p>
          <select name="status" defaultValue={editing?.status ?? "available"} className="ui-field">
            <option value="available">Disponible</option>
            <option value="inactive">Inactiva</option>
            <option value="full">Llena</option>
          </select>

          {kind === "full" ? (
            <div className="rounded-xl border border-[#253047] p-3">
              <p className="text-xs font-semibold tracking-[0.16em] text-[#94A3B8] uppercase">Vendedor / revendedor</p>
              <label className="mt-2 block text-xs text-[#94A3B8]">
                Nombre
                <input name="resellerName" defaultValue={editing?.resellerName} placeholder="Nombre" className="ui-field mt-1" />
              </label>
              <label className="mt-2 block text-xs text-[#94A3B8]">
                WhatsApp
                <WhatsAppInput name="resellerWhatsapp" defaultValue={editing?.resellerWhatsapp ?? ""} />
              </label>
            </div>
          ) : null}

          <div className="rounded-xl border border-[#253047] p-3">
            <p className="text-xs font-semibold tracking-[0.16em] text-[#94A3B8] uppercase">Tienda</p>
            <p className="mt-1 text-[11px] text-[#64748B]">Asocia esta cuenta a un producto ya publicado. No crea cuentas falsas.</p>
            {offers.length ? (
              <label className="mt-2 block text-xs text-[#94A3B8]">
                Producto en tienda
                <select name="linkProductName" defaultValue={linkedName} className="ui-field mt-1">
                  <option value="">Sin asociar</option>
                  {offers.map((offer) => (
                    <option key={offer.id} value={offer.name}>
                      {offer.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <>
                <input type="hidden" name="linkProductName" value="" />
                <p className="mt-2 text-xs text-[#F59E0B]">No hay producto de esta plataforma. Publícalo en Productos y luego asócialo aquí.</p>
              </>
            )}
          </div>

          <div className="rounded-xl border border-[#253047] p-3">
            <p className="text-xs font-semibold tracking-[0.16em] text-[#94A3B8] uppercase">Datos del proveedor (opcional)</p>
            <p className="mt-1 text-[11px] text-[#64748B]">Solo tú lo ves. El cliente nunca ve esta información.</p>
            <label className="mt-3 block text-xs text-[#94A3B8]">
              Proveedor
              <input name="supplierName" defaultValue={editing?.supplierName} placeholder="Nombre" className="ui-field mt-1" />
            </label>
            <label className="mt-2 block text-xs text-[#94A3B8]">
              Contacto
              <input name="supplierContact" defaultValue={editing?.supplierContact} placeholder="WhatsApp / Telegram" className="ui-field mt-1" />
            </label>
            <label className="mt-2 block text-xs text-[#94A3B8]">
              Vencimiento del proveedor
              <ExpiryDateInput
                name="supplierExpiresAt"
                iso={supplierExpiresAt}
                onCommit={setSupplierExpiresAt}
                className="ui-field mt-1 w-full pr-8"
              />
            </label>
            <label className="mt-2 block text-xs text-[#94A3B8]">
              Costo de la cuenta
              <input name="supplierCost" type="number" step="0.01" defaultValue={editing?.supplierCost || ""} placeholder="0.00" className="ui-field mt-1" />
            </label>
            <label className="mt-2 block text-xs text-[#94A3B8]">
              Nota
              <textarea name="supplierNote" defaultValue={editing?.supplierNote} rows={2} className="ui-field mt-1" />
            </label>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              Guardar cuenta
            </Button>
          </div>
        </form>
      </aside>
    </div>
  );
}

export function AssignModal({
  row,
  slot,
  customers,
  products,
  onClose,
  onMessage,
}: {
  row: InventoryAccountRow;
  slot: number;
  customers: Customer[];
  products: Product[];
  onClose: () => void;
  onMessage: (value: string | null) => void;
}) {
  const router = useRouter();
  const occupied = row.slots.find((item) => item.index === slot)?.service;
  const [createNew, setCreateNew] = useState(false);
  const [customerId, setCustomerId] = useState(occupied?.customerId ?? customers[0]?.id ?? "");
  const selected = customers.find((item) => item.id === customerId);
  const product = products[0];
  const start = occupied?.startDate.slice(0, 10) ?? "";
  const end = occupied?.endDate.slice(0, 10) ?? "";

  return (
    <Modal open title={`Asignar perfil P${slot}`} onClose={onClose}>
      <form
        className="space-y-2 text-sm"
        action={async (formData) => {
          let cid = String(formData.get("customerId") ?? "");
          if (createNew) {
            const created = await upsertCustomerAction(formData);
            if (!created.ok || !("id" in created) || !created.id) {
              onMessage(created.ok ? "Cliente sin id." : created.error ?? "No se pudo crear el cliente");
              return;
            }
            cid = created.id;
          }
          if (occupied) {
            formData.set("serviceId", occupied.id);
            formData.set("accessProfile", `${slot} · ${String(formData.get("profileName") ?? "").trim()}`);
            const result = await patchInventoryServiceAction(formData);
            onMessage(result.ok ? "Perfil actualizado." : result.error ?? "No se pudo guardar");
            if (result.ok) {
              onClose();
              router.refresh();
            }
            return;
          }
          formData.set("customerId", cid);
          formData.set("accountId", row.account.id);
          formData.set("platformEmail", row.account.email);
          formData.set("accessProfile", `${slot} · ${String(formData.get("profileName") ?? "").trim()}`);
          formData.set("status", "active");
          const result = await upsertServiceAction(formData);
          onMessage(result.ok ? "Perfil asignado." : result.error ?? "No se pudo guardar");
          if (result.ok) {
            onClose();
            router.refresh();
          }
        }}
      >
        <div className="flex gap-2 text-xs">
          <button type="button" className={!createNew ? "text-[#38BDF8]" : "text-[#94A3B8]"} onClick={() => setCreateNew(false)}>
            Buscar existente
          </button>
          <button type="button" className={createNew ? "text-[#38BDF8]" : "text-[#94A3B8]"} onClick={() => setCreateNew(true)}>
            + Crear
          </button>
        </div>
        {createNew ? (
          <>
            <input name="name" placeholder="Nombre" className="ui-field" required />
            <WhatsAppInput name="whatsapp" required />
            <input name="password" type="password" placeholder="Clave de acceso (opcional, mín. 6)" className="ui-field" />
          </>
        ) : (
          <>
            <select name="customerId" value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="ui-field">
              {customers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {whatsappParaMostrar(item.whatsapp)}
                </option>
              ))}
            </select>
            <input readOnly value={selected ? whatsappParaMostrar(selected.whatsapp) : ""} className="ui-field opacity-70" />
          </>
        )}
        <select name="productId" defaultValue={product?.id} className="ui-field" required>
          {products.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} · {item.durationDays}d · {formatCurrency(item.salePrice)}
            </option>
          ))}
        </select>
        <input name="profileName" defaultValue={parseProfileSlot(occupied?.accessProfile).name || selected?.name || ""} placeholder="Perfil" className="ui-field" />
        <input name="accessPassword" defaultValue={occupied?.accessPassword ?? ""} placeholder="PIN" className="ui-field" />
        <input name="salePrice" type="number" step="0.01" defaultValue={occupied?.salePrice ?? product?.salePrice ?? ""} placeholder="Precio" className="ui-field" />
        <div className="grid grid-cols-2 gap-2">
          <input name="startDate" type="date" defaultValue={start} className="ui-field" />
          <input name="endDate" type="date" defaultValue={end} className="ui-field" />
        </div>
        {products.length === 0 ? (
          <p className="text-xs text-[#F59E0B]">Publica un producto de esta plataforma para asignar.</p>
        ) : null}
        <Button type="submit" className="w-full" disabled={products.length === 0}>
          Guardar y entregar
        </Button>
      </form>
    </Modal>
  );
}

export function ProfileDrawer({
  row,
  slot,
  platformName,
  plantillas,
  onClose,
  onMessage,
  onEdit,
}: {
  row: InventoryAccountRow;
  slot: ProfileSlot;
  platformName: string;
  plantillas?: PlantillasWhatsapp;
  onClose: () => void;
  onMessage: (value: string | null) => void;
  onEdit: () => void;
}) {
  const router = useRouter();
  const service = slot.service;
  if (!service) return null;
  const customer = slot.customer;
  const status = serviceStatusFromDates(service.endDate, service.status);
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
      <button type="button" className="h-full flex-1" aria-label="Cerrar" onClick={onClose} />
      <aside className="h-full w-full max-w-sm overflow-y-auto border-l border-[#253047] bg-[#0B111C] p-4 text-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex min-w-0 items-center gap-2 font-semibold text-[#F8FAFC]">
            <PlatformLogo platform={platformName} size="card" />
            <span className="truncate">P{slot.index} · {customer?.name ?? "Cliente"}</span>
          </h2>
          <button type="button" className="text-[#94A3B8]" onClick={onClose}>Cerrar</button>
        </div>
        <dl className="space-y-2 text-[13px]">
          <Info label="Cliente" value={customer?.name ?? "—"} />
          <Info label="WhatsApp" value={customer?.whatsapp ? whatsappParaMostrar(customer.whatsapp) : "—"} />
          <Info label="Correo de la cuenta" value={row.account.email} />
          <Info label="Clave" value={row.account.password || "—"} />
          <Info label="Perfil" value={service.accessProfile || `P${slot.index}`} />
          <Info label="PIN" value={service.accessPassword || "—"} />
          <Info label="Inicio" value={formatDate(service.startDate)} />
          <Info label="Vencimiento" value={`${formatDate(service.endDate)} · ${compactDays(service.endDate)}`} />
          <Info label="Precio" value={formatCurrency(service.salePrice)} />
          <Info label="Estado" value={subscriptionStatusLabel[status]} />
          <Info label="Notas" value={service.notes || "—"} />
        </dl>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {customer?.whatsapp ? (
            <a
              className="rounded-xl border border-[#253047] px-3 py-2 text-center text-xs"
              href={waLink(customer.whatsapp, supportMessage(customer.name, platformName))}
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp
            </a>
          ) : null}
          <a className="rounded-xl border border-[#253047] px-3 py-2 text-center text-xs" href={`/panel/clientes/${service.customerId}`}>
            Cobrar
          </a>
          <a
            className="rounded-xl border border-[#253047] px-3 py-2 text-center text-xs"
            href={service.orderId ? `/panel/pedidos/${service.orderId}` : "/panel/pedidos"}
          >
            Entregar
          </a>
          {customer?.whatsapp ? (
            <a
              className="rounded-xl border border-[#253047] px-3 py-2 text-center text-xs"
              href={waLink(
                customer.whatsapp,
                renewalMessage(customer.name, platformName, formatDate(service.endDate), {
                  dias: daysRemaining(service.endDate),
                  plantillas,
                }),
              )}
              target="_blank"
              rel="noreferrer"
            >
              Renovar
            </a>
          ) : null}
          <button type="button" className="rounded-xl border border-[#253047] px-3 py-2 text-xs" onClick={onEdit}>
            Editar
          </button>
          <button
            type="button"
            className="rounded-xl border border-[#EF4444]/40 px-3 py-2 text-xs text-[#EF4444]"
            onClick={async () => {
              const form = new FormData();
              form.set("serviceId", service.id);
              form.set("free", "1");
              const result = await patchInventoryServiceAction(form);
              onMessage(result.ok ? "Perfil liberado." : result.error ?? "No se pudo liberar");
              if (result.ok) {
                onClose();
                router.refresh();
              }
            }}
          >
            Liberar perfil
          </button>
        </div>
      </aside>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-[#253047] py-1.5">
      <dt className="text-[#94A3B8]">{label}</dt>
      <dd className="text-right text-[#F8FAFC]">{value}</dd>
    </div>
  );
}
