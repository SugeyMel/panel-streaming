"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteStreamingAccountAction,
  patchInventoryServiceAction,
  upsertCustomerAction,
  upsertServiceAction,
  upsertStreamingAccountAction,
} from "@/app/actions/business";
import { MoreIcon } from "@/components/icons";
import { PlatformLogo, PlatformName } from "@/components/ui/PlatformLogo";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { SearchBar } from "@/components/ui/SearchBar";
import { formatCurrency, formatDate, serviceStatusFromDates, subscriptionStatusLabel } from "@/lib/format";
import { platformDisplayName } from "@/lib/platform-logos";
import {
  buildInventoryRows,
  compactDays,
  parseProfileSlot,
  slotTone,
  type InventoryAccountRow,
  type ProfileSlot,
} from "@/lib/inventory-matrix";
import { renewalMessage, supportMessage, waLink } from "@/lib/whatsapp";
import type { Customer, Platform, Product, StreamingAccount, Subscription } from "@/lib/types";

type FilterId = "all" | "free" | "active" | "expiring" | "expired";
type InventoryKind = "shared" | "full";

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
  const [platformId, setPlatformId] = useState("all");
  const [kind, setKind] = useState<InventoryKind>("shared");
  const [filter, setFilter] = useState<FilterId>("all");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [accountForm, setAccountForm] = useState<StreamingAccount | null | "new">(null);
  const [assign, setAssign] = useState<{ row: InventoryAccountRow; slot: number } | null>(null);
  const [drawer, setDrawer] = useState<{ row: InventoryAccountRow; slot: ProfileSlot } | null>(null);
  const [menu, setMenu] = useState<string | null>(null);

  const sharedRows = useMemo(() => rows.filter((row) => !row.isFullAccount), [rows]);
  const fullRows = useMemo(() => rows.filter((row) => row.isFullAccount), [rows]);
  const scopedRows = kind === "full" ? fullRows : sharedRows;

  const platformCounts = useMemo(() => {
    return platforms
      .filter((item) => item.available)
      .map((platform) => ({
        ...platform,
        count: scopedRows.filter((row) => row.account.platformId === platform.id).length,
      }))
      .filter((item) => item.count > 0);
  }, [platforms, scopedRows]);

  const freeTotal = scopedRows.reduce((sum, row) => sum + row.freeCount, 0);
  const visible = useMemo(() => {
    let list = scopedRows.filter((row) => platformId === "all" || row.account.platformId === platformId);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((row) => {
        const hay = [
          row.account.email,
          row.account.label,
          ...row.slots.flatMap((slot) => [
            slot.customer?.name,
            slot.customer?.whatsapp,
            slot.service?.accessProfile,
            slot.service?.accessPassword,
          ]),
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }
    if (filter === "free") list = list.filter((row) => row.freeCount > 0);
    if (filter === "active") list = list.filter((row) => row.hasActive);
    if (filter === "expiring") list = list.filter((row) => row.hasExpiring);
    if (filter === "expired") list = list.filter((row) => row.hasExpired);
    if (filter === "free") list = [...list].sort((a, b) => b.freeCount - a.freeCount);
    return list;
  }, [filter, platformId, query, scopedRows]);

  const platformOf = (id: string) => platforms.find((item) => item.id === id);
  const nameOf = (id: string) => {
    const platform = platformOf(id);
    return platform ? platformDisplayName(platform) : "—";
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-lg font-semibold text-[#F8FAFC]">Inventario</h1>
        <SearchBar value={query} onChange={setQuery} placeholder="Cliente, teléfono, correo, perfil..." />
        <Button
          className="h-9 min-h-9 px-3 text-xs"
          onClick={() => setAccountForm("new")}
        >
          + {kind === "full" ? "Cuenta completa" : "Cuenta"}
        </Button>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        <FilterChip active={kind === "shared"} onClick={() => { setKind("shared"); setPlatformId("all"); }} label="Perfiles" />
        <FilterChip active={kind === "full"} onClick={() => { setKind("full"); setPlatformId("all"); }} label="Cuentas completas" />
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        <FilterChip active={platformId === "all"} onClick={() => setPlatformId("all")} label={`Todas ${scopedRows.length}`} />
        {platformCounts.map((item) => (
          <FilterChip
            key={item.id}
            active={platformId === item.id}
            onClick={() => setPlatformId(item.id)}
            label={`${platformDisplayName(item)} ${item.count}`}
            platform={item}
          />
        ))}
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="Todas las cuentas" />
        <FilterChip active={filter === "free"} onClick={() => setFilter("free")} label={kind === "full" ? `Sin cliente (${freeTotal})` : `Espacios libres (${freeTotal})`} tone="violet" />
        <FilterChip active={filter === "active"} onClick={() => setFilter("active")} label="Activos" tone="success" />
        <FilterChip active={filter === "expiring"} onClick={() => setFilter("expiring")} label="Por vencer" tone="warning" />
        <FilterChip active={filter === "expired"} onClick={() => setFilter("expired")} label="Vencidos" tone="danger" />
      </div>
      {message ? <p className="text-xs text-[#38BDF8]">{message}</p> : null}

      {kind === "full" ? (
        <FullAccountsTable
          visible={visible}
          menu={menu}
          setMenu={setMenu}
          nameOf={nameOf}
          platformOf={platformOf}
          onAssign={(row) => setAssign({ row, slot: 1 })}
          onOpen={(row, slot) => setDrawer({ row, slot })}
          onEditAccount={(account) => {
            setAccountForm(account);
            setMenu(null);
          }}
          onDelete={async (id) => {
            const result = await deleteStreamingAccountAction(id);
            setMessage(result.ok ? "Cuenta quitada." : result.error ?? "No se pudo quitar");
            setMenu(null);
            if (result.ok) router.refresh();
          }}
        />
      ) : (
      <>
      <div className="hidden max-h-[calc(100vh-13rem)] overflow-auto rounded-xl border border-[#253047] lg:block">
        <table className="min-w-[1100px] w-full border-collapse text-left text-[11px] leading-tight">
          <thead className="sticky top-0 z-20 bg-[#0B111C] text-[#94A3B8]">
            <tr>
              <th className="sticky left-0 z-30 bg-[#0B111C] px-2 py-2 font-medium">Cuenta / correo</th>
              <th className="px-2 py-2 font-medium">Clave</th>
              <th className="px-2 py-2 font-medium">Ocup.</th>
              {["P1", "P2", "P3", "P4", "P5"].map((label) => (
                <th key={label} className="px-1 py-2 font-medium">{label}</th>
              ))}
              <th className="px-2 py-2 font-medium">Vencimiento</th>
              <th className="px-2 py-2 font-medium"> </th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-[#94A3B8]">
                  No hay cuentas con ese filtro.
                </td>
              </tr>
            ) : (
              visible.map((row) => (
                <tr key={row.account.id} className="border-t border-[#253047] hover:bg-[#172033]/60">
                  <td className="sticky left-0 z-10 max-w-[240px] bg-[#070B12] px-2 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <PlatformLogo platform={platformOf(row.account.platformId) ?? row.account.platformId} size="table" />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[#F8FAFC]">{row.account.email}</p>
                        <p className="truncate text-[#94A3B8]">
                          {nameOf(row.account.platformId)} · {row.account.label || "Perfiles"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-1.5 tracking-widest text-[#94A3B8]">••••••</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-[#F8FAFC]">
                    {row.usedCount}/{row.slots.length}{" "}
                    <span className="text-[#94A3B8]">
                      {"●".repeat(row.usedCount)}
                      {"○".repeat(row.freeCount)}
                    </span>
                  </td>
                  {row.isFullAccount ? (
                    <td colSpan={5} className="px-1 py-1">
                      <SlotButton
                        slot={row.slots[0] ?? { index: 1, service: null, customer: null }}
                        onOccupied={() => row.slots[0]?.service && setDrawer({ row, slot: row.slots[0] })}
                        onFree={() => setAssign({ row, slot: 1 })}
                      />
                    </td>
                  ) : (
                    [1, 2, 3, 4, 5].map((n) => {
                      const slot = row.slots.find((item) => item.index === n);
                      if (!slot) {
                        return <td key={n} className="px-1 py-1" />;
                      }
                      return (
                        <td key={n} className="px-1 py-1">
                          <SlotButton
                            slot={slot}
                            onOccupied={() => setDrawer({ row, slot })}
                            onFree={() => setAssign({ row, slot: n })}
                          />
                        </td>
                      );
                    })
                  )}
                  <td className="whitespace-nowrap px-2 py-1.5 text-[#94A3B8]">
                    {row.nearestEnd ? formatDate(row.nearestEnd) : "—"}
                  </td>
                  <td className="relative px-1 py-1.5">
                    <button
                      type="button"
                      className="rounded p-1 text-[#94A3B8] hover:text-white"
                      onClick={() => setMenu(menu === row.account.id ? null : row.account.id)}
                    >
                      <MoreIcon className="h-4 w-4" />
                    </button>
                    {menu === row.account.id ? (
                      <div className="absolute right-2 z-40 w-36 rounded-lg border border-[#253047] bg-[#111827] py-1 text-xs">
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
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 lg:hidden">
        {visible.map((row) => (
          <div key={row.account.id} className="rounded-xl border border-[#253047] bg-[#111827] p-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-[#F8FAFC]">
                <PlatformLogo platform={platformOf(row.account.platformId) ?? row.account.platformId} size="table" />
                <span className="truncate">
                  {nameOf(row.account.platformId)} · {row.usedCount}/{row.slots.length}
                </span>
              </p>
              <p className="text-[10px] text-[#94A3B8]">{row.nearestEnd ? formatDate(row.nearestEnd) : ""}</p>
            </div>
            <p className="truncate text-[11px] text-[#94A3B8]">{row.account.email}</p>
            <div className="mt-2 space-y-1">
              {row.slots.map((slot) => {
                const tone = slotTone(slot.service);
                return (
                  <button
                    key={slot.index}
                    type="button"
                    onClick={() =>
                      slot.service ? setDrawer({ row, slot }) : setAssign({ row, slot: slot.index })
                    }
                    className={`flex w-full items-center justify-between rounded-md border px-2 py-1 text-left text-[11px] ${cellClass[tone]}`}
                  >
                    <span>
                      P{slot.index}{" "}
                      {slot.service
                        ? slot.customer?.name ?? (parseProfileSlot(slot.service.accessProfile).name || "")
                        : "LIBRE"}
                    </span>
                    <span>
                      {slot.service ? compactDays(slot.service.endDate) : "+"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      </>
      )}

      <AccountForm
        open={accountForm !== null}
        editing={accountForm && accountForm !== "new" ? accountForm : null}
        platforms={platforms}
        fullAccount={kind === "full"}
        onClose={() => setAccountForm(null)}
        onMessage={setMessage}
      />
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
    </div>
  );
}

function FullAccountsTable({
  visible,
  menu,
  setMenu,
  nameOf,
  platformOf,
  onAssign,
  onOpen,
  onEditAccount,
  onDelete,
}: {
  visible: InventoryAccountRow[];
  menu: string | null;
  setMenu: (id: string | null) => void;
  nameOf: (id: string) => string;
  platformOf: (id: string) => Platform | undefined;
  onAssign: (row: InventoryAccountRow) => void;
  onOpen: (row: InventoryAccountRow, slot: ProfileSlot) => void;
  onEditAccount: (account: StreamingAccount) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <>
      <div className="hidden max-h-[calc(100vh-13rem)] overflow-auto rounded-xl border border-[#253047] lg:block">
        <table className="w-full min-w-[720px] border-collapse text-left text-[11px] leading-tight">
          <thead className="sticky top-0 z-20 bg-[#0B111C] text-[#94A3B8]">
            <tr>
              <th className="sticky left-0 z-30 bg-[#0B111C] px-2 py-2 font-medium">Cliente</th>
              <th className="px-2 py-2 font-medium">Correo</th>
              <th className="px-2 py-2 font-medium">Clave</th>
              <th className="px-2 py-2 font-medium">Vencimiento</th>
              <th className="px-2 py-2 font-medium"> </th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-[#94A3B8]">
                  No hay cuentas completas. Añade una con 1 perfil.
                </td>
              </tr>
            ) : (
              visible.map((row) => {
                const slot = row.slots[0] ?? { index: 1, service: null, customer: null };
                return (
                  <tr key={row.account.id} className="border-t border-[#253047] hover:bg-[#172033]/60">
                    <td className="sticky left-0 z-10 bg-[#070B12] px-2 py-1.5">
                      <button
                        type="button"
                        className="text-left"
                        onClick={() => (slot.service ? onOpen(row, slot) : onAssign(row))}
                      >
                        <p className={`truncate font-medium ${slot.service ? "text-[#F8FAFC]" : "text-[#38BDF8]"}`}>
                          {slot.customer?.name ?? (slot.service ? "Cliente" : "LIBRE +")}
                        </p>
                        <p className="truncate text-[#94A3B8]">
                          <PlatformName
                            platform={platformOf(row.account.platformId) ?? row.account.platformId}
                            label={nameOf(row.account.platformId)}
                            size="table"
                          />
                        </p>
                      </button>
                    </td>
                    <td className="max-w-[240px] truncate px-2 py-1.5 text-[#F8FAFC]">{row.account.email}</td>
                    <td className="px-2 py-1.5 font-mono text-[#F8FAFC]">{row.account.password || "—"}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-[#94A3B8]">
                      {slot.service ? `${formatDate(slot.service.endDate)} · ${compactDays(slot.service.endDate)}` : "—"}
                    </td>
                    <td className="relative px-1 py-1.5">
                      <button
                        type="button"
                        className="rounded p-1 text-[#94A3B8] hover:text-white"
                        onClick={() => setMenu(menu === row.account.id ? null : row.account.id)}
                      >
                        <MoreIcon className="h-4 w-4" />
                      </button>
                      {menu === row.account.id ? (
                        <div className="absolute right-2 z-40 w-36 rounded-lg border border-[#253047] bg-[#111827] py-1 text-xs">
                          <button
                            type="button"
                            className="block w-full px-3 py-1.5 text-left hover:bg-[#172033]"
                            onClick={() => onEditAccount(row.account)}
                          >
                            Editar cuenta
                          </button>
                          <button
                            type="button"
                            className="block w-full px-3 py-1.5 text-left text-[#EF4444] hover:bg-[#172033]"
                            onClick={() => onDelete(row.account.id)}
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
      <div className="space-y-2 lg:hidden">
        {visible.map((row) => {
          const slot = row.slots[0] ?? { index: 1, service: null, customer: null };
          return (
            <button
              key={row.account.id}
              type="button"
              onClick={() => (slot.service ? onOpen(row, slot) : onAssign(row))}
              className="block w-full rounded-xl border border-[#253047] bg-[#111827] p-2.5 text-left"
            >
              <p className="flex items-center gap-1.5 text-xs font-semibold text-[#F8FAFC]">
                <PlatformLogo platform={platformOf(row.account.platformId) ?? row.account.platformId} size="table" />
                <span className="truncate">
                  {slot.customer?.name ?? "LIBRE"} · {nameOf(row.account.platformId)}
                </span>
              </p>
              <p className="truncate text-[11px] text-[#94A3B8]">{row.account.email}</p>
              <p className="mt-1 font-mono text-[11px] text-[#F8FAFC]">{row.account.password || "—"}</p>
              <p className="text-[11px] text-[#94A3B8]">
                {slot.service ? `${formatDate(slot.service.endDate)} · ${compactDays(slot.service.endDate)}` : "Sin vencimiento"}
              </p>
            </button>
          );
        })}
      </div>
    </>
  );
}

function SlotButton({
  slot,
  onOccupied,
  onFree,
}: {
  slot: ProfileSlot;
  onOccupied: () => void;
  onFree: () => void;
}) {
  const tone = slotTone(slot.service);
  return (
    <button
      type="button"
      onClick={() => (slot.service ? onOccupied() : onFree())}
      className={`flex min-h-9 w-full flex-col items-start justify-center rounded-md border px-1.5 py-0.5 text-left ${cellClass[tone]}`}
    >
      {slot.service ? (
        <>
          <span className="w-full truncate font-medium">
            {slot.customer?.name ?? (parseProfileSlot(slot.service.accessProfile).name || "Cliente")}
          </span>
          <span className="flex w-full items-center justify-between gap-1 text-[10px] opacity-80">
            <span>{slot.service.accessPassword || "—"}</span>
            <span>{compactDays(slot.service.endDate)}</span>
          </span>
        </>
      ) : (
        <>
          <span className="font-semibold">LIBRE</span>
          <span className="text-[10px]">+</span>
        </>
      )}
    </button>
  );
}

function FilterChip({
  label,
  active,
  onClick,
  tone,
  platform,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  tone?: "violet" | "success" | "warning" | "danger";
  platform?: { id?: string; slug?: string; name?: string };
}) {
  const colors = {
    violet: "border-[#8B5CF6] text-[#C4B5FD]",
    success: "border-[#22C55E] text-[#86EFAC]",
    warning: "border-[#F59E0B] text-[#FCD34D]",
    danger: "border-[#EF4444] text-[#FCA5A5]",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${
        active
          ? `bg-[#172033] ${tone ? colors[tone] : "border-[#38BDF8] text-[#F8FAFC]"}`
          : "border-[#253047] text-[#94A3B8]"
      }`}
    >
      {platform ? <PlatformLogo platform={platform} size="filter" /> : null}
      {label}
    </button>
  );
}

function AccountForm({
  open,
  editing,
  platforms,
  fullAccount = false,
  onClose,
  onMessage,
}: {
  open: boolean;
  editing: StreamingAccount | null;
  platforms: Platform[];
  fullAccount?: boolean;
  onClose: () => void;
  onMessage: (value: string | null) => void;
}) {
  const router = useRouter();
  if (!open) return null;
  return (
    <Modal open={open} title={editing ? "Editar cuenta" : "Añadir cuenta"} onClose={onClose}>
      <form
        key={editing?.id ?? "new"}
        className="space-y-3"
        action={async (formData) => {
          if (editing) formData.set("id", editing.id);
          if (fullAccount && !editing) {
            formData.set("maxProfiles", "1");
            if (!String(formData.get("label") ?? "").trim()) formData.set("label", "completa");
          }
          const result = await upsertStreamingAccountAction(formData);
          onMessage(result.ok ? "Cuenta guardada." : result.error ?? "No se pudo guardar");
          if (result.ok) {
            onClose();
            router.refresh();
          }
        }}
      >
        <select name="platformId" defaultValue={editing?.platformId} className="ui-field">
          {platforms.filter((item) => item.available).map((item) => (
            <option key={item.id} value={item.id}>{platformDisplayName(item)}</option>
          ))}
        </select>
        <input name="email" defaultValue={editing?.email} placeholder="Correo / usuario" className="ui-field" />
        <input name="password" defaultValue={editing?.password} placeholder="Clave de la cuenta" className="ui-field" />
        <input
          name="label"
          defaultValue={editing?.label ?? (fullAccount ? "completa" : "")}
          placeholder="Etiqueta (opcional)"
          className="ui-field"
        />
        {fullAccount ? (
          <input type="hidden" name="maxProfiles" value="1" />
        ) : (
          <input name="maxProfiles" type="number" min={1} max={8} defaultValue={editing?.maxProfiles ?? 5} className="ui-field" />
        )}
        <select name="status" defaultValue={editing?.status ?? "available"} className="ui-field">
          <option value="available">Disponible</option>
          <option value="inactive">Inactiva</option>
          <option value="full">Llena</option>
        </select>
        <p className="text-[11px] text-[#94A3B8]">
          {fullAccount
            ? "Cuenta completa: un solo cliente, correo, clave y vencimiento."
            : "5 perfiles = venta por perfil. 1 perfil = cuenta completa."}
        </p>
        <Button type="submit" className="w-full">Guardar</Button>
      </form>
    </Modal>
  );
}

function AssignModal({
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
            <input name="whatsapp" placeholder="WhatsApp" className="ui-field" required />
            <input name="password" type="password" placeholder="Clave de acceso (opcional, mín. 6)" className="ui-field" />
          </>
        ) : (
          <>
            <select name="customerId" value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="ui-field">
              {customers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.whatsapp}
                </option>
              ))}
            </select>
            <input readOnly value={selected?.whatsapp ?? ""} className="ui-field opacity-70" />
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

function ProfileDrawer({
  row,
  slot,
  platformName,
  onClose,
  onMessage,
  onEdit,
}: {
  row: InventoryAccountRow;
  slot: ProfileSlot;
  platformName: string;
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
          <Info label="WhatsApp" value={customer?.whatsapp ?? "—"} />
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
              href={waLink(customer.whatsapp, renewalMessage(customer.name, platformName, formatDate(service.endDate)))}
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
