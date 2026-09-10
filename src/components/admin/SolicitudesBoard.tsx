"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  ChatIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  GearIcon,
  ImageIcon,
  MoreIcon,
  PlusIcon,
  SearchIcon,
  UserIcon,
} from "@/components/icons";
import { Modal } from "@/components/ui/Modal";
import { PlatformLogo } from "@/components/ui/PlatformLogo";

type SolicitudStatus = "pendiente" | "en_proceso" | "resuelta";

type Solicitud = {
  id: string;
  platform: string;
  type: string;
  sellerName: string;
  customerName: string;
  description: string;
  attachments: number;
  comments: number;
  createdAt: string;
  status: SolicitudStatus;
};

const PAGE_SIZE = 10;

const STATUS_META: Record<
  SolicitudStatus,
  { label: string; className: string }
> = {
  pendiente: { label: "Pendiente", className: "bg-[#F59E0B] text-[#1C1917]" },
  en_proceso: { label: "En proceso", className: "bg-[#3B82F6] text-white" },
  resuelta: { label: "Resuelta", className: "bg-[#22C55E] text-white" },
};

const AVATAR: Record<string, string> = {
  Juan: "bg-[#7C3AED]",
  María: "bg-[#2563EB]",
  Carlos: "bg-[#16A34A]",
  Luis: "bg-[#EA580C]",
};

const PLATFORMS = ["Netflix", "Disney+", "HBO MAX", "Prime Video", "Spotify"];
const TYPES = ["Acceso", "Cuenta", "Perfil", "Renovación", "Reproducción"];

const INITIAL: Solicitud[] = [
  {
    id: "ssup_001",
    platform: "Netflix",
    type: "Acceso",
    sellerName: "Juan",
    customerName: "Carlos",
    description: "El cliente reporta que el código temporal no ingresa. ¿Podrías revisarlo?",
    attachments: 1,
    comments: 3,
    createdAt: "2026-09-07T20:42:00-05:00",
    status: "pendiente",
  },
  {
    id: "ssup_002",
    platform: "Disney+",
    type: "Cuenta",
    sellerName: "María",
    customerName: "Ana",
    description: "Necesito restablecer la contraseña porque el cliente no puede entrar.",
    attachments: 2,
    comments: 1,
    createdAt: "2026-09-07T19:15:00-05:00",
    status: "en_proceso",
  },
  {
    id: "ssup_003",
    platform: "HBO MAX",
    type: "Perfil",
    sellerName: "Juan",
    customerName: "Luis",
    description: "El perfil se bloqueó y pide PIN. El cliente no recuerda el código.",
    attachments: 0,
    comments: 5,
    createdAt: "2026-09-07T17:03:00-05:00",
    status: "pendiente",
  },
  {
    id: "ssup_004",
    platform: "Prime Video",
    type: "Acceso",
    sellerName: "Carlos",
    customerName: "Sofía",
    description: "El código de Amazon no llega al correo conectado.",
    attachments: 1,
    comments: 2,
    createdAt: "2026-09-06T23:20:00-05:00",
    status: "resuelta",
  },
  {
    id: "ssup_005",
    platform: "Spotify",
    type: "Renovación",
    sellerName: "María",
    customerName: "Pedro",
    description: "La renovación no se aplicó y el plan aparece vencido.",
    attachments: 3,
    comments: 4,
    createdAt: "2026-09-06T21:40:00-05:00",
    status: "en_proceso",
  },
  {
    id: "ssup_006",
    platform: "Netflix",
    type: "Reproducción",
    sellerName: "Juan",
    customerName: "Carla",
    description: "Netflix muestra error de demasiados dispositivos.",
    attachments: 1,
    comments: 0,
    createdAt: "2026-09-06T20:10:00-05:00",
    status: "pendiente",
  },
  {
    id: "ssup_007",
    platform: "Disney+",
    type: "Cuenta",
    sellerName: "Luis",
    customerName: "Rosa",
    description: "El cliente cambió de celular y ya no reconoce el dispositivo.",
    attachments: 0,
    comments: 2,
    createdAt: "2026-09-06T18:55:00-05:00",
    status: "resuelta",
  },
  {
    id: "ssup_008",
    platform: "HBO MAX",
    type: "Acceso",
    sellerName: "María",
    customerName: "Diego",
    description: "No puede iniciar sesión después de actualizar la app.",
    attachments: 2,
    comments: 1,
    createdAt: "2026-09-06T16:12:00-05:00",
    status: "en_proceso",
  },
  {
    id: "ssup_009",
    platform: "Prime Video",
    type: "Perfil",
    sellerName: "Juan",
    customerName: "Elena",
    description: "Quiere cambiar el perfil infantil a adulto.",
    attachments: 1,
    comments: 3,
    createdAt: "2026-09-05T22:30:00-05:00",
    status: "resuelta",
  },
  {
    id: "ssup_010",
    platform: "Spotify",
    type: "Acceso",
    sellerName: "Carlos",
    customerName: "Mario",
    description: "El código no aparece en el correo del vendedor.",
    attachments: 1,
    comments: 2,
    createdAt: "2026-09-05T20:05:00-05:00",
    status: "pendiente",
  },
  {
    id: "ssup_011",
    platform: "Netflix",
    type: "Cuenta",
    sellerName: "María",
    customerName: "Ana",
    description: "Ya se corrigió el acceso de la cuenta compartida.",
    attachments: 1,
    comments: 2,
    createdAt: "2026-09-05T15:20:00-05:00",
    status: "resuelta",
  },
  {
    id: "ssup_012",
    platform: "Disney+",
    type: "Acceso",
    sellerName: "Juan",
    customerName: "Carlos",
    description: "Se reenvió el código y el cliente ingresó.",
    attachments: 0,
    comments: 1,
    createdAt: "2026-09-04T21:10:00-05:00",
    status: "resuelta",
  },
];

