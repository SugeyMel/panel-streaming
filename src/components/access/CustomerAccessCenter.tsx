"use client";

import { useMemo, useState } from "react";
import { lookupAccessCodeAction } from "@/app/actions/email-codes";
import { CustomerSquareLogo } from "@/components/cliente/CustomerSquareLogo";
import {
  CalendarIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  InfoIcon,
  KeyIcon,
  LockIcon,
  MailIcon,
  PinPadIcon,
  UsersIcon,
} from "@/components/icons";
import { daysRemaining, formatDate, serviceStatusFromDates } from "@/lib/format";
import { parseProfileSlot } from "@/lib/inventory-matrix";
import { colorWithAlpha, platformCardTheme, platformDisplayName } from "@/lib/platform-logos";
import type { EmailLookupResult, Platform, Subscription } from "@/lib/types";

export function CustomerAccessCenter({
  services,
  platforms,
  customerId: _customerId,
  sellerId: _sellerId,
  enabledMailboxEmails: _enabledMailboxEmails = [],
}: {
  services: Subscription[];
  platforms: Platform[];
  customerId: string;
  sellerId: string;
  enabledMailboxEmails?: string[];
}) {
  const [filter, setFilter] = useState("todos");
  const [copied, setCopied] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, EmailLookupResult>>({});

  const chips = useMemo(() => {
    const counts = new Map<string, { platform: Platform; count: number }>();
    for (const service of services) {
      const platform = platforms.find((item) => item.id === service.platformId);
      if (!platform) continue;
      const current = counts.get(platform.id);
      counts.set(platform.id, { platform, count: (current?.count ?? 0) + 1 });
    }
    return [...counts.values()];
  }, [services, platforms]);

  const visible = filter === "todos" ? services : services.filter((item) => item.platformId === filter);

  async function copyText(key: string, text: string) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied((current) => (current === key ? null : current)), 1600);
    } catch {
      setCopied(null);
    }
  }

  async function requestCode(subscription: Subscription) {
    setLoadingId(subscription.id);
    try {
      const next = await lookupAccessCodeAction(subscription.id);
      setResults((current) => ({ ...current, [subscription.id]: next }));
    } catch {
      setResults((current) => ({
        ...current,
        [subscription.id]: {
          type: "UNKNOWN_BLOCKED",
          status: "DENIED",
          message: "No se pudo consultar el código. Inténtalo de nuevo.",
        },
      }));
    } finally {
      setLoadingId(null);
    }
  }

  if (!services.length) {
    return (
      <div className="space-y-3">
        <AccessHeader />
        <p className="rounded-2xl border border-[#253047] bg-[#111827] px-4 py-6 text-center text-sm text-[#94A3B8]">
          Todavía no tienes un servicio activo. Cuando tu vendedor te asigne una cuenta, el correo aparecerá aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AccessHeader />

      <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => setFilter("todos")}
          className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium sm:h-9 sm:px-3 ${
            filter === "todos"
              ? "bg-gradient-to-r from-[#7C3AED] to-[#2563EB] text-white"
              : "border border-[#253047] bg-[#111827] text-[#CBD5E1]"
          }`}
        >
          Todos
          <span className={`min-w-4 rounded-full px-1.5 text-center text-[10px] font-semibold ${filter === "todos" ? "bg-black/20" : "bg-white/10 text-[#94A3B8]"}`}>
            {services.length}
          </span>
        </button>
        {chips.map(({ platform, count }) => {
          const active = filter === platform.id;
          return (
            <button
              key={platform.id}
              type="button"
              onClick={() => setFilter(platform.id)}
              className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2 text-[12px] font-medium sm:h-9 sm:px-2.5 ${
                active
                  ? "bg-gradient-to-r from-[#7C3AED] to-[#2563EB] text-white"
                  : "border border-[#253047] bg-[#111827] text-[#CBD5E1]"
              }`}
            >
              <CustomerSquareLogo platform={platform} title={platformDisplayName(platform)} size={18} />
              {platformDisplayName(platform)}
              <span className={`min-w-4 rounded-full px-1.5 text-center text-[10px] font-semibold ${active ? "bg-black/20" : "bg-white/10 text-[#94A3B8]"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-[#253047] bg-[#111827] px-4 py-6 text-center text-sm text-[#94A3B8]">
          No hay accesos en este filtro.
        </p>
      ) : (
        <div className="space-y-2.5">
          {visible.map((subscription) => {
            const platform = platforms.find((item) => item.id === subscription.platformId);
            return (
              <AccessCard
                key={subscription.id}
                subscription={subscription}
                platform={platform}
                copied={copied}
                revealed={Boolean(revealed[subscription.id])}
                loading={loadingId === subscription.id}
                result={results[subscription.id]}
                onCopy={copyText}
                onToggleReveal={() =>
                  setRevealed((current) => ({ ...current, [subscription.id]: !current[subscription.id] }))
                }
                onRequestCode={() => requestCode(subscription)}
              />
            );
          })}
        </div>
      )}

      <div className="flex gap-2.5 rounded-2xl border border-[#38BDF8]/25 bg-[#0B1220] px-3 py-3 sm:px-4">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#38BDF8]/15 text-[#38BDF8]">
          <InfoIcon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">Importante</p>
          <ul className="mt-1 space-y-0.5 text-[12px] leading-snug text-[#94A3B8]">
            <li>Los códigos se solicitan desde aquí y se enviarán automáticamente si están disponibles.</li>
            <li>No compartas tus datos de acceso con terceros.</li>
            <li>Si tienes problemas, contáctanos por WhatsApp.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function AccessHeader() {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#2563EB] text-white shadow-[0_8px_20px_rgba(124,58,237,0.35)]">
        <KeyIcon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <h1 className="text-[1.35rem] font-semibold leading-tight tracking-tight text-white sm:text-[1.65rem]">
          Centro de acceso
        </h1>
        <p className="mt-1 text-[12px] leading-snug text-[#94A3B8] sm:text-[13px]">
          Aquí encontrarás los datos de acceso de tus servicios. Si necesitas un código, solicítalo y te lo enviaremos.
        </p>
      </div>
    </div>
  );
}

function AccessCard({
  subscription,
  platform,
  copied,
  revealed,
  loading,
  result,
  onCopy,
  onToggleReveal,
  onRequestCode,
}: {
  subscription: Subscription;
  platform?: Platform;
  copied: string | null;
  revealed: boolean;
  loading: boolean;
  result?: EmailLookupResult;
  onCopy: (key: string, text: string) => void;
  onToggleReveal: () => void;
  onRequestCode: () => void;
}) {
  const title = platformDisplayName(platform ?? subscription.platformId) || platform?.name || "Servicio";
  const theme = platformCardTheme(platform ?? subscription.platformId);
  const status = serviceStatusFromDates(subscription.endDate, subscription.status);
  const days = daysRemaining(subscription.endDate);
  const parsed = parseProfileSlot(subscription.accessProfile);
  const email = subscription.platformEmail.trim();
  const password = accountPasswordFromNotes(subscription.notes);
  const profile = parsed.name || (parsed.slot ? String(parsed.slot) : "");
  const pin = (subscription.accessPassword ?? "").trim();
  const fields = [
    { key: "email", label: "Correo o usuario", value: email, icon: <MailIcon className="h-3.5 w-3.5" />, secret: false },
    { key: "password", label: "Clave", value: password, icon: <LockIcon className="h-3.5 w-3.5" />, secret: true },
    { key: "profile", label: "Perfil", value: profile, icon: <UsersIcon className="h-3.5 w-3.5" />, secret: false },
    { key: "pin", label: "PIN", value: pin, icon: <PinPadIcon className="h-3.5 w-3.5" />, secret: false },
  ];

  return (
    <article
      className="overflow-hidden rounded-2xl border p-3"
      style={{
        background: `radial-gradient(circle at 8% 12%, ${colorWithAlpha(theme.to, 0.2)} 0%, transparent 46%), linear-gradient(180deg, #121A2C 0%, #0C1322 100%)`,
        borderColor: colorWithAlpha(theme.to, 0.55),
        boxShadow: `0 0 0 1px ${colorWithAlpha(theme.to, 0.12)}`,
      }}
    >
      <div className="flex items-start gap-2.5">
        <CustomerSquareLogo platform={platform ?? subscription.platformId} title={title} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-[15px] font-semibold text-white">{title}</h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#16A34A] px-2 py-0.5 text-[10px] font-semibold text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              {status === "proximo_a_vencer" ? "Por vencer" : "Activo"}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
            <p className="inline-flex items-center gap-1 text-[11px] text-white/70">
              <CalendarIcon className="h-3.5 w-3.5 text-white/40" />
              Vence: {formatDate(subscription.endDate)}
            </p>
            <span
              className="rounded-full bg-[#F59E0B]/15 px-2 py-0.5 text-[11px] font-semibold text-[#FBBF24]"
              suppressHydrationWarning
            >
              {days < 0
                ? `Vencido hace ${Math.abs(days)} día${Math.abs(days) === 1 ? "" : "s"}`
                : days === 0
                  ? "Vence hoy"
                  : `Faltan ${days} día${days === 1 ? "" : "s"}`}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {fields.map((field) => {
          const copyKey = `${subscription.id}:${field.key}`;
          const display =
            field.secret && field.value && !revealed ? "••••••••" : field.value || "—";
          return (
            <div key={field.key} className="rounded-xl border border-white/10 bg-black/25 px-2.5 py-2">
              <p className="inline-flex items-center gap-1 text-[10px] text-white/50">
                {field.icon}
                {field.label}
              </p>
              <div className="mt-1 flex items-center gap-1">
                <p className="min-w-0 flex-1 truncate text-[12px] font-medium text-white">{display}</p>
                {field.secret && field.value ? (
                  <button
                    type="button"
                    onClick={onToggleReveal}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white"
                    aria-label={revealed ? "Ocultar clave" : "Mostrar clave"}
                  >
                    {revealed ? <EyeOffIcon className="h-3.5 w-3.5" /> : <EyeIcon className="h-3.5 w-3.5" />}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onCopy(copyKey, field.value)}
                  disabled={!field.value}
                  className="inline-flex h-7 shrink-0 items-center gap-1 rounded-lg border border-white/10 px-1.5 text-[10px] font-medium text-white disabled:opacity-40"
                >
                  <CopyIcon className="h-3 w-3" />
                  {copied === copyKey ? "Copiado" : "Copiar"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() =>
            onCopy(
              `${subscription.id}:all`,
              fields
                .filter((field) => field.value)
                .map((field) => `${field.label}: ${field.value}`)
                .join("\n"),
            )
          }
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-black/25 text-[12px] font-medium text-[#E2E8F0]"
        >
          <CopyIcon className="h-3.5 w-3.5" />
          {copied === `${subscription.id}:all` ? "Copiado" : "Copiar todo"}
        </button>
        <button
          type="button"
          onClick={onRequestCode}
          disabled={loading || !email}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: theme.to }}
        >
          <KeyIcon className="h-3.5 w-3.5" />
          {loading ? "Buscando..." : "Solicitar código"}
        </button>
      </div>

      {result ? (
        <div className="mt-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5">
          <p className="text-[11px] font-medium text-[#C4B5FD]">Resultado</p>
          <p className="mt-0.5 text-sm text-white">{result.message}</p>
          {result.code ? (
            <p className="mt-1 text-2xl font-semibold tracking-[0.2em] text-white">{result.code}</p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function accountPasswordFromNotes(notes?: string) {
  const match = /Clave de la cuenta:\s*(.+)/i.exec(notes ?? "");
  return match?.[1]?.trim() ?? "";
}
