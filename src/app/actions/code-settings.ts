"use server";

import { revalidatePath } from "next/cache";
import { getAppSession, requireRole } from "@/lib/auth/get-session";
import { createServiceClient } from "@/lib/supabase/server";
import { loadCodeSettings, saveCodeSettings, type CodeSettings, type PlatformCodeRule } from "@/lib/code-settings";

export async function saveCodeSettingsAction(settings: Omit<CodeSettings, "rules"> & { rules?: CodeSettings["rules"] }) {
  const session = await getAppSession();
  requireRole(session, ["superadmin"]);
  const result = await saveCodeSettings(settings);
  if (result.ok) revalidatePath("/admin/correos");
  return result;
}

/** Guarda la regla de UNA plataforma (Reglas de códigos) sin tocar las demás. */
export async function savePlatformCodeRuleAction(
  platformId: string,
  rule: PlatformCodeRule,
  options?: { clearGlobalWords?: boolean },
) {
  const session = await getAppSession();
  requireRole(session, ["superadmin"]);
  if (!platformId) return { ok: false as const, error: "Plataforma inválida." };
  const current = await loadCodeSettings();
  const result = await saveCodeSettings({
    disabledPlatformIds: current.disabledPlatformIds,
    allowDisneyHousehold: current.allowDisneyHousehold,
    rules: { ...current.rules, [platformId]: rule },
  });
  if (result.ok && options?.clearGlobalWords) {
    // Las palabras generales de antes ya quedaron en esta plataforma: se quitan del filtro general.
    await createServiceClient()
      ?.from("email_code_filters")
      .update({ extra_block_keywords: [], updated_at: new Date().toISOString() })
      .is("seller_id", null);
  }
  if (result.ok) revalidatePath("/admin/correos");
  return result;
}
