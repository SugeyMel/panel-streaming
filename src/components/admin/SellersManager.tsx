"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { setSellerStatusAction, upsertSellerAction } from "@/app/actions/business";
import {
  BanIcon,
  BellIcon,
  ChatIcon,
  CheckIcon,
  ChevronDownIcon,
  ClockIcon,
  DollarIcon,
  FilterIcon,
  MoreIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  StarIcon,
  UsersIcon,
  WhatsAppIcon,
} from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { ConfirmationDialog, Modal } from "@/components/ui/Modal";
import { RegisteredFlash } from "@/components/ui/RegisteredFlash";
import { WhatsAppInput } from "@/components/ui/WhatsAppInput";
import { whatsappParaMostrar } from "@/lib/clientes";
import { sellerStatusLabel } from "@/lib/format";
import type { Seller, SellerStatus } from "@/lib/types";
import { waLink } from "@/lib/whatsapp";

const AVATAR = ["bg-[#2563EB]", "bg-[#7C3AED]", "bg-[#DB2777]", "bg-[#0D9488]", "bg-[#64748B]"] as const;

type FilterKey = "todos" | SellerStatus;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "activo", label: "Activos" },
  { key: "pendiente", label: "Pendientes" },
  { key: "suspendido", label: "Suspendidos" },
  { key: "desactivado", label: "Desactivados" },
];

