import { listPausedAccounts } from "@/lib/code-controls";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type AccountChangeAlert = {
  id: string;
  email: string;
  kind: "password" | "email" | "account";
  at?: number;
  requesterName?: string;
  requesterKind?: "vendedor" | "cliente" | "";
};

/**
 * Avisos de Disney de cambio o intento de cambio de clave o correo.
 * No pausan la cuenta: el código se sigue entregando.
 * Entendido oculta ese aviso; uno posterior vuelve a mostrarse.
 */
export async function loadAccountChangeAlerts(): Promise<AccountChangeAlert[]> {
  if (!isSupabaseConfigured()) return [];
  const paused = await listPausedAccounts();
  return paused
    .map((item) => ({
      id: item.noticeId || item.email,
      email: item.email,
      kind: item.kind,
      at: item.at,
      requesterName: item.requesterName,
      requesterKind: item.requesterKind,
    }))
    .sort((a, b) => (b.at ?? 0) - (a.at ?? 0));
}
