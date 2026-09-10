"use client";

import { useEffect, useRef, useState } from "react";
import { GearIcon, MoreIcon, PlusIcon } from "@/components/icons";
import { PlatformLogo } from "@/components/ui/PlatformLogo";
import { oauthStartPath } from "@/lib/email-oauth-ui";
import { emailConnectionLabel } from "@/lib/format";
import type { ConnectedEmailAccount, Platform } from "@/lib/types";

function formatAgo(iso: string | null) {
  if (!iso) return "Pendiente de conectar";
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms)) return "Pendiente de conectar";
  const min = Math.max(0, Math.floor(ms / 60_000));
  if (min < 1) return "hace un momento";
  if (min < 60) return `hace ${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

function ProviderMark({ provider }: { provider: "google" | "microsoft" }) {
  if (provider === "microsoft") {
    return (
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0B111C] ring-1 ring-[#253047]">
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
          <path fill="#F25022" d="M2 2h9.5v9.5H2z" />
          <path fill="#7FBA00" d="M12.5 2H22v9.5h-9.5z" />
          <path fill="#00A4EF" d="M2 12.5h9.5V22H2z" />
          <path fill="#FFB900" d="M12.5 12.5H22V22h-9.5z" />
        </svg>
      </span>
    );
  }
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0B111C] ring-1 ring-[#253047]">
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5c-.3 1.5-1.1 2.8-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
        <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.5 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1C3.4 21.5 7.4 24 12 24z" />
        <path fill="#FBBC05" d="M5.4 14.4c-.2-.7-.4-1.4-.4-2.4s.1-1.7.4-2.4V6.5H1.4C.5 8.2 0 10.1 0 12s.5 3.8 1.4 5.5l4-3.1z" />
        <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0 7.4 0 3.4 2.5 1.4 6.5l4 3.1C6.3 6.8 8.9 4.8 12 4.8z" />
      </svg>
    </span>
  );
}

export function EmailConnectionCard({
  account,
  platforms,
  busy,
  selected,
  returnTo = "/panel/correos",
  oauthConfigured = { google: false, microsoft: false },
  onSelect,
  onTest,
  onConfigure,
  onAddPlatform,
  onToggleCodes,
  onDelete,
  onDisconnect,
}: {
  account: ConnectedEmailAccount;
  platforms: Platform[];
  busy?: boolean;
  selected?: boolean;
  returnTo?: "/panel/correos" | "/admin/correos";
  oauthConfigured?: { google: boolean; microsoft: boolean };
  onSelect?: () => void;
  onTest?: () => void;
  onConfigure?: () => void;
  onAddPlatform?: () => void;
  onToggleCodes?: (enabled: boolean) => void;
  onDelete?: () => void;
  onDisconnect?: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const linked = platforms.filter((item) => account.linkedPlatformIds.includes(item.id));
  const connected = account.status === "conectado" || Boolean(account.oauthEmail);
  const needsReconnect = account.status === "requiere_reconexion";
  const providerReady = account.provider === "google" ? oauthConfigured.google : oauthConfigured.microsoft;
  const connectHref = oauthStartPath(account.provider, account.id, returnTo);
  const connectLabel = needsReconnect
    ? "Reconectar"
    : account.provider === "google"
      ? "Conectar con Google"
      : "Conectar con Microsoft";

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenu(false);
    }
    if (menu) document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);

  return (
    <article
      className={`rounded-2xl border px-3 py-2.5 transition ${
        selected ? "border-[#38BDF8]/50 bg-[#0B1220]" : "border-[#253047] bg-[#0B111C]/80"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <button type="button" onClick={onSelect} className="mt-0.5 shrink-0" aria-label="Seleccionar buzón">
          <ProviderMark provider={account.provider} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <button type="button" onClick={onSelect} className="min-w-0 text-left">
              <p className="truncate text-sm font-semibold text-white">{account.email}</p>
              <p className="mt-0.5 text-[11px] text-[#94A3B8]">
                {account.provider === "google" ? "Gmail" : "Outlook"} · {formatAgo(account.lastSyncAt)}
              </p>
            </button>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                connected
                  ? "bg-emerald-500/15 text-emerald-300"
                  : needsReconnect
                    ? "bg-amber-500/15 text-amber-200"
                    : "bg-sky-500/15 text-sky-200"
              }`}
            >
              {emailConnectionLabel[account.status]}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {linked.length ? (
              linked.map((item) => (
                <span
                  key={item.id}
                  className="inline-flex items-center gap-1 rounded-full border border-[#253047] bg-[#111827] px-1.5 py-0.5 text-[10px] text-[#E2E8F0]"
                >
                  <PlatformLogo platform={item} size="filter" />
                  {item.name}
                </span>
              ))
            ) : (
              <span className="text-[10px] text-[#64748B]">Todas las plataformas</span>
            )}
            {onAddPlatform ? (
              <button
                type="button"
                onClick={onAddPlatform}
                className="inline-flex h-6 items-center gap-0.5 rounded-full border border-dashed border-[#334155] px-1.5 text-[10px] text-[#94A3B8] hover:border-[#38BDF8] hover:text-white"
              >
                <PlusIcon className="h-3 w-3" />
                Plataforma
              </button>
            ) : null}
          </div>
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {onConfigure ? (
          <button
            type="button"
            onClick={onConfigure}
            className="inline-flex h-8 items-center gap-1 rounded-xl border border-[#253047] px-2.5 text-[11px] font-semibold text-[#E2E8F0] hover:bg-[#172033]"
          >
            <GearIcon className="h-3.5 w-3.5" />
            Filtros
          </button>
        ) : null}
        {onTest ? (
          <button
            type="button"
            onClick={onTest}
            className="inline-flex h-8 items-center gap-1 rounded-xl bg-[#2563EB] px-2.5 text-[11px] font-semibold text-white hover:bg-[#1D4ED8]"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-[2]" aria-hidden>
              <path d="M22 2 11 13" />
              <path d="M22 2 15 22l-4-9-9-4z" />
            </svg>
            Probar código
          </button>
        ) : null}
        {providerReady ? (
          <a
            href={connectHref}
            className="inline-flex h-8 items-center rounded-xl border border-[#253047] px-2.5 text-[11px] font-semibold text-white hover:bg-[#172033]"
          >
            {connected ? "Reconectar" : connectLabel}
          </a>
        ) : (
          <span className="inline-flex h-8 items-center rounded-xl border border-amber-400/30 px-2.5 text-[11px] text-amber-100">
            Falta OAuth
          </span>
        )}
        <div className="relative ml-auto" ref={menuRef}>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#253047] text-[#94A3B8] hover:text-white"
            aria-label="Más acciones"
            onClick={() => setMenu((open) => !open)}
          >
            <MoreIcon className="h-4 w-4" />
          </button>
          {menu ? (
            <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-xl border border-[#253047] bg-[#111827] py-1 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
              {onToggleCodes ? (
                <button
                  type="button"
                  disabled={busy}
                  className="block w-full px-3 py-2 text-left text-xs text-[#E2E8F0] hover:bg-[#172033]"
                  onClick={() => {
                    setMenu(false);
                    onToggleCodes(!account.codesEnabled);
                  }}
                >
                  {account.codesEnabled ? "Pausar códigos" : "Activar códigos"}
                </button>
              ) : null}
              {connected || needsReconnect ? (
                onDisconnect ? (
                  <button
                    type="button"
                    disabled={busy}
                    className="block w-full px-3 py-2 text-left text-xs text-[#E2E8F0] hover:bg-[#172033]"
                    onClick={() => {
                      setMenu(false);
                      onDisconnect();
                    }}
                  >
                    Desconectar
                  </button>
                ) : null
              ) : null}
              {onDelete ? (
                <button
                  type="button"
                  disabled={busy}
                  className="block w-full px-3 py-2 text-left text-xs text-red-300 hover:bg-[#172033]"
                  onClick={() => {
                    setMenu(false);
                    onDelete();
                  }}
                >
                  Quitar
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
