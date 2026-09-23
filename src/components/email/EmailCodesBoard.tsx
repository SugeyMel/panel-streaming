"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteConnectedEmailAction,
  disconnectOAuthAction,
  importInventoryEmailsAction,
  saveEmailFilterAction,
  toggleEmailCodesAction,
  upsertConnectedEmailAction,
} from "@/app/actions/email-codes";
import { EmailConnectionCard } from "@/components/email/EmailConnectionCard";
import {
  LockIcon,
  MailIcon,
  PlatformsIcon,
  PlusIcon,
  ShieldIcon,
} from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { ConfirmationDialog, Modal } from "@/components/ui/Modal";
import { PlatformLogo } from "@/components/ui/PlatformLogo";
import { EmailStatusBadge, LookupStatusBadge } from "@/components/ui/StatusBadge";
import {
  classifyEmailMessage,
  EMAIL_CODES_SQL_HINT,
  extractAccessCode,
  FILTER_TEST_PRESETS,
  mergeEmailFilterPolicies,
} from "@/lib/email-code-filter";
import { OAUTH_RESULT_COPY } from "@/lib/email-oauth-ui";
import { formatDate } from "@/lib/format";
import type {
  ConnectedEmailAccount,
  EmailAuditLog,
  EmailCodeFilterPolicy,
  Platform,
  Seller,
} from "@/lib/types";

