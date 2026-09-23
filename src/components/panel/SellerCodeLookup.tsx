"use client";

import { useState, type FormEvent } from "react";
import { sellerLookupCodeAction } from "@/app/actions/email-codes";
import { CheckIcon, CopyIcon, KeyIcon, MailIcon, SearchIcon } from "@/components/icons";
import { PlatformLogo } from "@/components/ui/PlatformLogo";
import { platformDisplayName } from "@/lib/platform-logos";
import type { EmailLookupResult, Platform } from "@/lib/types";

export function SellerCodeLookup({ platforms }: { platforms: Platform[] }) {
  const [platformId, setPlatformId] = useState<string>(platforms[0]?.id ?? "");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<EmailLookupResult | null>(null);
  const [copied, setCopied] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setResult(null);
    setCopied(false);
    try {
      setResult(await sellerLookupCodeAction(platformId, email));
    } catch {
      setResult({
        type: "UNKNOWN_BLOCKED",
        status: "DENIED",
        message: "No se pudo consultar ahora. Inténtalo de nuevo.",
      });
    } finally {
      setPending(false);
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* sin portapapeles disponible */
    }
  }

  return (
    <section className="min-w-0 rounded-2xl border border-[#253047] bg-[#0B111C] p-4 md:p-5">
      <div className="flex items-start gap-3">
        <span className="inline-grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#8B5CF6]/25 text-[#C4B5FD]">
          <SearchIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h1 className="text-lg leading-tight font-bold text-[#F8FAFC] md:text-2xl">
            Consulta y validación de <span className="text-[#A78BFA]">códigos</span>
          </h1>
          <p className="mt-1 text-[13px] leading-snug text-[#94A3B8]">
            Selecciona una plataforma e ingresa el correo de la cuenta.
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="mt-5 space-y-5">
        <div>
          <p className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-[#F8FAFC]">
            <span className="inline-grid h-6 w-6 place-items-center rounded-full bg-[#7C3AED] text-xs">1</span>
            Selecciona una plataforma
          </p>
          {platforms.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#253047] px-3 py-6 text-center text-sm text-[#94A3B8]">
              Aún no hay plataformas disponibles.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {platforms.map((platform) => {
                const active = platform.id === platformId;
                return (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => setPlatformId(platform.id)}
                    aria-pressed={active}
                    className={`relative flex min-h-[84px] flex-col items-center justify-center gap-1.5 rounded-xl border px-1.5 py-2 text-center text-[11px] font-semibold transition ${
                      active
                        ? "border-[#38BDF8] bg-[#111827] text-white shadow-[0_0_0_1px_rgba(56,189,248,0.4)]"
                        : "border-[#253047] bg-[#0F172A] text-[#CBD5E1] hover:border-[#42516D]"
                    }`}
                  >
                    {active ? (
                      <span className="absolute top-0 right-0 inline-grid h-5 w-5 place-items-center rounded-tr-xl rounded-bl-lg bg-[#38BDF8] text-[#0B111C]">
                        <CheckIcon className="h-3 w-3" />
                      </span>
                    ) : null}
                    <PlatformLogo platform={platform} size={36} />
                    <span className="line-clamp-1 w-full">{platformDisplayName(platform)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <p className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-[#F8FAFC]">
            <span className="inline-grid h-6 w-6 place-items-center rounded-full bg-[#7C3AED] text-xs">2</span>
            Ingrese el correo de la cuenta
          </p>
          <label className="relative block">
            <MailIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="off"
              placeholder="Ingresa el correo completo de la cuenta"
              className="h-12 w-full rounded-xl border border-[#253047] bg-[#070B14] pr-3 pl-10 text-sm text-white outline-none placeholder:text-[#64748B] focus:border-violet-400/50"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={pending || !platformId || !email.trim()}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#22D3EE] text-sm font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <KeyIcon className="h-4 w-4" />
          {pending ? "Consultando..." : "Solicitar código"}
        </button>
      </form>

      {result ? (
        <div
          role="status"
          className={`mt-4 rounded-xl border px-4 py-3 ${
            result.status === "FOUND"
              ? "border-emerald-500/30 bg-emerald-500/10"
              : "border-[#253047] bg-[#111827]"
          }`}
        >
          <p className={`text-sm ${result.status === "FOUND" ? "text-emerald-200" : "text-[#CBD5E1]"}`}>
            {result.message}
          </p>
          {result.status === "FOUND" && result.code ? (
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-3xl font-bold tracking-[0.25em] text-white">{result.code}</span>
              <button
                type="button"
                onClick={() => copyCode(result.code ?? "")}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#253047] bg-[#1B2436] px-3 text-xs font-semibold text-white"
              >
                <CopyIcon className="h-4 w-4" />
                {copied ? "Copiado" : "Copiar"}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
