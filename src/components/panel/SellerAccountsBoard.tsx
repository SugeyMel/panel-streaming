"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CopyIcon, FilterIcon, MailIcon } from "@/components/icons";
import { AccountsPagination } from "@/components/accounts/AccountsPagination";
import { DataTable } from "@/components/ui/DataTable";
import { PlatformName } from "@/components/ui/PlatformLogo";
import { SearchBar } from "@/components/ui/SearchBar";
import { HealthStatusBadge } from "@/components/ui/StatusBadge";
import {
  colorDias,
  cumpleEstado,
  diasDesdeVencimiento,
  estadoDesdeDias,
  FILAS_POR_PAGINA_DEFAULT,
  formatDdMmYyyy,
  type EstadoFiltro,
  type FilasPorPagina,
} from "@/lib/cuenta-salud";
import { platformDisplayName } from "@/lib/platform-logos";
import type { Platform, StreamingAccount, WholesaleOfferKind } from "@/lib/types";

export type RenewTarget = { id: string; platformId: string; offerKind: WholesaleOfferKind };

const FIELD =
  "h-10 rounded-lg border border-[#253047] bg-[#111827] px-3 text-sm text-[#E2E8F0] outline-none focus:border-[#38BDF8]/50";

function accountCode(account: StreamingAccount) {
  return account.id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

export function SellerAccountsBoard({
  accounts,
  platforms,
  renewTargets,
}: {
  accounts: StreamingAccount[];
  platforms: Platform[];
  renewTargets: RenewTarget[];
}) {
  const [query, setQuery] = useState("");
  const [platformDraft, setPlatformDraft] = useState("all");
  const [statusDraft, setStatusDraft] = useState<EstadoFiltro>("all");
  const [applied, setApplied] = useState<{ platform: string; status: EstadoFiltro }>({
    platform: "all",
    status: "all",
  });
  const [pageSize, setPageSize] = useState<FilasPorPagina>(FILAS_POR_PAGINA_DEFAULT);
  const [page, setPage] = useState(1);
  const [copied, setCopied] = useState<string | null>(null);

  const platformOptions = useMemo(() => {
    const ids = new Set(accounts.map((item) => item.platformId));
    return platforms.filter((item) => ids.has(item.id));
  }, [accounts, platforms]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return accounts
      .filter((item) => {
        if (applied.platform !== "all" && item.platformId !== applied.platform) return false;
        if (applied.status !== "all") {
          if (item.status === "inactive" || !item.expiresAt) return false;
          if (!cumpleEstado(diasDesdeVencimiento(item.expiresAt), applied.status)) return false;
        }
        if (!needle) return true;
        const platform = platforms.find((p) => p.id === item.platformId);
        return [item.email, item.label, accountCode(item), platform ? platformDisplayName(platform) : ""]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .sort((a, b) => (a.expiresAt ?? "9999-12-31").localeCompare(b.expiresAt ?? "9999-12-31"));
  }, [accounts, applied, platforms, query]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pageCount);
  const start = (current - 1) * pageSize;
  const visible = rows.slice(start, start + pageSize);

  function renewHref(account: StreamingAccount) {
    const wanted: WholesaleOfferKind = account.saleKind === "full" ? "cuenta_completa" : "perfil";
    const options = renewTargets.filter((item) => item.platformId === account.platformId);
    const target = options.find((item) => item.offerKind === wanted) ?? options[0];
    return target ? `/panel/mayorista?producto=${target.id}` : "/panel/mayorista";
  }

  function consultHref(account: StreamingAccount) {
    const params = new URLSearchParams({ plataforma: account.platformId, correo: account.email });
    return `/panel?${params.toString()}`;
  }

  async function copyAccount(account: StreamingAccount) {
    const platform = platforms.find((item) => item.id === account.platformId);
    const lines = [
      `Plataforma: ${platform ? platformDisplayName(platform) : account.platformId}`,
      `Correo: ${account.email}`,
      account.password ? `Clave: ${account.password}` : "",
      `ID de cuenta: ${accountCode(account)}`,
      account.expiresAt ? `Vencimiento: ${formatDdMmYyyy(account.expiresAt)}` : "",
    ].filter(Boolean);
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(account.id);
      window.setTimeout(() => setCopied((value) => (value === account.id ? null : value)), 1600);
    } catch {
      /* sin portapapeles disponible */
    }
  }

  function renderActions(account: StreamingAccount) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => copyAccount(account)}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#253047] bg-[#1B2436] px-2.5 text-xs font-semibold text-white hover:bg-[#232F47]"
        >
          <CopyIcon className="h-3.5 w-3.5" />
          {copied === account.id ? "Copiado" : "Copiar"}
        </button>
        <Link
          href={consultHref(account)}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#2563EB] px-2.5 text-xs font-semibold text-white hover:bg-[#1D4ED8]"
        >
          <MailIcon className="h-3.5 w-3.5" />
          Consultar mensajes
        </Link>
        <Link
          href={renewHref(account)}
          className="inline-flex h-8 items-center rounded-lg bg-[#16A34A] px-2.5 text-xs font-semibold text-white hover:bg-[#15803D]"
        >
          Renovar
        </Link>
      </div>
    );
  }

  function renderExpiry(account: StreamingAccount) {
    if (!account.expiresAt) return <span className="text-[#94A3B8]">—</span>;
    const dias = diasDesdeVencimiento(account.expiresAt);
    return (
      <div className="leading-tight">
        <p className={`text-sm font-semibold ${colorDias(estadoDesdeDias(dias))}`}>{dias < 0 ? `Venció hace ${Math.abs(dias)} d` : `${dias} d`}</p>
        <p className="text-xs text-[#94A3B8]">{formatDdMmYyyy(account.expiresAt)}</p>
      </div>
    );
  }

  function renderStatus(account: StreamingAccount) {
    if (account.status === "inactive") {
      return <span className="text-xs font-semibold text-[#94A3B8]">Inactiva</span>;
    }
    if (!account.expiresAt) return <span className="text-[#94A3B8]">—</span>;
    return <HealthStatusBadge status={estadoDesdeDias(diasDesdeVencimiento(account.expiresAt))} />;
  }

  return (
    <div className="min-w-0 space-y-4">
      <section className="rounded-2xl border border-[#253047] bg-[#0B111C] p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-lg leading-tight font-bold text-[#F8FAFC] md:text-2xl">Mis cuentas</h1>
            <p className="mt-1 text-[13px] leading-snug text-[#94A3B8]">
              Gestiona las cuentas asignadas por el administrador.
            </p>
          </div>
          <form
            className="grid grid-cols-2 items-end gap-3 sm:flex sm:flex-wrap"
            onSubmit={(event) => {
              event.preventDefault();
              setApplied({ platform: platformDraft, status: statusDraft });
              setPage(1);
            }}
          >
            <label className="block text-[10px] font-semibold tracking-wide text-[#94A3B8] uppercase">
              Plataforma
              <select
                value={platformDraft}
                onChange={(event) => setPlatformDraft(event.target.value)}
                className={`${FIELD} mt-1 block h-11 w-full sm:h-10 sm:w-40`}
              >
                <option value="all">Todas</option>
                {platformOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {platformDisplayName(item)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[10px] font-semibold tracking-wide text-[#94A3B8] uppercase">
              Estado
              <select
                value={statusDraft}
                onChange={(event) => setStatusDraft(event.target.value as EstadoFiltro)}
                className={`${FIELD} mt-1 block h-11 w-full sm:h-10 sm:w-40`}
              >
                <option value="all">Todos</option>
                <option value="activo">Activo</option>
                <option value="por_vencer">Por vencer</option>
                <option value="vencido">Vencido</option>
              </select>
            </label>
            <button
              type="submit"
              className="col-span-2 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#2563EB] px-4 text-sm font-semibold text-white hover:brightness-110 sm:col-span-1 sm:h-10"
            >
              <FilterIcon className="h-4 w-4" />
              Filtrar
            </button>
          </form>
        </div>

        <div className="mt-4">
          <SearchBar
            className="w-full md:w-[320px] max-md:[&_input]:h-12 max-md:[&_input]:text-base"
            value={query}
            onChange={(value) => {
              setQuery(value);
              setPage(1);
            }}
            placeholder="Buscar en lista..."
          />
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-[#253047]">
          <DataTable
            rows={visible.map((account) => ({ id: account.id, account }))}
            empty="No tienes cuentas asignadas todavía."
            columns={[
              {
                key: "platform",
                header: "Plataforma",
                render: ({ account }) => (
                  <PlatformName
                    platform={platforms.find((item) => item.id === account.platformId) ?? account.platformId}
                    size={32}
                    className="font-semibold"
                  />
                ),
              },
              { key: "email", header: "Cuenta / correo", render: ({ account }) => account.email || "—" },
              {
                key: "profile",
                header: "Perfil",
                render: ({ account }) => (
                  <span className="text-[#94A3B8] italic">
                    {account.saleKind === "full" ? "— Cuenta completa —" : account.label || "— Perfiles —"}
                  </span>
                ),
              },
              {
                key: "code",
                header: "ID cuenta",
                render: ({ account }) => (
                  <span className="rounded-md bg-[#1E293B] px-2 py-1 font-mono text-xs font-semibold text-[#7DD3FC]">
                    {accountCode(account)}
                  </span>
                ),
              },
              { key: "expiry", header: "Vencimiento", render: ({ account }) => renderExpiry(account) },
              { key: "status", header: "Estado", render: ({ account }) => renderStatus(account) },
              {
                key: "actions",
                header: "Acciones",
                className: "text-right",
                render: ({ account }) => renderActions(account),
              },
            ]}
            mobileRender={({ account }) => {
              const dias = account.expiresAt ? diasDesdeVencimiento(account.expiresAt) : null;
              return (
                <div className="space-y-3 rounded-2xl border border-[#253047] bg-[#0F172A] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <PlatformName
                      platform={platforms.find((item) => item.id === account.platformId) ?? account.platformId}
                      size={44}
                      className="text-base font-bold"
                    />
                    <span className="shrink-0 [&_*]:text-sm">{renderStatus(account)}</span>
                  </div>
                  <p className="text-base leading-snug font-medium break-all text-[#F8FAFC]">{account.email || "—"}</p>
                  <p className="text-sm text-[#94A3B8] italic">
                    {account.saleKind === "full" ? "Cuenta completa" : account.label || "Perfiles"}
                  </p>
                  <div className="grid grid-cols-2 gap-3 rounded-xl bg-[#0B111C] p-3">
                    <div>
                      <p className="text-[11px] font-semibold tracking-wide text-[#94A3B8] uppercase">ID cuenta</p>
                      <p className="mt-1 font-mono text-base font-semibold text-[#7DD3FC]">{accountCode(account)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold tracking-wide text-[#94A3B8] uppercase">Vencimiento</p>
                      {account.expiresAt && dias !== null ? (
                        <>
                          <p className={`mt-1 text-base font-semibold ${colorDias(estadoDesdeDias(dias))}`}>
                            {dias < 0 ? `Venció hace ${Math.abs(dias)} d` : `${dias} d`}
                          </p>
                          <p className="text-sm text-[#94A3B8]">{formatDdMmYyyy(account.expiresAt)}</p>
                        </>
                      ) : (
                        <p className="mt-1 text-base text-[#94A3B8]">—</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href={consultHref(account)}
                      className="col-span-2 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-3 text-sm font-semibold text-white hover:bg-[#1D4ED8]"
                    >
                      <MailIcon className="h-4 w-4" />
                      Consultar mensajes
                    </Link>
                    <button
                      type="button"
                      onClick={() => copyAccount(account)}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#253047] bg-[#1B2436] px-3 text-sm font-semibold text-white hover:bg-[#232F47]"
                    >
                      <CopyIcon className="h-4 w-4" />
                      {copied === account.id ? "Copiado" : "Copiar"}
                    </button>
                    <Link
                      href={renewHref(account)}
                      className="inline-flex h-12 items-center justify-center rounded-xl bg-[#16A34A] px-3 text-sm font-semibold text-white hover:bg-[#15803D]"
                    >
                      Renovar
                    </Link>
                  </div>
                </div>
              );
            }}
          />
        </div>

        <AccountsPagination
          total={rows.length}
          rangeStart={rows.length === 0 ? 0 : start + 1}
          rangeEnd={Math.min(start + pageSize, rows.length)}
          page={current}
          pageCount={pageCount}
          onPage={setPage}
          filasPorPagina={pageSize}
          onFilasPorPagina={(value) => {
            setPageSize(value);
            setPage(1);
          }}
        />
      </section>
    </div>
  );
}
