import { whatsappParaGuardar } from "@/lib/clientes";

const MENSAJE_ESCRIBIR_VIGENTE =
  "Hola {nombre}, te escribo de Panel Streaming. Tu {servicio} vence el {fecha} ({dias} días). ¿Deseas renovar?";
const MENSAJE_ESCRIBIR_VENCIDO =
  "Hola {nombre}, tu {servicio} venció el {fecha}. ¿Deseas renovarlo?";
const MENSAJE_RECORDAR_VIGENTE =
  "Hola {nombre}, te recuerdo que tu {servicio} vence el {fecha} ({dias} días).";
const MENSAJE_RECORDAR_VENCIDO =
  "Hola {nombre}, te recuerdo que tu {servicio} venció el {fecha}.";
const MENSAJE_RENOVAR_VIGENTE =
  "Hola {nombre}, ¿te ofrezco renovar tu {servicio}? Vence el {fecha} ({dias} días).";
const MENSAJE_RENOVAR_VENCIDO =
  "Hola {nombre}, tu {servicio} venció el {fecha}. ¿Deseas renovarlo?";
const MENSAJE_ENTREGA_VIGENTE =
  "Hola {nombre} 👋\nTu servicio de {servicio} ya está entregado.\nUsuario / correo: {correo}\nPIN: {pin}\nTambién lo ves en tu panel → Centro de acceso.";
const MENSAJE_ENTREGA_VENCIDO = MENSAJE_ENTREGA_VIGENTE;
const MENSAJE_BIENVENIDA_VIGENTE =
  "Hola {nombre}, bienvenido. Tu {servicio} ya está activo hasta el {fecha}.";
const MENSAJE_BIENVENIDA_VENCIDO =
  "Hola {nombre}, tu {servicio} venció el {fecha}. Escríbeme si quieres reactivarlo.";

export const MAX_CUERPO_WHATSAPP = 1000;
export const AVISO_LARGO_WHATSAPP = 900;

export type TipoMensajeWhatsapp = "recordar" | "renovar" | "escribir";

export type TipoPlantillaMensaje =
  | "recordatorio_vencimiento"
  | "oferta_renovacion"
  | "entrega_pedido"
  | "bienvenida";

export type DestinoWhatsapp = {
  telefono: string;
  nombre: string;
  servicio: string;
  fecha: string;
  dias: number;
};

export type VariablesMensaje = {
  nombre?: string;
  servicio?: string;
  fecha?: string;
  dias?: string | number;
  correo?: string;
  pin?: string;
  monto?: string;
};

export type PlantillaMensajeGuardada = {
  tipo: TipoPlantillaMensaje;
  cuerpo: string;
  cuerpoVencido: string | null;
  activo: boolean;
};

export type PlantillasWhatsapp = Partial<Record<TipoPlantillaMensaje, PlantillaMensajeGuardada>>;

export const VARIABLES_MENSAJE: Array<{ key: keyof VariablesMensaje; chip: string; hint: string }> = [
  { key: "nombre", chip: "{nombre}", hint: "Nombre del cliente o vendedor" },
  { key: "servicio", chip: "{servicio}", hint: "Nombre del servicio (Netflix, Disney+, …)" },
  { key: "fecha", chip: "{fecha}", hint: "Fecha de vencimiento" },
  { key: "dias", chip: "{dias}", hint: "Días que faltan. Es negativo si la cuenta ya venció" },
  { key: "correo", chip: "{correo}", hint: "Correo de la cuenta entregada" },
  { key: "pin", chip: "{pin}", hint: "PIN del perfil" },
  { key: "monto", chip: "{monto}", hint: "Precio o costo (S/)" },
];

const KEYS_VARIABLE = new Set(VARIABLES_MENSAJE.map((item) => item.key));

export const DEFAULTS_PLANTILLA: Record<TipoPlantillaMensaje, { vigente: string; vencido: string }> = {
  recordatorio_vencimiento: { vigente: MENSAJE_RECORDAR_VIGENTE, vencido: MENSAJE_RECORDAR_VENCIDO },
  oferta_renovacion: { vigente: MENSAJE_RENOVAR_VIGENTE, vencido: MENSAJE_RENOVAR_VENCIDO },
  entrega_pedido: { vigente: MENSAJE_ENTREGA_VIGENTE, vencido: MENSAJE_ENTREGA_VENCIDO },
  bienvenida: { vigente: MENSAJE_BIENVENIDA_VIGENTE, vencido: MENSAJE_BIENVENIDA_VENCIDO },
};

const MENU_A_PLANTILLA: Record<Exclude<TipoMensajeWhatsapp, "escribir">, TipoPlantillaMensaje> = {
  recordar: "recordatorio_vencimiento",
  renovar: "oferta_renovacion",
};

export function textoPlantillaUtil(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed : null;
}

export function variablesDesconocidas(cuerpo: string): string[] {
  const seen = new Set<string>();
  for (const match of cuerpo.matchAll(/\{([a-zA-Z_]+)\}/g)) {
    const key = match[1];
    if (!KEYS_VARIABLE.has(key as keyof VariablesMensaje)) seen.add(key);
  }
  return [...seen];
}

