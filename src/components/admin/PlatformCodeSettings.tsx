"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveCodeSettingsAction } from "@/app/actions/code-settings";
import type { CodeSettings } from "@/lib/code-settings";

type PlatformItem = { id: string; name: string };

function Switch({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? "bg-emerald-500" : "bg-[#334155]"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

/** Administrador → Correos: encender o pausar los códigos de cada plataforma y el código de Hogar de Disney+. */
export function PlatformCodeSettings({ platforms, initial }: { platforms: PlatformItem[]; initial: CodeSettings }) {
  const router = useRouter();
  const [disabled, setDisabled] = useState<string[]>(initial.disabledPlatformIds);
  const [disneyHousehold, setDisneyHousehold] = useState(initial.allowDisneyHousehold);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const hasDisney = platforms.some((item) => item.name.toLowerCase().includes("disney"));

  function togglePlatform(id: string) {
    setDisabled((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function save() {
    if (pending) return;
    setPending(true);
    setMessage(null);
    try {
      const result = await saveCodeSettingsAction({ disabledPlatformIds: disabled, allowDisneyHousehold: disneyHousehold });
      setMessage(result.ok ? { ok: true, text: "Guardado." } : { ok: false, text: result.error ?? "No se pudo guardar." });
      if (result.ok) router.refresh();
    } catch {
      setMessage({ ok: false, text: "No se pudo guardar. Inténtalo de nuevo." });
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mb-3 rounded-2xl border border-[#253047] bg-[#111827] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-white">Códigos por plataforma</h2>
          <p className="text-[11px] text-[#64748B]">
            Apaga una plataforma para pausar sus códigos a vendedores y clientes. Las demás siguen igual.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {message ? (
            <span className={`text-xs ${message.ok ? "text-emerald-300" : "text-red-300"}`}>{message.text}</span>
          ) : null}
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="h-8 rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#22D3EE] px-4 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-60"
          >
            {pending ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
        {platforms.map((platform) => {
          const on = !disabled.includes(platform.id);
          return (
            <div
              key={platform.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-[#1e293b] bg-[#0B111C] px-2.5 py-1.5"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-white">{platform.name}</p>
                <p className={`text-[10px] ${on ? "text-emerald-300" : "text-red-300"}`}>{on ? "Códigos activos" : "Pausado"}</p>
              </div>
              <Switch on={on} onClick={() => togglePlatform(platform.id)} label={`Códigos de ${platform.name}`} />
            </div>
          );
        })}
      </div>

      {hasDisney ? (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-[#1e293b] bg-[#0B111C] px-2.5 py-1.5">
          <div className="min-w-0">
            <p className="text-xs font-medium text-white">Disney+ · Actualizar Hogar</p>
            <p className="text-[10px] leading-tight text-[#64748B]">
              Código del correo “¿Vas a actualizar tu Hogar de Disney+?”. Distinto al de inicio de sesión.
            </p>
          </div>
          <Switch on={disneyHousehold} onClick={() => setDisneyHousehold((value) => !value)} label="Disney Actualizar Hogar" />
        </div>
      ) : null}
    </section>
  );
}
