"use server";

import { revalidatePath } from "next/cache";
import { getAppSession, requireRole } from "@/lib/auth/get-session";
import { saveCodeSettings, type CodeSettings } from "@/lib/code-settings";

export async function saveCodeSettingsAction(settings: CodeSettings) {
  const session = await getAppSession();
  requireRole(session, ["superadmin"]);
  const result = await saveCodeSettings(settings);
  if (result.ok) revalidatePath("/admin/correos");
  return result;
}