function Toggle({
  checked,
  onChange,
  tone = "blue",
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  tone?: "blue" | "amber";
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition ${
        checked ? (tone === "amber" ? "bg-amber-500" : "bg-[#2563EB]") : "bg-[#334155]"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export function EmailCodesBoard({
  mode,
  sellerId,
  sellers = [],
  platforms,
  emails,
  inventoryEmails = [],
  filterPolicy,
  globalFilter,
  lookups,
  missingSql,
  sellerNameById = {},
  oauthConfigured = { google: false, microsoft: false },
  oauthRedirects,
  oauthResult,
}: {
  mode: "seller" | "admin";
  sellerId: string | null;
  sellers?: Seller[];
  platforms: Platform[];
  emails: ConnectedEmailAccount[];
  inventoryEmails?: { email: string; platformId: string }[];
  filterPolicy: EmailCodeFilterPolicy;
  globalFilter: EmailCodeFilterPolicy;
  lookups: EmailAuditLog[];
  missingSql: boolean;
  sellerNameById?: Record<string, string>;
  oauthConfigured?: { google: boolean; microsoft: boolean };
  oauthRedirects?: { google: string; microsoft: string };
  oauthResult?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [platformEdit, setPlatformEdit] = useState<ConnectedEmailAccount | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [draftEmail, setDraftEmail] = useState("");
  const [selectedId, setSelectedId] = useState(emails[0]?.id ?? "");
  const [showTest, setShowTest] = useState(true);
  const [testFrom, setTestFrom] = useState(FILTER_TEST_PRESETS[0].from as string);
  const [testSubject, setTestSubject] = useState(FILTER_TEST_PRESETS[0].subject as string);
  const [testPlatformId, setTestPlatformId] = useState(
    () => platforms.find((item) => item.slug.toLowerCase().includes("netflix"))?.id ?? platforms[0]?.id ?? "",
  );
  const [allowLogin, setAllowLogin] = useState(filterPolicy.allowLoginCode);
  const [allowVerification, setAllowVerification] = useState(filterPolicy.allowVerificationCode);
  const [allowTravel, setAllowTravel] = useState(filterPolicy.allowNetflixTravel);
  const [allowHousehold, setAllowHousehold] = useState(filterPolicy.allowNetflixHousehold);
  const [extraKeywords, setExtraKeywords] = useState(filterPolicy.extraBlockKeywords.join("\n"));

  useEffect(() => {
    if (!emails.some((item) => item.id === selectedId) && emails[0]) setSelectedId(emails[0].id);
  }, [emails, selectedId]);

  const livePolicy = useMemo(
    () =>
      mergeEmailFilterPolicies(
        mode === "admin"
          ? {
              ...filterPolicy,
              allowLoginCode: allowLogin,
              allowVerificationCode: allowVerification,
              allowNetflixTravel: allowTravel,
              allowNetflixHousehold: allowHousehold,
              extraBlockKeywords: extraKeywords.split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean),
            }
          : globalFilter,
        {
          ...filterPolicy,
          allowLoginCode: allowLogin,
          allowVerificationCode: allowVerification,
          allowNetflixTravel: allowTravel,
          allowNetflixHousehold: allowHousehold,
          extraBlockKeywords: extraKeywords.split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean),
        },
      ),
    [allowHousehold, allowLogin, allowTravel, allowVerification, extraKeywords, filterPolicy, globalFilter, mode],
  );

  const testPlatform = platforms.find((item) => item.id === testPlatformId);
  const testVerdict = classifyEmailMessage({ from: testFrom, subject: testSubject }, livePolicy, testPlatform);
  const testCode = extractAccessCode(`${testSubject} ${testFrom}`);
  const uniqueInventory = useMemo(() => {
    const seen = new Set<string>();
    return inventoryEmails.filter((item) => {
      const key = item.email.trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [inventoryEmails]);

  const selected = emails.find((item) => item.id === selectedId) ?? emails[0] ?? null;
  const connectedCount = emails.filter((item) => item.status === "conectado" || item.oauthEmail).length;
  const activePlatforms = new Set(emails.flatMap((item) => item.linkedPlatformIds)).size;
  const googleReady = oauthConfigured.google;
  const oauthFlash = oauthResult ? OAUTH_RESULT_COPY[oauthResult] : null;

  const permissionRows = [
    {
      key: "login",
      title: "Código de inicio de sesión",
      hint: "PIN que pide Netflix, HBO MAX, Disney…",
      checked: allowLogin,
      set: setAllowLogin,
      tone: "blue" as const,
    },
    {
      key: "verify",
      title: "Verificación de la plataforma",
      hint: "Solo si el remitente es de esa app",
      checked: allowVerification,
      set: setAllowVerification,
      tone: "blue" as const,
    },
    {
      key: "travel",
      title: "Netflix · Estoy de viaje / TV",
      hint: "Código del televisor. No cambia el correo.",
      checked: allowTravel,
      set: setAllowTravel,
      tone: "blue" as const,
    },
    {
      key: "home",
      title: "Netflix · Actualizar hogar",
      hint: "Déjalo apagado para no desplazar perfiles.",
      checked: allowHousehold,
      set: setAllowHousehold,
      tone: "amber" as const,
    },
  ];

  function flash(ok: boolean, text: string) {
    setMessage({ ok, text });
  }

  function refresh() {
    startTransition(() => router.refresh());
  }

  function jumpTo(id: "codes-filters" | "codes-tester") {
    setShowTest(true);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function loadPreset(slug = "netflix") {
    const preset = FILTER_TEST_PRESETS.find((item) => item.slug === slug) ?? FILTER_TEST_PRESETS[0];
    setTestFrom(preset.from);
    setTestSubject(preset.subject);
    const match = platforms.find((item) => item.slug.toLowerCase().includes(preset.slug));
    if (match) setTestPlatformId(match.id);
    setShowTest(true);
    jumpTo("codes-tester");
  }

  async function savePlatforms(account: ConnectedEmailAccount, platformIds: string[]) {
    const form = new FormData();
    if (sellerId) form.set("sellerId", sellerId);
    form.set("email", account.email);
    form.set("provider", account.provider);
    form.set("codesEnabled", account.codesEnabled ? "true" : "false");
    for (const id of platformIds) form.append("platformId", id);
    const result = await upsertConnectedEmailAction(form);
    flash(result.ok, result.ok ? "Plataformas actualizadas." : result.error ?? "No se pudo guardar");
    if (result.ok) {
      setPlatformEdit(null);
      refresh();
    }
  }

  return (
    <div className="flex flex-col gap-2 lg:h-[calc(100dvh-9.25rem)] lg:min-h-0 lg:overflow-hidden">
      <div className="flex shrink-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-white sm:text-xl">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#2563EB]/15 text-[#38BDF8]">
              <MailIcon className="h-4 w-4" />
            </span>
            {mode === "admin" ? "Centro de códigos" : "Mi Bot"}
          </h1>
          <p className="mt-0.5 hidden text-xs text-[#94A3B8] sm:block">
            Administra los correos usados para recibir códigos de tus plataformas.
          </p>
        </div>
        <Button type="button" className="!min-h-9 h-9 shrink-0 px-3 text-xs" onClick={() => setOpen(true)}>
          <PlusIcon className="h-4 w-4" />
          Añadir correo
        </Button>
      </div>

      {missingSql ? (
        <p className="shrink-0 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs text-amber-100">
          {EMAIL_CODES_SQL_HINT}
        </p>
      ) : null}
      {oauthFlash ? (
        <p
          className={`shrink-0 rounded-xl px-3 py-1.5 text-xs ${
            oauthFlash.ok ? "border border-emerald-400/30 bg-emerald-400/10 text-emerald-100" : "border border-red-400/30 bg-red-400/10 text-red-100"
          }`}
        >
          {oauthFlash.text}
        </p>
      ) : null}
      {message ? (
        <p className={`shrink-0 text-xs ${message.ok ? "text-emerald-300" : "text-red-300"}`}>{message.text}</p>
      ) : null}
      {!googleReady ? (
        <p className="shrink-0 rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-3 py-1.5 text-[11px] text-[#94A3B8]">
          Falta Google OAuth en .env.local. URI: {oauthRedirects?.google}
        </p>
      ) : null}

      <div className="grid shrink-0 grid-cols-3 gap-1.5">
        <div className="rounded-xl border border-[#253047] bg-[#111827] px-2.5 py-2">
          <p className="flex items-center gap-1 text-[10px] text-[#94A3B8]">
            <MailIcon className="h-3 w-3" /> Correos
          </p>
          <p className="mt-0.5 text-sm font-semibold text-white">
            {connectedCount || emails.length}{" "}
            <span className="text-[11px] font-normal text-[#94A3B8]">
              {connectedCount ? "conectado" : emails.length ? "registrado" : "sin buzón"}
              {(connectedCount || emails.length) === 1 ? "" : "s"}
            </span>
          </p>
        </div>
        <div className="rounded-xl border border-[#253047] bg-[#111827] px-2.5 py-2">
          <p className="flex items-center gap-1 text-[10px] text-[#94A3B8]">
            <PlatformsIcon className="h-3 w-3" /> Plataformas
          </p>
          <p className="mt-0.5 text-sm font-semibold text-white">
            {activePlatforms || "Todas"}{" "}
            <span className="text-[11px] font-normal text-[#94A3B8]">
              {activePlatforms ? (activePlatforms === 1 ? "activa" : "activas") : ""}
            </span>
          </p>
        </div>
        <div className="rounded-xl border border-[#253047] bg-[#111827] px-2.5 py-2">
          <p className="flex items-center gap-1 text-[10px] text-[#94A3B8]">
            <ShieldIcon className="h-3 w-3" /> Seguridad
          </p>
          <p className="mt-0.5 text-sm font-semibold text-emerald-300">Códigos seguros</p>
        </div>
      </div>

      {mode === "admin" && emails.length ? (
        <div className="hidden max-h-24 shrink-0 overflow-auto rounded-xl border border-[#253047] lg:block">
          <table className="w-full text-left text-[11px] text-[#E2E8F0]">
            <thead className="sticky top-0 bg-[#111827] text-[#94A3B8]">
              <tr>
                <th className="px-2 py-1 font-medium">Vendedor</th>
                <th className="px-2 py-1 font-medium">Correo</th>
                <th className="px-2 py-1 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {emails.map((row) => (
                <tr key={row.id} className="border-t border-[#1e293b]">
                  <td className="px-2 py-1">{sellerNameById[row.sellerId] ?? "—"}</td>
                  <td className="px-2 py-1">{row.email}</td>
                  <td className="px-2 py-1">
                    <EmailStatusBadge status={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-2 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <section className="flex min-h-0 flex-col rounded-2xl border border-[#253047] bg-[#111827] p-2.5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Correos conectados</h2>
            <span className="text-[11px] text-[#64748B]">{emails.length}</span>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-0.5">
            {emails.length ? (
              emails.map((account) => (
                <EmailConnectionCard
                  key={account.id}
                  account={account}
                  platforms={platforms}
                  busy={pending}
                  selected={selected?.id === account.id}
                  returnTo={mode === "admin" ? "/admin/correos" : "/panel/correos"}
                  oauthConfigured={oauthConfigured}
                  onSelect={() => setSelectedId(account.id)}
                  onTest={() => {
                    setSelectedId(account.id);
                    loadPreset("netflix");
                  }}
                  onConfigure={() => {
                    setSelectedId(account.id);
                    jumpTo("codes-filters");
                  }}
                  onAddPlatform={() => setPlatformEdit(account)}
                  onToggleCodes={async (enabled) => {
                    const result = await toggleEmailCodesAction(account.id, enabled);
                    flash(
                      result.ok,
                      result.ok
                        ? enabled
                          ? "Códigos habilitados para clientes."
                          : "Códigos deshabilitados."
                        : (result.error ?? "No se pudo actualizar"),
                    );
                    if (result.ok) refresh();
                  }}
                  onDisconnect={async () => {
                    const result = await disconnectOAuthAction(account.id);
                    flash(
                      result.ok,
                      result.ok ? "OAuth desconectado." : result.error ?? "No se pudo desconectar",
                    );
                    if (result.ok) refresh();
                  }}
                  onDelete={() => setDeleteId(account.id)}
                />
              ))
            ) : (
              <p className="px-2 py-6 text-center text-xs text-[#94A3B8]">
                Aún no hay buzones. Añade el Gmail de Netflix, HBO MAX o Disney.
              </p>
            )}
          </div>
        </section>

        <section
          id="codes-filters"
          className="flex min-h-0 flex-col rounded-2xl border border-[#253047] bg-[#111827] p-2.5"
        >
          <h2 className="text-sm font-semibold text-white">Permisos de códigos</h2>
          <p className="mt-0.5 truncate text-[11px] text-[#64748B]">
            {selected ? selected.email : "Aplica a todos los buzones de este vendedor"}
          </p>
          <form
            className="mt-2 flex min-h-0 flex-1 flex-col gap-1.5"
            action={async (formData) => {
              formData.set("scope", mode === "admin" ? "global" : "seller");
              if (sellerId) formData.set("sellerId", sellerId);
              formData.set("allowLoginCode", allowLogin ? "true" : "false");
              formData.set("allowVerificationCode", allowVerification ? "true" : "false");
              formData.set("allowNetflixTravel", allowTravel ? "true" : "false");
              formData.set("allowNetflixHousehold", allowHousehold ? "true" : "false");
              formData.set("extraBlockKeywords", extraKeywords);
              const result = await saveEmailFilterAction(formData);
              flash(result.ok, result.ok ? "Filtro guardado." : result.error ?? "No se pudo guardar");
              if (result.ok) refresh();
            }}
          >
            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-0.5">
              {permissionRows.map((row) => (
                <div
                  key={row.key}
                  className="flex items-center gap-2 rounded-xl border border-[#1e293b] bg-[#0B111C] px-2.5 py-1.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-white">{row.title}</p>
                    <p className="text-[10px] leading-tight text-[#64748B]">{row.hint}</p>
                  </div>
                  <span
                    className={`hidden rounded-full px-1.5 py-0.5 text-[9px] font-semibold sm:inline ${
                      row.checked ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"
                    }`}
                  >
                    {row.checked ? "Permitido" : "Bloqueado"}
                  </span>
                  <Toggle checked={row.checked} onChange={row.set} tone={row.tone} />
                </div>
              ))}
              <div className="flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/5 px-2.5 py-2">
                <LockIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-300" />
                <div>
                  <p className="text-xs font-semibold text-red-200">Protección automática</p>
                  <p className="text-[10px] leading-tight text-[#94A3B8]">
                    Cambio de correo, contraseña, 2FA, pagos y Gmail/Outlook nunca se muestran al cliente.
                  </p>
                </div>
              </div>
              <label className="block">
                <span className="text-[11px] font-medium text-[#E2E8F0]">Palabras extra para bloquear</span>
                <textarea
                  value={extraKeywords}
                  onChange={(event) => setExtraKeywords(event.target.value)}
                  rows={2}
                  placeholder={"cambiar correo\nmétodo de pago"}
                  className="ui-field mt-1 min-h-[3.2rem] py-1.5 text-xs"
                />
              </label>
            </div>
            <Button type="submit" disabled={pending} className="!min-h-8 mt-1 h-8 w-full px-3 text-xs">
              Guardar filtro
            </Button>
          </form>
        </section>
      </div>

      <section id="codes-tester" className="shrink-0 rounded-2xl border border-[#253047] bg-[#111827] p-2.5">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-white">Probar un mensaje</h2>
          <div className="hidden gap-1 sm:flex">
            {FILTER_TEST_PRESETS.slice(0, 4).map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => loadPreset(preset.slug)}
                className="rounded-full border border-[#253047] px-2 py-0.5 text-[10px] text-[#94A3B8] hover:text-white"
              >
                {preset.label.replace(" · ", " ")}
              </button>
            ))}
          </div>
        </div>
        <div className="grid items-center gap-1.5 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)_minmax(0,1.3fr)_auto]">
          <select
            value={testPlatformId}
            onChange={(event) => setTestPlatformId(event.target.value)}
            className="ui-field box-border h-11 min-h-11 !py-2.5 text-sm leading-normal"
          >
            {platforms.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <input
            value={testFrom}
            onChange={(event) => setTestFrom(event.target.value)}
            className="ui-field box-border h-11 min-h-11 !py-2.5 text-sm leading-normal"
            placeholder="Correo remitente"
          />
          <input
            value={testSubject}
            onChange={(event) => setTestSubject(event.target.value)}
            className="ui-field box-border h-11 min-h-11 !py-2.5 text-sm leading-normal"
            placeholder="Asunto del correo"
          />
          <button
            type="button"
            onClick={() => setShowTest(true)}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-[#1D4ED8]"
          >
            Probar
          </button>
        </div>
        {showTest ? (
          <div
            className={`mt-1.5 flex flex-wrap items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs ${
              testVerdict.decision === "allow"
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
                : "border-red-400/30 bg-red-400/10 text-red-100"
            }`}
          >
            <span className="font-semibold">
              Resultado: {testVerdict.decision === "allow" ? "Permitido" : "Bloqueado"}
            </span>
            {testVerdict.decision === "allow" && testCode ? (
              <span className="rounded-lg bg-black/20 px-2 py-0.5 font-mono text-sm tracking-[0.2em] text-white">
                {testCode}
              </span>
            ) : null}
            <span className="text-[10px] opacity-80">{testVerdict.reason}</span>
          </div>
        ) : null}
      </section>

      {lookups.length ? (
        <details className="shrink-0 rounded-xl border border-[#253047] bg-[#0B111C] px-2.5 py-1.5 lg:max-h-8">
          <summary className="cursor-pointer text-[11px] text-[#94A3B8]">
            Consultas de clientes ({lookups.length}) · no se guarda el código
          </summary>
          <div className="mt-2 max-h-28 overflow-auto">
            <table className="w-full text-left text-[11px] text-[#E2E8F0]">
              <tbody>
                {lookups.slice(0, 8).map((row) => (
                  <tr key={row.id} className="border-t border-[#1e293b]">
                    <td className="py-1">
                      {platforms.find((item) => item.id === row.platformId) ? (
                        <PlatformLogo
                          platform={platforms.find((item) => item.id === row.platformId)!}
                          size="table"
                        />
                      ) : (
                        row.platformId
                      )}
                    </td>
                    <td className="py-1 text-[#94A3B8]">{formatDate(row.createdAt)}</td>
                    <td className="py-1">
                      <LookupStatusBadge status={row.result} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}

      <Modal open={open} title="Añadir correo" onClose={() => setOpen(false)}>
        <form
          className="space-y-3"
          action={async (formData) => {
            if (sellerId) formData.set("sellerId", sellerId);
            formData.set("email", draftEmail);
            formData.set("codesEnabled", "true");
            const result = await upsertConnectedEmailAction(formData);
            flash(result.ok, result.ok ? "Correo registrado." : result.error ?? "No se pudo guardar");
            if (result.ok) {
              setOpen(false);
              setDraftEmail("");
              refresh();
            }
          }}
        >
          {mode === "admin" && !sellerId ? (
            <select name="sellerId" required className="ui-field">
              <option value="">Vendedor</option>
              {sellers.map((seller) => (
                <option key={seller.id} value={seller.id}>
                  {seller.businessName} ({seller.name})
                </option>
              ))}
            </select>
          ) : null}
          <input
            name="email"
            type="email"
            required
            value={draftEmail}
            onChange={(event) => setDraftEmail(event.target.value)}
            placeholder="gmail de la cuenta de streaming"
            className="ui-field"
          />
          {uniqueInventory.length ? (
            <div className="flex flex-wrap gap-1.5">
              {uniqueInventory.slice(0, 8).map((item) => (
                <button
                  key={item.email}
                  type="button"
                  onClick={() => setDraftEmail(item.email)}
                  className="rounded-full border border-[#253047] px-2 py-0.5 text-[11px] text-white hover:bg-[#172033]"
                >
                  {item.email}
                </button>
              ))}
            </div>
          ) : null}
          <select name="provider" className="ui-field">
            <option value="google">Google (Gmail)</option>
            <option value="microsoft">Microsoft (Outlook)</option>
          </select>
          <div className="grid max-h-36 grid-cols-2 gap-1.5 overflow-y-auto">
            {platforms.map((item) => (
              <label key={item.id} className="flex items-center gap-2 text-xs text-[#E2E8F0]">
                <input type="checkbox" name="platformId" value={item.id} className="accent-[#38BDF8]" />
                <PlatformLogo platform={item} size="filter" />
                {item.name}
              </label>
            ))}
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            Guardar buzón
          </Button>
          {mode === "seller" ? (
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled={pending}
              onClick={async () => {
                const result = await importInventoryEmailsAction();
                flash(
                  result.ok,
                  result.ok ? `Se importaron ${result.imported} correos.` : result.error ?? "No se pudo importar",
                );
                if (result.ok) {
                  setOpen(false);
                  refresh();
                }
              }}
            >
              Importar del inventario
            </Button>
          ) : null}
        </form>
      </Modal>

      <Modal
        open={Boolean(platformEdit)}
        title="Plataformas del buzón"
        onClose={() => setPlatformEdit(null)}
      >
        {platformEdit ? (
          <form
            className="space-y-3"
            onSubmit={async (event) => {
              event.preventDefault();
              const ids = [...new FormData(event.currentTarget).getAll("platformId")].map(String);
              await savePlatforms(platformEdit, ids);
            }}
          >
            <p className="text-xs text-[#94A3B8]">{platformEdit.email}</p>
            <div className="grid max-h-52 grid-cols-2 gap-1.5 overflow-y-auto">
              {platforms.map((item) => (
                <label key={item.id} className="flex items-center gap-2 text-sm text-[#E2E8F0]">
                  <input
                    type="checkbox"
                    name="platformId"
                    value={item.id}
                    defaultChecked={platformEdit.linkedPlatformIds.includes(item.id)}
                    className="accent-[#38BDF8]"
                  />
                  <PlatformLogo platform={item} size="filter" />
                  {item.name}
                </label>
              ))}
            </div>
            <p className="text-[11px] text-[#64748B]">Si no marcas ninguna, el buzón aplica a todas.</p>
            <Button type="submit" className="w-full" disabled={pending}>
              Guardar plataformas
            </Button>
          </form>
        ) : null}
      </Modal>

      <ConfirmationDialog
        open={Boolean(deleteId)}
        title="Quitar buzón"
        description="El cliente dejará de poder pedir códigos de este correo. No se borra la cuenta del inventario."
        confirmLabel="Quitar"
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          if (!deleteId) return;
          const result = await deleteConnectedEmailAction(deleteId);
          setDeleteId(null);
          flash(result.ok, result.ok ? "Buzón quitado." : result.error ?? "No se pudo quitar");
          if (result.ok) refresh();
        }}
      />
    </div>
  );
}
