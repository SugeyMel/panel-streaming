"use server";

import { revalidatePath } from "next/cache";
import { getAppSession, requireRole } from "@/lib/auth/get-session";
import { claimDisneyApproval, decideCodeApproval, resumePausedAccount } from "@/lib/code-controls";
import { DISNEY_EXPIRED_MESSAGE, DISNEY_PENDING_MESSAGE, DISNEY_REJECTED_MESSAGE } from "@/lib/disney-code-policy";
import type { EmailLookupResult, EmailLookupType } from "@/lib/types";

function refresh() {
  revalidatePath("/admin");
  revalidatePath("/admin/correos");
  revalidatePath("/admin/historial");
}

export async function resumePausedAccountAction(email: string) {
  const session = await getAppSession();
  requireRole(session, ["superadmin"]);
  if (!email.trim()) return { ok: false as const, error: "Falta el correo de la cuenta." };
  const result = await resumePausedAccount(email);
  if (!result.ok) return result;
  refresh();
  return { ok: true as const };
}

export async function decideCodeApprovalAction(id: string, decision: "approved" | "rejected") {
  const session = await getAppSession();
  requireRole(session, ["superadmin"]);
  const result = await decideCodeApproval(id, decision);
  if (result.ok) refresh();
  return result;
}

/** El vendedor o el cliente consulta si el admin ya aprobó su código de Disney. */
export async function checkDisneyApprovalAction(approvalId: string): Promise<EmailLookupResult> {
  const session = await getAppSession();
  requireRole(session, ["seller", "customer"]);
  const requesterId = session.role === "customer" ? session.customerId : session.sellerId;
  if (!requesterId) {
    return { type: "UNKNOWN_BLOCKED", status: "DENIED", message: "No pudimos validar tu sesión." };
  }
  const claim = await claimDisneyApproval(approvalId, requesterId);
  if (claim.state === "pending") {
    return {
      type: "UNKNOWN_BLOCKED",
      status: "PENDING_APPROVAL",
      approvalId,
      message: DISNEY_PENDING_MESSAGE,
    };
  }
  if (claim.state === "ready") {
    return {
      type: (claim.item.lookupType || "LOGIN_CODE") as EmailLookupType,
      status: "FOUND",
      code: claim.item.code || undefined,
      link: claim.item.link,
      history: claim.item.history,
      message: "Código temporal encontrado",
    };
  }
  if (claim.state === "rejected") {
    return { type: "UNKNOWN_BLOCKED", status: "DENIED", message: DISNEY_REJECTED_MESSAGE };
  }
  return { type: "UNKNOWN_BLOCKED", status: "DENIED", message: DISNEY_EXPIRED_MESSAGE };
}
