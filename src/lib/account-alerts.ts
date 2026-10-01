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
 * Devuelve las cuentas Disney que siguen pausadas.
 * El aviso se detecta al entregar un código, en el mismo buzón donde apareció.
 * Solo el administrador puede reactivarlas.
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
