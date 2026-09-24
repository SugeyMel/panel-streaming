"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { saveAdminWhatsappAction } from "@/app/actions/business";
import { Card, CardHeader } from "@/components/ui/Card";
import { adminWhatsappDisplay } from "@/lib/admin-contact";

export function AdminWhatsappSetting({ current }: { current: string }) {
  const router = useRouter();
  const [value, setValue] = useState(adminWhatsappDisplay(current));
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setMessage(null);
    try {
      const result = await saveAdminWhatsappAction(new FormData(event.currentTarget));
      if (result.ok) {
        setMessage({ ok: true, text: "WhatsApp guardado." });
        router.refresh();
      } else {
        setMessage({ ok: false, text: result.error ?? "No se pudo guardar." });
      }
    } catch {
      setMessage({ ok: false, text: "No se pudo guardar. Inténtalo de nuevo." });
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="WhatsApp de contacto para vendedores"
        description="Los vendedores lo ven cuando algo está desactivado (por ejemplo, crear clientes) y necesitan escribirte."
      />
      <form onSubmit={submit} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
        <input
          name="whatsapp"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          required
          placeholder="+51 931330910"
          className="h-11 w-full rounded-xl border border-[#253047] bg-[#070B14] px-3 text-sm text-white outline-none placeholder:text-[#64748B] focus:border-violet-400/50 sm:max-w-xs"
        />
        <button
          type="submit"
          disabled={pending}
          className="h-11 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#22D3EE] px-5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
        >
          {pending ? "Guardando..." : "Guardar"}
        </button>
        {message ? (
          <span className={`text-sm ${message.ok ? "text-emerald-300" : "text-red-300"}`}>{message.text}</span>
        ) : null}
      </form>
    </Card>
  );
}
