"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { signInAction } from "@/app/actions/business";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { tapFeedback } from "@/lib/tap-feedback";

export function LoginForm() {
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const next = useSearchParams().get("next");
  const live = isSupabaseConfigured();

  return (
    <form
      className="space-y-4"
      onSubmit={() => {
        tapFeedback();
        setPending(true);
        setError(null);
      }}
      action={async (formData) => {
        setPending(true);
        setError(null);
        const result = await signInAction(formData);
        if (result && "error" in result && result.error) {
          setError(result.error);
          setPending(false);
        }
      }}
    >
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <label className="block">
        <span className="mb-2 block text-sm text-slate-300">Celular o correo</span>
        <input
          type="text"
          name="identifier"
          required
          autoComplete="username"
          placeholder="987654321 o  tu@correo.com"
          className="ui-field"
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm text-slate-300">Contraseña</span>
        <input
          type="password"
          name="password"
          required
          placeholder="••••••••"
          className="ui-field"
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={remember}
          onChange={(event) => setRemember(event.target.checked)}
          className="h-4 w-4 rounded border-white/20 bg-transparent"
        />
        Recordarme
      </label>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={pending} busy={pending}>
        {pending ? "Ingresando..." : "Iniciar sesión"}
      </Button>
      <p className="text-center text-xs text-slate-500">
        {live
          ? "Cliente: celular + clave. Vendedor y admin: correo + clave."
          : "Modo demo: usa un correo con “admin”, “carlos/cliente” o cualquier otro para vendedor."}
      </p>
    </form>
  );
}