export function SellersManager({ sellers }: { sellers: Seller[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("todos");
  const [filterOpen, setFilterOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Seller | null>(null);
  const [confirm, setConfirm] = useState<Seller | null>(null);
  const [cobro, setCobro] = useState<Seller | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);

  const activos = sellers.filter((item) => item.status === "activo").length;
  const rentalSoon = 0;
  const rentalExpired = 0;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sellers.filter((seller) => {
      if (filter !== "todos" && seller.status !== filter) return false;
      if (!q) return true;
      return `${seller.name} ${seller.businessName} ${whatsappParaMostrar(seller.whatsapp)} ${seller.whatsapp} ${seller.slug}`
        .toLowerCase()
        .includes(q);
    });
  }, [sellers, query, filter]);

  function startCreate() {
    setEditing(null);
    setOpen(true);
  }

  function startEdit(seller: Seller) {
    setEditing(seller);
    setOpen(true);
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[1.35rem] font-bold tracking-tight text-white lg:text-[1.6rem]">Vendedores</h1>
          <p className="text-[11px] leading-snug text-[#94A3B8] lg:text-sm">
            Gestiona los vendedores y el alquiler del panel
          </p>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="inline-flex h-9 shrink-0 items-center gap-1 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#7C3AED] px-3 text-[12px] font-semibold text-white lg:h-10 lg:px-4 lg:text-sm"
        >
          <PlusIcon className="h-4 w-4" />
          Crear vendedor
        </button>
      </div>

      <div className="grid grid-cols-4 gap-1.5 lg:gap-3">
        <StatCard
          value={sellers.length}
          label="Vendedores totales"
          icon={<UsersIcon className="h-3.5 w-3.5" />}
          iconClass="bg-[#1E3A8A] text-[#93C5FD]"
          cardClass="bg-[#172554]/70"
        />
        <StatCard
          value={activos}
          label="Activos"
          icon={<CheckIcon className="h-3.5 w-3.5" />}
          iconClass="bg-[#166534] text-[#86EFAC]"
          cardClass="bg-[#052e16]/70"
        />
        <StatCard
          value={rentalSoon}
          label="Por vencer"
          icon={<ClockIcon className="h-3.5 w-3.5" />}
          iconClass="bg-[#854D0E] text-[#FDE68A]"
          cardClass="bg-[#422006]/70"
        />
        <StatCard
          value={rentalExpired}
          label="Vencidos"
          icon={<BanIcon className="h-3.5 w-3.5" />}
          iconClass="bg-[#7F1D1D] text-[#FCA5A5]"
          cardClass="bg-[#450a0a]/70"
        />
      </div>

      <div className="flex items-center gap-2">
        <label id="buscar" className="relative min-w-0 flex-1">
          <span className="sr-only">Buscar vendedor</span>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar vendedor, negocio o número..."
            className="h-9 w-full rounded-xl border border-[#253047] bg-[#111827] pr-3 pl-8 text-[12px] text-[#F1F5F9] outline-none placeholder:text-[#64748B] lg:h-10 lg:text-sm"
          />
        </label>
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setFilterOpen((value) => !value)}
            className="inline-flex h-9 items-center gap-1 rounded-xl border border-[#253047] bg-[#111827] px-2.5 text-[12px] font-medium text-[#E2E8F0] lg:h-10 lg:px-3 lg:text-sm"
          >
            <FilterIcon className="h-3.5 w-3.5 text-[#94A3B8]" />
            Filtrar
            <ChevronDownIcon className="h-3.5 w-3.5 text-[#64748B]" />
          </button>
          {filterOpen ? (
            <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-[#253047] bg-[#111827] py-1 shadow-[0_12px_32px_rgba(0,0,0,0.4)]">
              {FILTERS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`block w-full px-3 py-2 text-left text-sm ${
                    filter === item.key ? "bg-[#172033] text-white" : "text-[#E2E8F0] hover:bg-[#172033]"
                  }`}
                  onClick={() => {
                    setFilter(item.key);
                    setFilterOpen(false);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {message ? <p className="text-xs text-[#67E8F9]">{message}</p> : null}

      {rows.length === 0 ? (
        <p className="rounded-xl border border-[#253047] bg-[#111827] px-3 py-8 text-center text-sm text-[#64748B]">
          No hay vendedores con ese filtro.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((seller, index) => (
            <SellerCard
              key={seller.id}
              seller={seller}
              color={AVATAR[index % AVATAR.length]}
              onEdit={() => startEdit(seller)}
              onSuspend={() => setConfirm(seller)}
              onCobro={() => setCobro(seller)}
            />
          ))}
        </div>
      )}

      <Modal open={open} title={editing ? "Editar vendedor" : "Crear vendedor"} onClose={() => setOpen(false)}>
        <form
          className="space-y-3"
          action={async (formData) => {
            const wasCreate = !editing;
            if (editing) formData.set("id", editing.id);
            const result = await upsertSellerAction(formData);
            setMessage(result.ok ? "Guardado." : result.error ?? "No se pudo guardar");
            if (result.ok) {
              setOpen(false);
              router.refresh();
              if (wasCreate) setRegistered(true);
            }
          }}
        >
          <input name="name" defaultValue={editing?.name} placeholder="Nombre" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
          <input name="businessName" defaultValue={editing?.businessName} placeholder="Negocio" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
          <input name="slug" defaultValue={editing?.slug} placeholder="slug" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
          <input name="email" defaultValue={editing?.email} placeholder="Correo" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
          <WhatsAppInput name="whatsapp" defaultValue={editing?.whatsapp} required />
          <select name="status" defaultValue={editing?.status ?? "activo"} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <option value="activo">Activo</option>
            <option value="pendiente">Pendiente</option>
            <option value="suspendido">Suspendido</option>
            <option value="desactivado">Desactivado</option>
          </select>
          <Button type="submit" className="w-full">
            Guardar
          </Button>
        </form>
      </Modal>

      <ConfirmationDialog
        open={Boolean(confirm)}
        title={confirm?.status === "activo" ? "Suspender vendedor" : "Activar vendedor"}
        description="Cambia el estado de la cuenta del vendedor. El alquiler del panel se gestiona aparte cuando existan fechas de cobro."
        confirmLabel="Confirmar"
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          if (!confirm) return;
          const next: SellerStatus = confirm.status === "activo" ? "suspendido" : "activo";
          const result = await setSellerStatusAction(confirm.id, next);
          setMessage(result.ok ? "Estado actualizado." : result.error ?? "No se pudo actualizar");
          setConfirm(null);
        }}
      />

      <Modal open={Boolean(cobro)} title="Registrar cobro" onClose={() => setCobro(null)}>
        <p className="text-sm text-[#94A3B8]">
          Aún no hay un registro de cobros de alquiler del panel. Cuando exista, aquí se podrá anotar el pago de{" "}
          <span className="text-white">{cobro?.name}</span>.
        </p>
      </Modal>
      <RegisteredFlash open={registered} onClose={() => setRegistered(false)} />
    </div>
  );
}

function StatCard({
  value,
  label,
  icon,
  iconClass,
  cardClass,
}: {
  value: number;
  label: string;
  icon: ReactNode;
  iconClass: string;
  cardClass: string;
}) {
  return (
    <div className={`rounded-xl border border-[#253047] px-1.5 py-2 lg:px-3 lg:py-3 ${cardClass}`}>
      <span className={`mb-1.5 grid h-6 w-6 place-items-center rounded-lg lg:h-8 lg:w-8 ${iconClass}`}>{icon}</span>
      <p className="text-base font-bold leading-none text-white lg:text-xl">{value}</p>
      <p className="mt-0.5 text-[9px] leading-tight text-[#94A3B8] lg:text-xs">{label}</p>
    </div>
  );
}

function SellerCard({
  seller,
  color,
  onEdit,
  onSuspend,
  onCobro,
}: {
  seller: Seller;
  color: string;
  onEdit: () => void;
  onSuspend: () => void;
  onCobro: () => void;
}) {
  const [more, setMore] = useState(false);
  const initial = (seller.name.trim()[0] ?? "?").toUpperCase();
  const phone = whatsappParaMostrar(seller.whatsapp);
  const suspendLabel = seller.status === "activo" ? "Suspender" : "Activar";

  return (
    <article className="rounded-2xl border border-[#253047] bg-[#111827] p-2.5 lg:p-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex min-w-0 items-start gap-2.5 lg:gap-4">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-semibold text-white lg:h-14 lg:w-14 lg:text-lg ${color}`}>
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white lg:text-base">{seller.name}</p>
              <p className="truncate text-[11px] uppercase tracking-wide text-[#94A3B8] lg:text-sm">{seller.businessName || "Sin negocio"}</p>
              <span
                className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  seller.status === "activo"
                    ? "bg-[#16A34A] text-white"
                    : seller.status === "pendiente"
                      ? "bg-[#2563EB] text-white"
                      : seller.status === "suspendido"
                        ? "bg-[#FBBF24] text-[#1C1917]"
                        : "bg-[#DC2626] text-white"
                }`}
              >
                {sellerStatusLabel[seller.status]}
              </span>
              <p className="mt-1.5 flex items-center gap-1 text-[11px] text-[#CBD5E1] lg:text-sm">
                <WhatsAppIcon className="h-3.5 w-3.5 text-[#25D366]" />
                {phone || "—"}
              </p>
            </div>
            <div className="relative shrink-0">
              <button
                type="button"
                className="grid h-8 w-8 place-items-center rounded-lg text-[#94A3B8] hover:bg-[#172033] hover:text-white"
                aria-label="Más opciones"
                onClick={() => setMore((value) => !value)}
              >
                <MoreIcon className="h-4 w-4" />
              </button>
              {more ? (
                <div className="absolute right-0 z-10 mt-1 w-40 overflow-hidden rounded-xl border border-[#253047] bg-[#0B111C] py-1 shadow-lg">
                  <Link
                    href={`/admin/vendedores/${seller.id}`}
                    className="block px-3 py-2 text-sm text-[#E2E8F0] hover:bg-[#172033]"
                    onClick={() => setMore(false)}
                  >
                    Ver ficha
                  </Link>
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm text-[#E2E8F0] hover:bg-[#172033]"
                    onClick={async () => {
                      if (phone) await navigator.clipboard.writeText(phone);
                      setMore(false);
                    }}
                  >
                    Copiar WhatsApp
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      </div>

      <div className="mt-2.5 rounded-xl bg-[#0B111C]/80 px-2.5 py-2 lg:mt-3">
        <p className="mb-1.5 text-[10px] font-semibold tracking-wide text-[#64748B] uppercase">Alquiler del panel</p>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] lg:text-sm">
          <Row label="Plan" value="—" />
          <Row label="Precio" value="—" />
          <Row label="Próximo cobro" value="—" />
          <Row label="Faltan" value="—" />
        </dl>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5 lg:grid-cols-4">
        <SellerWhatsAppMenu seller={seller} />
        <button
          type="button"
          onClick={onCobro}
          className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-[#7C3AED]/70 bg-[#1E1B4B]/40 px-2 text-[11px] font-medium text-[#DDD6FE] lg:h-9 lg:text-xs"
        >
          <DollarIcon className="h-3.5 w-3.5" />
          Registrar cobro
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-[#38BDF8]/50 bg-transparent px-2 text-[11px] font-medium text-[#7DD3FC] lg:h-9 lg:text-xs"
        >
          <PencilIcon className="h-3.5 w-3.5" />
          Editar
        </button>
        <button
          type="button"
          onClick={onSuspend}
          className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-[#EF4444]/60 bg-transparent px-2 text-[11px] font-medium text-[#FCA5A5] lg:h-9 lg:text-xs"
        >
          <BanIcon className="h-3.5 w-3.5" />
          {suspendLabel}
        </button>
      </div>
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-[#64748B]">{label}</dt>
      <dd className="font-medium text-[#E2E8F0]">{value}</dd>
    </div>
  );
}

const WA_ITEMS: Array<{
  key: string;
  label: string;
  Icon: typeof BellIcon;
  message: (name: string) => string;
}> = [
  {
    key: "remind",
    label: "Recordar próximo vencimiento",
    Icon: BellIcon,
    message: (name) =>
      `Hola ${name}, te recuerdo el alquiler del panel. Aún no hay una fecha de cobro registrada.`,
  },
  {
    key: "today",
    label: "Avisar que vence hoy",
    Icon: ClockIcon,
    message: (name) => `Hola ${name}, te aviso por el alquiler del panel. Todavía no hay vencimiento cargado.`,
  },
  {
    key: "expired",
    label: "Avisar servicio vencido",
    Icon: StarIcon,
    message: (name) => `Hola ${name}, te contacto por el alquiler del panel. No hay un vencimiento registrado.`,
  },
  {
    key: "pay",
    label: "Solicitar pago de renovación",
    Icon: DollarIcon,
    message: (name) => `Hola ${name}, te escribo para la renovación del alquiler del panel.`,
  },
  {
    key: "confirm",
    label: "Confirmar pago recibido",
    Icon: CheckIcon,
    message: (name) => `Hola ${name}, confirmamos que recibimos tu pago del alquiler del panel.`,
  },
  {
    key: "custom",
    label: "Mensaje personalizado",
    Icon: ChatIcon,
    message: (name) => `Hola ${name}, `,
  },
];

function SellerWhatsAppMenu({ seller }: { seller: Seller }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const enabled = Boolean(whatsappParaMostrar(seller.whatsapp));

  function send(text: string) {
    const href = waLink(seller.whatsapp, text);
    window.open(href, "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        disabled={!enabled}
        onClick={() => enabled && setOpen((value) => !value)}
        className="inline-flex h-8 w-full items-center justify-center gap-1 rounded-lg bg-[#16A34A] px-2 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#1F2937] disabled:text-[#64748B] lg:h-9 lg:text-xs"
      >
        <WhatsAppIcon className="h-3.5 w-3.5" />
        WhatsApp
        <ChevronDownIcon className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <div className="absolute bottom-full left-0 z-30 mb-1 w-[16.5rem] overflow-hidden rounded-xl border border-[#253047] bg-[#0B111C] py-1 shadow-[0_12px_32px_rgba(0,0,0,0.45)]">
          {WA_ITEMS.map((item) => {
            const Icon = item.Icon;
            return (
              <button
                key={item.key}
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-[#E2E8F0] hover:bg-[#172033]"
                onClick={() => send(item.message(seller.name))}
              >
                <Icon className="h-3.5 w-3.5 shrink-0 text-[#94A3B8]" />
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}