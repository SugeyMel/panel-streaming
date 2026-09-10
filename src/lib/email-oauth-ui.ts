type OAuthProvider = "google" | "microsoft";

export const OAUTH_RESULT_COPY: Record<string, { ok: boolean; text: string }> = {
  ok: { ok: true, text: "Buzón conectado. Los clientes ya pueden buscar códigos reales." },
  cancelado: { ok: false, text: "Cancelaste el permiso de Google o Microsoft." },
  estado: { ok: false, text: "La conexión no coincide o expiró. Vuelve a pulsar Conectar." },
  expirado: { ok: false, text: "El enlace de conexión caducó. Vuelve a pulsar Conectar." },
  token: { ok: false, text: "No se pudo completar el permiso. Vuelve a pulsar Conectar con Google." },
  redirect: { ok: false, text: "La URI de redirección no coincide. Debe ser exactamente http://localhost:3000/api/oauth/google/callback" },
  cliente: { ok: false, text: "Google rechazó el Client ID o el secreto. Revísalos en .env.local." },
  code: { ok: false, text: "El permiso de Google caducó. Vuelve a pulsar Conectar con Google y acepta otra vez." },
  refresh: {
    ok: false,
    text: "Google/Microsoft no envió el permiso de larga duración. Vuelve a conectar y acepta todos los permisos.",
  },
  guardar: { ok: false, text: "No se pudieron guardar los tokens. Revisa SUPABASE_SERVICE_ROLE_KEY." },
  sql: { ok: false, text: "Falta ejecutar el SQL 0028 en Supabase (tabla de tokens OAuth)." },
  faltan_claves: { ok: false, text: "Faltan las claves OAuth en .env.local. Añádelas y reinicia next dev." },
  buzon: { ok: false, text: "No se encontró ese buzón." },
  sesion: { ok: false, text: "Inicia sesión otra vez y vuelve a conectar el buzón." },
  proveedor: { ok: false, text: "Proveedor OAuth no válido." },
  servidor: { ok: false, text: "Falta la clave de servicio de Supabase para guardar la conexión." },
};

export function oauthStartPath(
  provider: OAuthProvider,
  mailboxId: string,
  returnTo: "/panel/correos" | "/admin/correos",
) {
  const params = new URLSearchParams({ mailboxId, returnTo });
  return `/api/oauth/${provider}/start?${params.toString()}`;
}
