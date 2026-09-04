export function waLink(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.startsWith("51") ? digits : `51${digits}`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function renewalMessage(name: string, platform: string, endDate: string) {
  return `Hola ${name} 👋 Tu servicio de ${platform} vence el ${endDate}. ¿Deseas renovarlo?`;
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
}) {
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
