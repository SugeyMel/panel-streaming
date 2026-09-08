"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { deliverOrderAction } from "@/app/actions/business";
import { Button } from "@/components/ui/Button";
import { PlatformName } from "@/components/ui/PlatformLogo";
import { deliveryWhatsAppMessage, waLink, type PlantillasWhatsapp } from "@/lib/whatsapp";
import type { StreamingAccount } from "@/lib/types";

const PROFILE_OPTIONS = ["x", "1", "2", "3", "4", "5"];

function splitProfile(value?: string) {
  const raw = (value ?? "").trim();
  const match = /^(\d+)\s*[·\-–]\s*(.+)$/.exec(raw);
  if (match) return { slot: match[1], name: match[2].trim() };
  if (/^\d+$/.test(raw)) return { slot: raw, name: "" };
  return { slot: "", name: raw };
}

export function DeliverServiceForm({
  orderId,
  customerName,
  customerWhatsapp,
  platformName,
  productName,
  delivered,
  accounts,
  initialEmail,
  initialPassword,
  initialProfile,
  initialNote,
  initialAccountId,
  plantillas,
}: {
  orderId: string;
  customerName: string;
  customerWhatsapp: string;
  platformName: string;
  productName: string;
  delivered: boolean;
  accounts: StreamingAccount[];
  initialEmail?: string;
  initialPassword?: string;
  initialProfile?: string;
  initialNote?: string;
  initialAccountId?: string;
  plantillas?: PlantillasWhatsapp;
}) {
  const router = useRouter();
  const parsed = splitProfile(initialProfile);
  const first = accounts.find((item) => item.id === initialAccountId) ?? accounts[0] ?? null;
  const [accountId, setAccountId] = useState(first?.id ?? "");
  const [email, setEmail] = useState(initialEmail || first?.email || "");
  const [accountPassword, setAccountPassword] = useState(first?.password || "");
  const [pin, setPin] = useState(initialPassword ?? "");
  const [profile, setProfile] = useState(
    parsed.slot || ((initialProfile ?? "").trim() ? "x" : suggestedProfile(first)),
  );
  const [profileName, setProfileName] = useState(parsed.name || customerName);
  const [note, setNote] = useState(initialNote ?? "");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function applyAccount(nextId: string) {
    setAccountId(nextId);
    const next = accounts.find((item) => item.id === nextId);
    if (!next) return;
    setEmail(next.email);
    setAccountPassword(next.password);
    setProfile(suggestedProfile(next));
  }

  const profileLabel =
    profile && profile !== "x"
      ? [profile, profileName.trim()].filter(Boolean).join(" · ")
      : profileName.trim();

  const autoNote = useMemo(() => {
    const parts = [
      profileLabel ? `Perfil ${profileLabel}.` : "",
      pin ? `PIN ${pin}.` : "",
      "No cambies la clave de la cuenta.",
    ].filter(Boolean);
    return parts.join(" ");
  }, [pin, profileLabel]);

  const whatsappHref = useMemo(
    () =>
      waLink(
        customerWhatsapp,
        deliveryWhatsAppMessage({
          name: customerName,
          platform: platformName,
          product: productName,
          email,
          password: accountPassword,
          pin,
          profile: profileLabel,
          note: note || autoNote,
          plantillas,
        }),
      ),
    [accountPassword, autoNote, customerName, customerWhatsapp, email, note, pin, plantillas, platformName, productName, profileLabel],
  );

  return (
    <form
      className="space-y-3"
      action={async (formData) => {
        if (!String(formData.get("deliveryNote") ?? "").trim()) formData.set("deliveryNote", autoNote);
        setPending(true);
        const result = await deliverOrderAction(formData);
        setPending(false);
        setMessage(result.ok ? "Servicio entregado. El cliente lo ve en su panel y Centro de acceso." : result.error ?? "No se pudo entregar");
        if (result.ok) router.refresh();
      }}
    >
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="accountId" value={accountId} />
      <p className="text-sm text-slate-300">
        Elige una cuenta del inventario. Lo habitual es solo perfil y PIN; correo y clave ya vienen cargados.
      </p>
      {accounts.length ? (
        <label className="block text-xs text-slate-400">
          Cuenta disponible
          <select
            value={accountId}
            onChange={(event) => applyAccount(event.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          >
            {accounts.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label ? `${item.label} · ` : ""}
                {item.email} · {item.usedProfiles}/{item.maxProfiles} perfiles
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
          No hay cuentas de <PlatformName platform={platformName} size="table" className="text-amber-50" /> en inventario.{" "}
          <a href="/panel/inventario" className="underline">Cárgalas aquí</a> y vuelve a este pedido.
        </p>
      )}
      <details className="rounded-xl border border-white/10 p-3" open={!accounts.length}>
        <summary className="cursor-pointer text-sm text-slate-300">Correo y clave de la cuenta</summary>
        <div className="mt-3 space-y-3">
          <label className="block text-xs text-slate-400">
            Usuario / correo
            <input
              name="platformEmail"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block text-xs text-slate-400">
            Clave de la cuenta
            <input
              name="accountPassword"
              value={accountPassword}
              onChange={(event) => setAccountPassword(event.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            />
          </label>
        </div>
      </details>
      <div>
        <p className="text-xs text-slate-400">Perfil del cliente</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {PROFILE_OPTIONS.map((item) => {
            const selected = profile === item;
            const isX = item === "x";
            return (
              <button
                key={item}
                type="button"
                onClick={() => setProfile(item)}
                className={`rounded-xl border px-3 py-2 text-sm ${
                  isX
                    ? selected
                      ? "border-[#EF4444] bg-[#EF4444]/20 font-semibold text-[#F87171]"
                      : "border-[#EF4444]/50 font-semibold text-[#EF4444]"
                    : selected
                      ? "border-cyan-400 bg-cyan-400/10 text-white"
                      : "border-white/10 text-slate-300"
                }`}
              >
                {item.toUpperCase()}
              </button>
            );
          })}
        </div>
        <input type="hidden" name="accessProfile" value={profileLabel} />
      </div>
      <label className="block text-xs text-slate-400">
        Nombre del perfil
        <input
          value={profileName}
          onChange={(event) => setProfileName(event.target.value)}
          placeholder="Ej. MILA"
          className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
        />
      </label>
      <label className="block text-xs text-slate-400">
        PIN del cliente
        <input
          name="accessPassword"
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          placeholder="Ej. 1234"
          className="mt-1 w-full rounded-xl border border-cyan-400/40 bg-white/5 px-3 py-2 text-sm text-white"
        />
      </label>
      <label className="block text-xs text-slate-400">
        Mensaje al cliente (se arma solo; lo puedes cambiar)
        <textarea
          name="deliveryNote"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          placeholder={autoNote}
          className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Entregando..." : delivered ? "Actualizar entrega" : "Entregar en el panel"}
        </Button>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
        >
          Enviar por WhatsApp
        </a>
      </div>
      {message ? <p className="text-sm text-cyan-300">{message}</p> : null}
    </form>
  );
}

function suggestedProfile(account?: StreamingAccount | null) {
  if (!account) return "1";
  return String(Math.min(account.maxProfiles, account.usedProfiles + 1));
}