const FIELD =
  "h-10 w-full rounded-lg border border-[#253047] bg-[#111827] px-3 text-sm text-[#E2E8F0] outline-none placeholder:text-[#94A3B8]";

export function SolicitudesBoard() {
  const [items, setItems] = useState(INITIAL);
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState("all");
  const [status, setStatus] = useState<"all" | SolicitudStatus>("all");
  const [page, setPage] = useState(1);
  const [menu, setMenu] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<Solicitud | null>(null);

  const counts = useMemo(
    () => ({
      all: items.length,
      pendiente: items.filter((item) => item.status === "pendiente").length,
      en_proceso: items.filter((item) => item.status === "en_proceso").length,
      resuelta: items.filter((item) => item.status === "resuelta").length,
    }),
    [items],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      if (platform !== "all" && item.platform !== platform) return false;
      if (status !== "all" && item.status !== status) return false;
      if (!needle) return true;
      return [item.sellerName, item.customerName, item.description, item.platform, item.type]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [items, platform, query, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function setStatusFilter(next: "all" | SolicitudStatus) {
    setStatus((current) => (current === next ? "all" : next));
    setPage(1);
  }

  function updateStatus(id: string, next: SolicitudStatus) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, status: next } : item)));
    setMenu(null);
  }

  return (
    <div className="space-y-2.5 pb-6 lg:space-y-4 lg:pb-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-white lg:text-[2rem]">Solicitudes</h1>
          <p className="mt-0.5 truncate text-[11px] text-[#94A3B8] lg:mt-1 lg:text-sm">
            Pedidos de ayuda de vendedores hacia el administrador.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-lg bg-[#7C3AED] px-2.5 text-xs font-semibold text-white hover:bg-[#6D28D9] lg:h-10 lg:rounded-xl lg:px-4 lg:text-sm"
        >
          <PlusIcon className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
          Nueva
          <span className="hidden lg:inline"> solicitud</span>
        </button>
      </div>

      <div className="grid grid-cols-4 gap-1.5 lg:gap-3">
        <StatCard
          icon={<ChatIcon className="h-3.5 w-3.5 lg:h-5 lg:w-5" />}
          iconClass="bg-[#7C3AED]/15 text-[#A78BFA]"
          value={counts.all}
          label="Todas"
          shortLabel="Todas"
          active={false}
          onClick={() => {
            setStatus("all");
            setPage(1);
          }}
        />
        <StatCard
          icon={<ClockIcon className="h-3.5 w-3.5 lg:h-5 lg:w-5" />}
          iconClass="bg-[#F59E0B]/15 text-[#FBBF24]"
          value={counts.pendiente}
          label="Pendientes"
          shortLabel="Pend."
          active={status === "pendiente"}
          onClick={() => setStatusFilter("pendiente")}
        />
        <StatCard
          icon={<GearIcon className="h-3.5 w-3.5 lg:h-5 lg:w-5" />}
          iconClass="bg-[#3B82F6]/15 text-[#60A5FA]"
          value={counts.en_proceso}
          label="En proceso"
          shortLabel="Proceso"
          active={status === "en_proceso"}
          onClick={() => setStatusFilter("en_proceso")}
        />
        <StatCard
          icon={<CheckIcon className="h-3.5 w-3.5 lg:h-5 lg:w-5" />}
          iconClass="bg-[#22C55E]/15 text-[#4ADE80]"
          value={counts.resuelta}
          label="Resueltas"
          shortLabel="Resuel."
          active={status === "resuelta"}
          onClick={() => setStatusFilter("resuelta")}
        />
      </div>

      <div className="rounded-xl border border-[#253047] bg-[#111827] p-2 lg:flex lg:items-center lg:gap-3 lg:rounded-2xl lg:p-3">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Buscar solicitudes</span>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[#64748B] lg:left-3 lg:h-4 lg:w-4" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Buscar vendedor, cliente o texto..."
            className="h-9 w-full rounded-lg border border-[#253047] bg-[#0B0F1A] pr-3 pl-8 text-sm text-[#E2E8F0] outline-none placeholder:text-[#64748B] lg:h-10 lg:rounded-xl lg:pl-10"
          />
        </label>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5 lg:mt-0 lg:contents">
          <FilterSelect
            value={platform}
            onChange={(value) => {
              setPlatform(value);
              setPage(1);
            }}
            className="lg:w-[13.5rem]"
          >
            <option value="all">Todas las plataformas</option>
            {PLATFORMS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            value={status}
            onChange={(value) => {
              setStatus(value as "all" | SolicitudStatus);
              setPage(1);
            }}
            className="lg:w-[12.5rem]"
          >
            <option value="all">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="en_proceso">En proceso</option>
            <option value="resuelta">Resuelta</option>
          </FilterSelect>
        </div>
      </div>

      <div className="space-y-2 lg:space-y-3">
        {visible.length === 0 ? (
          <div className="rounded-2xl border border-[#253047] bg-[#111827] px-4 py-10 text-center text-sm text-[#64748B]">
            No hay solicitudes con esos filtros.
          </div>
        ) : (
          visible.map((item) => (
            <SolicitudRow
              key={item.id}
              item={item}
              menuOpen={menu === item.id}
              onMenu={() => setMenu(menu === item.id ? null : item.id)}
              onVer={() => {
                setDetail(item);
                setMenu(null);
              }}
              onStatus={(next) => updateStatus(item.id, next)}
            />
          ))
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
        <p className="text-xs text-[#94A3B8] lg:text-sm">
          Mostrando {visible.length} de {filtered.length} solicitudes
        </p>
        <Pager page={safePage} pageCount={pageCount} onPage={setPage} />
      </div>

      <Modal open={createOpen} title="Nueva solicitud" onClose={() => setCreateOpen(false)}>
        <CreateForm
          onCancel={() => setCreateOpen(false)}
          onCreate={(item) => {
            setItems((current) => [item, ...current]);
            setCreateOpen(false);
            setStatus("all");
            setPage(1);
          }}
        />
      </Modal>

      <Modal open={Boolean(detail)} title={detail ? `${detail.platform} · ${detail.type}` : "Solicitud"} onClose={() => setDetail(null)}>
        {detail ? (
          <div className="space-y-3 text-sm">
            <p className="text-[#E2E8F0]">{detail.description}</p>
            <p className="text-[#94A3B8]">
              {detail.sellerName} · Cliente: {detail.customerName}
            </p>
            <p className="text-[#64748B]">{formatWhen(detail.createdAt)}</p>
            <StatusBadge status={detail.status} />
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function SolicitudRow({
  item,
  menuOpen,
  onMenu,
  onVer,
  onStatus,
}: {
  item: Solicitud;
  menuOpen: boolean;
  onMenu: () => void;
  onVer: () => void;
  onStatus: (status: SolicitudStatus) => void;
}) {
  return (
    <article className="relative rounded-xl border border-[#253047] bg-[#111827] lg:rounded-2xl">
      <div className="flex gap-2 p-2.5 lg:hidden">
        <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#0B0F1A]">
          <PlatformLogo platform={item.platform} size={24} alt={item.platform} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {item.platform} <span className="font-normal text-[#94A3B8]">· {item.type}</span>
              </p>
              <p className="truncate text-[11px] text-[#94A3B8]">
                {item.sellerName} · Cliente: {item.customerName}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <StatusBadge status={item.status} compact />
              <button
                type="button"
                aria-label="Más acciones"
                onClick={onMenu}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#94A3B8]"
              >
                <MoreIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
          <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-[#CBD5E1]">{item.description}</p>
          <div className="mt-1 flex items-center gap-2.5 text-[11px] text-[#64748B]">
            <span>{formatWhen(item.createdAt)}</span>
            <span className="inline-flex items-center gap-0.5">
              <ImageIcon className="h-3 w-3" />
              {item.attachments}
            </span>
            <span className="inline-flex items-center gap-0.5">
              <ChatIcon className="h-3 w-3" />
              {item.comments}
            </span>
          </div>
        </div>
      </div>

      <div className="hidden px-5 py-3.5 lg:grid lg:grid-cols-[minmax(9.5rem,0.85fr)_minmax(11rem,1fr)_minmax(0,1.8fr)_auto_auto_2rem] lg:items-center lg:gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#0B0F1A]">
            <PlatformLogo platform={item.platform} size={32} alt={item.platform} />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-white">{item.platform}</p>
            <p className="text-xs text-[#94A3B8]">{item.type}</p>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white ${AVATAR[item.sellerName] ?? "bg-[#334155]"}`}
          >
            {item.sellerName.slice(0, 1)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-white">{item.sellerName}</p>
            <p className="text-[11px] text-[#64748B]">Vendedor</p>
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-[#94A3B8]">
              <UserIcon className="h-3.5 w-3.5 shrink-0" />
              Cliente: {item.customerName}
            </p>
          </div>
        </div>

        <div className="min-w-0">
          <p className="line-clamp-2 text-sm leading-snug text-[#CBD5E1]">{item.description}</p>
          <div className="mt-2 flex items-center gap-3 text-xs text-[#64748B]">
            <span className="inline-flex items-center gap-1">
              <ImageIcon className="h-3.5 w-3.5" />
              {item.attachments}
            </span>
            <span className="inline-flex items-center gap-1">
              <ChatIcon className="h-3.5 w-3.5" />
              {item.comments}
            </span>
          </div>
        </div>

        <p className="shrink-0 text-sm whitespace-nowrap text-[#E2E8F0]">{formatWhen(item.createdAt)}</p>
        <StatusBadge status={item.status} />
        <div className="flex justify-end">
          <button
            type="button"
            aria-label="Más acciones"
            onClick={onMenu}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#94A3B8] hover:bg-[#172033] hover:text-white"
          >
            <MoreIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="absolute top-12 right-4 z-20 w-44 overflow-hidden rounded-xl border border-[#253047] bg-[#0B0F1A] py-1 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
          <MenuItem label="Ver" onClick={onVer} />
          {item.status !== "pendiente" ? (
            <MenuItem label="Marcar pendiente" onClick={() => onStatus("pendiente")} />
          ) : null}
          {item.status !== "en_proceso" ? (
            <MenuItem label="Marcar en proceso" onClick={() => onStatus("en_proceso")} />
          ) : null}
          {item.status !== "resuelta" ? (
            <MenuItem label="Marcar resuelta" onClick={() => onStatus("resuelta")} />
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function CreateForm({
  onCreate,
  onCancel,
}: {
  onCreate: (item: Solicitud) => void;
  onCancel: () => void;
}) {
  const [platform, setPlatform] = useState(PLATFORMS[0]);
  const [type, setType] = useState(TYPES[0]);
  const [sellerName, setSellerName] = useState("Juan");
  const [customerName, setCustomerName] = useState("");
  const [description, setDescription] = useState("");

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        onCreate({
          id: `ssup_${Date.now()}`,
          platform,
          type,
          sellerName: sellerName.trim() || "Juan",
          customerName: customerName.trim() || "—",
          description: description.trim() || "Sin descripción.",
          attachments: 0,
          comments: 0,
          createdAt: new Date().toISOString(),
          status: "pendiente",
        });
      }}
    >
      <label className="block text-sm text-[#94A3B8]">
        Plataforma
        <select className={`${FIELD} mt-1.5`} value={platform} onChange={(event) => setPlatform(event.target.value)}>
          {PLATFORMS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm text-[#94A3B8]">
        Tipo
        <select className={`${FIELD} mt-1.5`} value={type} onChange={(event) => setType(event.target.value)}>
          {TYPES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm text-[#94A3B8]">
        Vendedor
        <input className={`${FIELD} mt-1.5`} value={sellerName} onChange={(event) => setSellerName(event.target.value)} />
      </label>
      <label className="block text-sm text-[#94A3B8]">
        Cliente
        <input className={`${FIELD} mt-1.5`} value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
      </label>
      <label className="block text-sm text-[#94A3B8]">
        Descripción
        <textarea
          className="mt-1.5 min-h-24 w-full rounded-lg border border-[#253047] bg-[#111827] px-3 py-2 text-sm text-[#E2E8F0] outline-none"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-10 rounded-xl border border-[#253047] px-4 text-sm text-[#E2E8F0]"
        >
          Cancelar
        </button>
        <button type="submit" className="h-10 rounded-xl bg-[#7C3AED] px-4 text-sm font-semibold text-white">
          Crear
        </button>
      </div>
    </form>
  );
}

function StatCard({
  icon,
  iconClass,
  value,
  label,
  shortLabel,
  active,
  onClick,
}: {
  icon: ReactNode;
  iconClass: string;
  value: number;
  label: string;
  shortLabel: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 rounded-xl border bg-[#111827] px-1 py-1.5 text-center lg:flex-row lg:items-center lg:gap-3 lg:rounded-2xl lg:px-4 lg:py-3.5 lg:text-left ${
        active ? "border-[#3B82F6]" : "border-[#253047]"
      }`}
    >
      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg lg:h-11 lg:w-11 lg:rounded-xl ${iconClass}`}>{icon}</span>
      <span>
        <span className="block text-sm font-bold tracking-tight text-white lg:text-2xl">{value}</span>
        <span className="text-[10px] leading-tight text-[#94A3B8] lg:hidden">{shortLabel}</span>
        <span className="hidden text-sm text-[#94A3B8] lg:inline">{label}</span>
      </span>
    </button>
  );
}

function FilterSelect({
  value,
  onChange,
  children,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative w-full ${className}`}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full appearance-none rounded-lg border border-[#253047] bg-[#0B0F1A] py-0 pr-7 pl-2.5 text-xs text-[#E2E8F0] outline-none lg:h-10 lg:rounded-xl lg:pr-8 lg:pl-3 lg:text-sm"
      >
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
    </div>
  );
}

function StatusBadge({ status, compact = false }: { status: SolicitudStatus; compact?: boolean }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex w-fit shrink-0 rounded-full font-semibold ${
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-3 py-1 text-xs"
      } ${meta.className}`}
    >
      {compact && status === "en_proceso" ? "Proceso" : meta.label}
    </span>
  );
}

function Pager({ page, pageCount, onPage }: { page: number; pageCount: number; onPage: (page: number) => void }) {
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);
  return (
    <div className="flex items-center gap-1.5">
      <PageBtn label="Anterior" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        <ChevronLeftIcon className="h-4 w-4" />
      </PageBtn>
      {pages.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onPage(item)}
          className={`inline-flex h-8 w-8 items-center justify-center rounded-md border text-sm font-semibold ${
            page === item
              ? "border-[#2563EB] bg-[#2563EB] text-white"
              : "border-[#253047] bg-[#111827] text-[#94A3B8] hover:bg-[#172033]"
          }`}
        >
          {item}
        </button>
      ))}
      <PageBtn label="Siguiente" disabled={page >= pageCount} onClick={() => onPage(page + 1)}>
        <ChevronRightIcon className="h-4 w-4" />
      </PageBtn>
    </div>
  );
}

function PageBtn({
  children,
  disabled,
  onClick,
  label,
}: {
  children: ReactNode;
  disabled: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#253047] bg-[#111827] text-[#94A3B8] disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function MenuItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="block w-full px-3 py-2 text-left text-sm text-[#E2E8F0] hover:bg-[#172033]" onClick={onClick}>
      {label}
    </button>
  );
}

function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Lima",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const hour = get("hour").padStart(2, "0");
  const period = get("dayPeriod").toLowerCase().startsWith("p") ? "p. m." : "a. m.";
  return `${get("day")}/${get("month")}/${get("year")} ${hour}:${get("minute")} ${period}`;
}