export function aplicarVariables(cuerpo: string, vars: VariablesMensaje): string {
  return cuerpo.replace(/\{([a-zA-Z_]+)\}/g, (token, key: string) => {
    if (!KEYS_VARIABLE.has(key as keyof VariablesMensaje)) return token;
    const value = vars[key as keyof VariablesMensaje];
    return value === undefined || value === "" ? token : String(value);
  });
}

export function resolverCuerpoPlantilla(
  tipo: TipoPlantillaMensaje,
  vencido: boolean,
  plantillas?: PlantillasWhatsapp | null,
): string {
  const defaults = DEFAULTS_PLANTILLA[tipo];
  const row = plantillas?.[tipo];
  const custom = row?.activo === false ? null : textoPlantillaUtil(row?.cuerpo);
  if (!custom) return vencido ? defaults.vencido : defaults.vigente;
  if (vencido) return textoPlantillaUtil(row?.cuerpoVencido) ?? custom;
  return custom;
}

export function construirMensaje(
  tipo: TipoPlantillaMensaje,
  vars: VariablesMensaje,
  plantillas?: PlantillasWhatsapp | null,
): string {
  const vencido = Number(vars.dias ?? 0) < 0;
  return aplicarVariables(resolverCuerpoPlantilla(tipo, vencido, plantillas), vars);
}

function plantillaEscribir(vencido: boolean) {
  return vencido ? MENSAJE_ESCRIBIR_VENCIDO : MENSAJE_ESCRIBIR_VIGENTE;
}

export function construirEnlaceWhatsapp({
  telefono,
  nombre,
  servicio,
  fecha,
  dias,
  tipo = "escribir",
  plantillas,
}: DestinoWhatsapp & { tipo?: TipoMensajeWhatsapp; plantillas?: PlantillasWhatsapp | null }): string | null {
  const numero = whatsappParaGuardar(telefono);
  if (!numero) return null;
  const vars: VariablesMensaje = { nombre, servicio, fecha, dias };
  const mensaje =
    tipo === "escribir"
      ? aplicarVariables(plantillaEscribir(dias < 0), vars)
      : construirMensaje(MENU_A_PLANTILLA[tipo], vars, plantillas);
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

export function waLink(phone: string, message: string) {
  const stored = whatsappParaGuardar(phone);
  if (!stored) return "https://wa.me/";
  return `https://wa.me/${stored}?text=${encodeURIComponent(message)}`;
}

export function renewalMessage(
  name: string,
  platform: string,
  endDate: string,
  extras?: { dias?: number; plantillas?: PlantillasWhatsapp | null },
) {
  return construirMensaje(
    "oferta_renovacion",
    { nombre: name, servicio: platform, fecha: endDate, dias: extras?.dias ?? 0 },
    extras?.plantillas,
  );
}

export function reminderMessage(
  name: string,
  platform: string,
  endDate: string,
  extras?: { dias?: number; plantillas?: PlantillasWhatsapp | null },
) {
  return construirMensaje(
    "recordatorio_vencimiento",
    { nombre: name, servicio: platform, fecha: endDate, dias: extras?.dias ?? 0 },
    extras?.plantillas,
  );
}

export function supportMessage(name: string, platform?: string) {
  const extra = platform ? ` de ${platform}` : "";
  return `Hola ${name} 👋 Te escribimos por tu servicio${extra}. ¿En qué podemos ayudarte?`;
}

export function confirmRenewalMessage(name: string, platform: string) {
  return `Hola ${name} 👋 Confirmamos tu renovación de ${platform}. ¿Seguimos con el pago?`;
}

export function deliveryWhatsAppMessage(input: {
  name: string;
  platform: string;
  product: string;
  email?: string;
  password?: string;
  pin?: string;
  profile?: string;
  note?: string;
  monto?: string;
  plantillas?: PlantillasWhatsapp | null;
}) {
  const custom = textoPlantillaUtil(input.plantillas?.entrega_pedido?.cuerpo);
  if (input.plantillas?.entrega_pedido?.activo !== false && custom) {
    return construirMensaje(
      "entrega_pedido",
      {
        nombre: input.name,
        servicio: `${input.platform} (${input.product})`,
        correo: input.email,
        pin: input.pin,
        monto: input.monto,
      },
      input.plantillas,
    );
  }
  const lines = [
    `Hola ${input.name} 👋`,
    `Tu servicio de ${input.platform} (${input.product}) ya está entregado.`,
    input.email ? `Usuario / correo: ${input.email}` : "",
    input.password ? `Clave de la cuenta: ${input.password}` : "",
    input.profile ? `Perfil: ${input.profile}` : "",
    input.pin ? `PIN: ${input.pin}` : "",
    input.note ? input.note : "",
    "También lo ves en tu panel → Centro de acceso.",
  ];
  return lines.filter(Boolean).join("\n");
}
