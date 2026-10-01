import { lastCodeRequester, listPausedAccounts, pauseAccount } from "@/lib/code-controls";
import { loadConnectedEmails } from "@/lib/data/queries";
import { findAccountChangeNotices } from "@/lib/email-mailbox-read";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type AccountChangeAlert = {
  id: string;
  email: string;
  kind: "password" | "email" | "account";
  at?: number;
  requesterName?: string;
  requesterKind?: "vendedor" | "cliente" | "";
};

/** Para no dejar colgada la página de inicio si un buzón tarda en responder. */
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T) {
  return Promise.race([promise, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);
}

/**
 * Revisa los buzones conectados buscando avisos de Disney de cambio de clave o correo
 * (últimas 24 horas), pausa esa cuenta y devuelve las cuentas que siguen pausadas.
 * Solo el administrador puede reactivarlas.
 */
export async function loadAccountChangeAlerts(): Promise<AccountChangeAlert[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const mailboxes = (await loadConnectedEmails()).filter((item) => item.codesEnabled);
    const found = await Promise.all(
      mailboxes.map((mailbox) => withTimeout(findAccountChangeNotices(mailbox).catch(() => []), 6000, [])),
    );
    const notices = new Map<string, { id: string; to: string; kind: AccountChangeAlert["kind"]; at?: number }>();
    for (const list of found) for (const item of list) notices.set(item.to || item.id, item);
    for (const notice of notices.values()) {
      if (!notice.to) continue;
      const requester = await lastCodeRequester(notice.to);
      await pauseAccount({
        email: notice.to,
        kind: notice.kind,
        at: notice.at ?? Date.now(),
        noticeId: notice.id,
        requesterName: requester?.name ?? "",
        requesterKind: requester?.kind ?? "",
      });
    }
  } catch {
    /* si un buzón falla, igual se muestran las pausas ya guardadas */
  }
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
