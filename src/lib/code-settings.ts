import { createServiceClient } from "@/lib/supabase/server";

/** Ajustes de códigos por plataforma (Administrador → Correos). Se guardan en app_settings. */
export type CodeSettings = {
  /** Plataformas cuyos códigos están pausados para vendedores y clientes. */
  disabledPlatformIds: string[];
  /** Disney+ · permitir el código para actualizar el Hogar. */
  allowDisneyHousehold: boolean;
};

export const DEFAULT_CODE_SETTINGS: CodeSettings = { disabledPlatformIds: [], allowDisneyHousehold: false };
const KEY = "codes_platform_settings";

export async function loadCodeSettings(): Promise<CodeSettings> {
  const admin = createServiceClient();
  if (!admin) return DEFAULT_CODE_SETTINGS;
  const { data, error } = await admin.from("app_settings").select("value").eq("key", KEY).maybeSingle();
  if (error || !data?.value) return DEFAULT_CODE_SETTINGS;
  try {
    const parsed = JSON.parse(String(data.value)) as Partial<CodeSettings>;
    return {
      disabledPlatformIds: Array.isArray(parsed.disabledPlatformIds) ? parsed.disabledPlatformIds.map(String) : [],
      allowDisneyHousehold: parsed.allowDisneyHousehold === true,
    };
  } catch {
    return DEFAULT_CODE_SETTINGS;
  }
}

export async function saveCodeSettings(settings: CodeSettings) {
  const admin = createServiceClient();
  if (!admin) return { ok: false as const, error: "Sin conexión a la base de datos." };
  const value = JSON.stringify({
    disabledPlatformIds: [...new Set(settings.disabledPlatformIds.map(String))],
    allowDisneyHousehold: settings.allowDisneyHousehold === true,
  });
  const { error } = await admin
    .from("app_settings")
    .upsert({ key: KEY, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  return error ? { ok: false as const, error: error.message } : { ok: true as const };
}
