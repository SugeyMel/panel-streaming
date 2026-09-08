"use client";

import { useMemo, useState, type ReactNode } from "react";
import { EmailLookupResultCard } from "@/components/email/EmailLookupResult";
import {
  CopyIcon,
  InfoIcon,
  LockIcon,
  MailIcon,
  PinPadIcon,
  SearchIcon,
  UsersIcon,
} from "@/components/icons";
import { PlatformLogo } from "@/components/ui/PlatformLogo";
import { simulateLookup } from "@/lib/access-center";
import { parseProfileSlot } from "@/lib/inventory-matrix";
import type { EmailLookupResult, Platform, Subscription } from "@/lib/types";

/** SIMULACIÓN: Buscar mensaje no lee Gmail real. El correo mostrado sí es el de la cuenta del servicio. */

export function CustomerAccessCenter({
  services,
  platforms,
  customerId,
  sellerId,
}: {
  services: Subscription[];
  platforms: Platform[];
  customerId: string;
  sellerId: string;
}) {
  const [selected, setSelected] = useState<Subscription | null>(services[0] ?? null);
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [result, setResult] = useState<EmailLookupResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const platform = selected
    ? platforms.find((item) => item.id === selected.platformId)
    : undefined;

  const fields = useMemo(() => {
    if (!selected) return [];
    const parsed = parseProfileSlot(selected.accessProfile);
    const profile = parsed.name || (parsed.slot ? String(parsed.slot) : "");
    return [
      {
        key: "email",
        label: "Correo o usuario",
        value: selected.platformEmail.trim(),
        icon: <MailIcon className="h-4 w-4" />,
      },
      {
        key: "password",
        label: "Clave de la cuenta",
        value: accountPasswordFromNotes(selected.notes),
        icon: <LockIcon className="h-4 w-4" />,
      },
      {
        key: "profile",
        label: "Perfil",
        value: profile,
        icon: <UsersIcon className="h-4 w-4" />,
      },
      {
        key: "pin",
        label: "PIN",
        value: (selected.accessPassword ?? "").trim(),
        icon: <PinPadIcon className="h-4 w-4" />,
      },
    ];
  }, [selected]);

  function search() {
    if (!selected) return;
    setLoading(true);
    window.setTimeout(() => {
      const next = attempts + 1;
      setAttempts(next);
      setResult(
        simulateLookup(
          {
            customerId,
            sellerId,
            subscriptionId: selected.id,
            platformId: selected.platformId,
            connectedEmailAccountId: selected.connectedEmailAccountId,
            platformEmailAssignmentId: selected.platformEmailAssignmentId,
          },
          selected,
          next,
        ),
      );
      setLoading(false);
    }, 700);
  }

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

  if (!services.length) {
    return (
      <div className="rounded-2xl border border-[#253047] bg-[#111827] px-4 py-8 text-sm text-[#94A3B8]">
        Todavía no tienes un servicio activo. Cuando tu vendedor te asigne una cuenta, el correo aparecerá aquí.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {services.map((subscription) => {
          const itemPlatform = platforms.find((item) => item.id === subscription.platformId);
          const active = selected?.id === subscription.id;
          return (
            <button
              key={subscription.id}
              type="button"
              onClick={() => {
                setSelected(subscription);
                setResult(null);
                setCopied(null);
              }}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${
                active
                  ? "bg-white text-[#0B111C]"
                  : "border border-[#253047] bg-[#111827] text-[#E2E8F0]"
              }`}
            >
              {itemPlatform ? <PlatformLogo platform={itemPlatform} size={18} /> : null}
              {itemPlatform?.name}
            </button>
          );
        })}
      </div>

      {selected ? (
        <article className="overflow-hidden rounded-2xl border border-[#253047] bg-[#111827]">
          <div className="flex items-center justify-between gap-3 border-b border-[#253047] px-3 py-2.5 sm:px-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#0B111C] p-1">
                {platform ? <PlatformLogo platform={platform} size={36} className="h-8 w-8" /> : null}
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-white">{platform?.name}</h2>
                <p className="text-xs text-[#94A3B8]">Cuenta de tu servicio</p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#16A34A]/30 bg-[#16A34A]/15 px-2.5 py-0.5 text-xs font-semibold text-[#4ADE80]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
              Activo
            </span>
          </div>

          <div className="grid lg:grid-cols-[minmax(0,1fr)_16.5rem]">
            <div className="divide-y divide-[#253047]">
              {fields.map((field) => (
                <CredentialRow
                  key={field.key}
                  icon={field.icon}
                  label={field.label}
                  value={field.value}
                  copied={copied === field.key}
                  onCopy={() => copyText(field.key, field.value)}
                />
              ))}
            </div>

            <aside className="flex flex-col justify-center gap-3 border-t border-[#253047] bg-[#0B111C]/70 px-3 py-3 sm:px-4 lg:border-t-0 lg:border-l">
              <div className="flex gap-2">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#253047] text-[#94A3B8]">
                  <InfoIcon className="h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">Disfruta tu servicio.</p>
                  <p className="mt-0.5 text-xs text-[#94A3B8]">
                    Usa los datos de tu cuenta en la plataforma oficial
                    {platform?.name ? ` de ${platform.name}` : ""}.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  copyText(
                    "all",
                    fields.map((field) => `${field.label}: ${field.value}`).join("\n"),
                  )
                }
                className="inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-xl bg-[#7C3AED] px-3 text-sm font-semibold text-white hover:bg-[#6D28D9]"
              >
                <CopyIcon className="h-4 w-4" />
                {copied === "all" ? "Copiado" : "Copiar todo"}
              </button>
              <button
                type="button"
                onClick={search}
                disabled={loading || !selected.platformEmail}
                className="inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-xl border border-[#253047] bg-[#111827] px-3 text-sm font-semibold text-white hover:bg-[#172033] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <SearchIcon className="h-4 w-4" />
                {loading ? "Buscando mensaje..." : "Buscar código"}
              </button>
            </aside>
          </div>
        </article>
      ) : null}

      {result ? <EmailLookupResultCard result={result} /> : null}
    </div>
  );
}

function CredentialRow({
  icon,
  label,
  value,
  copied,
  onCopy,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
      <span className="shrink-0 text-[#64748B]">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-[#94A3B8]">{label}</p>
        <p className="truncate font-medium text-white">{value || "—"}</p>
      </div>
      <button
        type="button"
        onClick={onCopy}
        disabled={!value}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#253047] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#172033] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <CopyIcon className="h-3.5 w-3.5" />
        {copied ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}

function accountPasswordFromNotes(notes?: string) {
  const match = /Clave de la cuenta:\s*(.+)/i.exec(notes ?? "");
  return match?.[1]?.trim() ?? "";
}
