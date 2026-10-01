import { createServiceClient } from "@/lib/supabase/server";
import type { EmailCodeFilterPolicy } from "@/lib/types";

/**
 * Reglas de códigos de UNA plataforma (Administrador → Correos → Reglas de códigos).
 * - enabled: la plataforma entrega códigos a vendedores y clientes.
 * - login: código de inicio de sesión (ej. Netflix 4 dígitos).
 * - verification: código de verificación (ej. Netflix 6 dígitos "Alguien intenta acceder").
 * - travel: Netflix "Estoy de viaje" / código de acceso temporal (botón enlace).
 * - household: actualizar hogar (Netflix con botón enlace, Disney+ con código).
 * - blockWords: palabras que bloquean un correo solo en esta plataforma.
 */
export type PlatformCodeRule = {
  enabled: boolean;
  login: boolean;
  verification: boolean;
  travel: boolean;
  household: boolean;
  /** Disney Premium / Disney Estándar: el código no se entrega hasta que el admin apruebe. */
  manualApproval: boolean;
  blockWords: string[];
};

/** Ajustes de códigos por plataforma. Se guardan en app_settings (clave codes_platform_settings). */
export type CodeSettings = {
  /** Plataformas cuyos códigos están pausados para vendedores y clientes. */
  disabledPlatformIds: string[];
  /** Disney+ · permitir el código para actualizar el Hogar (ajuste antiguo, se usa si Disney no tiene regla). */
  allowDisneyHousehold: boolean;
  /** Reglas por plataforma (id de plataforma → regla). Si una plataforma no tiene regla, se usan los ajustes generales. */
  rules: Record<string, PlatformCodeRule>;
};

export const DEFAULT_CODE_SETTINGS: CodeSettings = { disabledPlatformIds: [], allowDisneyHousehold: false, rules: {} };
const KEY = "codes_platform_settings";

function cleanWords(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))].slice(0, 50);
}

function cleanRule(value: unknown): PlatformCodeRule | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  return {
    enabled: raw.enabled !== false,
    login: raw.login !== false,
    verification: raw.verification !== false,
    travel: raw.travel !== false,
    household: raw.household === true,
    manualApproval: raw.manualApproval === true,
    blockWords: cleanWords(raw.blockWords),
  };
}

function cleanRules(value: unknown): Record<string, PlatformCodeRule> {
  if (!value || typeof value !== "object") return {};
  const out: Record<string, PlatformCodeRule> = {};
  for (const [id, rule] of Object.entries(value as Record<string, unknown>)) {
    const clean = cleanRule(rule);
    if (clean) out[String(id)] = clean;
  }
  return out;
}

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
      rules: cleanRules(parsed.rules),
    };
  } catch {
    return DEFAULT_CODE_SETTINGS;
  }
}

/** Guarda los ajustes. Si no se envían reglas, se conservan las que ya había. */
export async function saveCodeSettings(settings: Omit<CodeSettings, "rules"> & { rules?: CodeSettings["rules"] }) {
  const admin = createServiceClient();
  if (!admin) return { ok: false as const, error: "Sin conexión a la base de datos." };
  const current = settings.rules ? null : await loadCodeSettings();
  const rules = cleanRules(settings.rules ?? current?.rules ?? {});
  const disabled = new Set(settings.disabledPlatformIds.map(String));
  // La lista de pausadas se mantiene igual al interruptor "Códigos activos" de cada regla.
  for (const [id, rule] of Object.entries(rules)) {
    if (rule.enabled) disabled.delete(id);
    else disabled.add(id);
  }
  const value = JSON.stringify({
    disabledPlatformIds: [...disabled],
    allowDisneyHousehold: settings.allowDisneyHousehold === true,
    rules,
  });
  const { error } = await admin
    .from("app_settings")
    .upsert({ key: KEY, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  return error ? { ok: false as const, error: error.message } : { ok: true as const };
}

/** ¿La plataforma entrega códigos? */
export function platformCodesEnabled(settings: CodeSettings, platformId: string) {
  const rule = settings.rules[platformId];
  if (rule) return rule.enabled;
  return !settings.disabledPlatformIds.includes(platformId);
}

/**
 * Regla efectiva de una plataforma. Si aún no se guardó una regla propia, se arma con los ajustes
 * generales de antes (así nada cambia hasta que la administradora la edite).
 */
export function platformRuleFor(
  settings: CodeSettings,
  platform: { id: string; slug?: string | null },
  globalPolicy: EmailCodeFilterPolicy,
): PlatformCodeRule {
  const saved = settings.rules[platform.id];
  if (saved) return saved;
  const slug = (platform.slug ?? "").toLowerCase();
  return {
    enabled: !settings.disabledPlatformIds.includes(platform.id),
    login: globalPolicy.allowLoginCode,
    verification: globalPolicy.allowVerificationCode,
    travel: globalPolicy.allowNetflixTravel,
    household: slug.includes("disney") ? settings.allowDisneyHousehold : globalPolicy.allowNetflixHousehold,
    manualApproval: false,
    blockWords: [],
  };
}

/**
 * Aplica la regla de la plataforma sobre el filtro combinado (general + vendedor).
 * La administradora decide con la regla; el vendedor solo puede restringir inicio/verificación/viaje
 * y sumar palabras bloqueadas. "Actualizar hogar" lo decide solo la administradora.
 */
export function applyPlatformRule(
  merged: EmailCodeFilterPolicy,
  sellerPolicy: EmailCodeFilterPolicy | null,
  rule: PlatformCodeRule,
): EmailCodeFilterPolicy {
  const seller = sellerPolicy ?? merged;
  return {
    ...merged,
    allowLoginCode: rule.login && seller.allowLoginCode,
    allowVerificationCode: rule.verification && seller.allowVerificationCode,
    allowNetflixTravel: rule.travel && seller.allowNetflixTravel,
    allowNetflixHousehold: rule.household,
    allowDisneyHousehold: rule.household,
    extraBlockKeywords: [
      ...new Set(
        [...merged.extraBlockKeywords, ...rule.blockWords.map((item) => item.trim().toLowerCase())].filter(Boolean),
      ),
    ],
  };
}
