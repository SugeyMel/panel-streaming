import type { EmailCodeFilterPolicy, EmailLookupType, Platform } from "@/lib/types";

export type ClassifiableMessage = {
  from: string;
  subject: string;
  snippet?: string;
  id?: string;
  /** Momento en que llegó el mensaje (ms desde 1970), si el proveedor lo entrega. */
  receivedAt?: number;
  /** Destinatario (cabecera To), útil para correos reenviados desde un dominio propio. */
  to?: string;
};

export type MessageVerdict = {
  decision: "allow" | "block";
  type: EmailLookupType;
  category: string;
  reason: string;
};

export const ALWAYS_BLOCKED_CATEGORIES = [
  {
    id: "mailbox",
    label: "Seguridad del buzón",
    description: "Códigos de Gmail, Outlook o Microsoft. Si el cliente los ve, te pueden robar el correo y todas las cuentas.",
  },
  {
    id: "email",
    label: "Cambio de correo",
    description: "Confirmar, cambiar o recuperar el correo de Netflix, Disney, HBO MAX, etc.",
  },
  {
    id: "password",
    label: "Contraseña",
    description: "Restablecer, cambiar o recuperar la clave de la plataforma o del buzón.",
  },
  {
    id: "2fa",
    label: "2FA / respaldo",
    description: "Activar, apagar o ver códigos de respaldo de autenticación.",
  },
  {
    id: "payments",
    label: "Pagos",
    description: "Tarjetas, facturación, métodos de pago o bancos.",
  },
  {
    id: "ownership",
    label: "Titularidad",
    description: "Recuperar la cuenta, transferirla o cambiar el titular.",
  },
] as const;

export const EMAIL_CODES_SQL_HINT =
  "Falta el SQL 0027 en Supabase para buzones sueltos y el historial. Mientras tanto puedes habilitar correos que ya están en Inventario.";

export function defaultEmailFilterPolicy(sellerId: string | null): EmailCodeFilterPolicy {
  return {
    id: sellerId ? `flt_${sellerId}` : "flt_global",
    sellerId,
    allowLoginCode: true,
    allowVerificationCode: true,
    allowNetflixTravel: true,
    allowNetflixHousehold: false,
    extraBlockKeywords: [],
  };
}

export function mergeEmailFilterPolicies(
  globalPolicy: EmailCodeFilterPolicy,
  sellerPolicy: EmailCodeFilterPolicy | null,
): EmailCodeFilterPolicy {
  const seller = sellerPolicy ?? defaultEmailFilterPolicy(globalPolicy.sellerId);
  const extra = [
    ...new Set(
      [...globalPolicy.extraBlockKeywords, ...seller.extraBlockKeywords]
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
  return {
    id: seller.id,
    sellerId: seller.sellerId,
    allowLoginCode: globalPolicy.allowLoginCode && seller.allowLoginCode,
    allowVerificationCode: globalPolicy.allowVerificationCode && seller.allowVerificationCode,
    allowNetflixTravel: globalPolicy.allowNetflixTravel && seller.allowNetflixTravel,
    allowNetflixHousehold: globalPolicy.allowNetflixHousehold && seller.allowNetflixHousehold,
    extraBlockKeywords: extra,
  };
}

function fold(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function domainOf(from: string) {
  const match = /@([^>\s]+)/.exec(from.toLowerCase());
  return (match?.[1] ?? from.toLowerCase()).replace(/[>"]/g, "");
}

function hostMatches(host: string, allowed: string[]) {
  return allowed.some((item) => host === item || host.endsWith(`.${item}`));
}

const MAILBOX_SECURITY_DOMAINS = [
  "accounts.google.com",
  "google.com",
  "gmail.com",
  "mail.google.com",
  "accountprotection.microsoft.com",
  "account.live.com",
  "account.microsoft.com",
  "login.live.com",
  "microsoft.com",
  "outlook.com",
  "office.com",
  "office365.com",
];

const MAILBOX_SECURITY_SENDERS = [
  "no-reply@accounts.google.com",
  "no-reply@google.com",
  "security@microsoft.com",
  "account-security-noreply@accountprotection.microsoft.com",
];

function platformAllowDomains(slug: string) {
  const s = slug.toLowerCase();
  if (s.includes("netflix")) return ["netflix.com"];
  if (s.includes("disney")) return ["disneyplus.com", "disney.com", "bamgrid.com", "bamtech.com"];
  if (s.includes("max") || s.includes("hbo")) return ["max.com", "hbomax.com", "warnermedia.com", "wbd.com"];
  if (s.includes("prime") || s.includes("amazon")) return ["primevideo.com", "amazon.com", "amazon.com.pe"];
  if (s.includes("crunchy")) return ["crunchyroll.com"];
  if (s.includes("spotify")) return ["spotify.com"];
  if (s.includes("apple")) return ["apple.com", "tv.apple.com"];
  if (s.includes("paramount")) return ["paramountplus.com", "paramount.com", "cbsi.com"];
  if (s.includes("youtube")) return ["youtube.com"];
  if (s.includes("vix")) return ["vix.com"];
  if (s.includes("viki")) return ["viki.com", "rakuten.com"];
  if (s.includes("universal")) return ["universalplus.com", "nbcuni.com"];
  if (s.includes("directv")) return ["directv.com", "directvgo.com"];
  if (s.includes("movistar")) return ["movistar.com", "telefonica.com"];
  if (s.includes("claro")) return ["clarovideo.com", "claro.com"];
  return [];
}

const EMAIL_CHANGE = [
  "cambio de correo",
  "cambiar correo",
  "cambiar el correo",
  "change your email",
  "change email",
  "update email",
  "email address changed",
  "nuevo correo",
  "nueva direccion de correo",
  "confirm your email change",
  "verifica tu nuevo correo",
  "recovery email",
  "correo de recuperacion",
  "add a recovery email",
  "agregar correo de recuperacion",
];

const PASSWORD = [
  "restablecer contrasena",
  "restablecer tu contrasena",
  "reset password",
  "reset your password",
  "forgot password",
  "olvido su contrasena",
  "olvidaste tu contrasena",
  "change your password",
  "cambiar contrasena",
  "cambiar tu contrasena",
  "password reset",
  "nueva contrasena",
  "new password",
];

const TWO_FACTOR = [
  "codigos de respaldo",
  "backup codes",
  "turn off 2-step",
  "desactivar la verificacion",
  "two-step verification is off",
  "authenticator app",
  "app de autenticacion",
  "disable two-factor",
  "desactivar 2fa",
];

const PAYMENTS = [
  "metodo de pago",
  "payment method",
  "update your payment",
  "tarjeta de credito",
  "credit card",
  "billing",
  "factura",
  "add a payment",
  "pago rechazado",
  "payment declined",
];

const OWNERSHIP = [
  "recuperar cuenta",
  "account recovery",
  "recover your account",
  "transfer ownership",
  "cambio de titular",
  "titular de la cuenta",
  "verify it's you",
  "somos nosotros",
  "did you request a transfer",
  // Disney: aviso de que se cambió la clave o el correo de la cuenta
  "cuenta de mydisney actualizada",
  "mydisney account updated",
  "se cambio la contrasena",
];

/**
 * Aviso de Disney de que alguien cambió la clave o el correo de la cuenta.
 * Devuelve qué se cambió, o null si el mensaje no es ese aviso.
 */
export function accountChangeNotice(message: ClassifiableMessage): "password" | "email" | "account" | null {
  const host = domainOf(message.from);
  if (!hostMatches(host, ["disneyplus.com", "disney.com"])) return null;
  const subject = fold(message.subject);
  // El código de acceso único no es un aviso de cambio, aunque el cuerpo hable del correo.
  if (subject.includes("codigo de acceso unico")) return null;
  const mentionsAccount = subject.includes("mydisney") || subject.includes("cuenta de disney");
  const mentionsChange =
    subject.includes("actualiz") ||
    subject.includes("updated") ||
    subject.includes("changed") ||
    subject.includes("cambio") ||
    subject.includes("se cambio");
  if (!mentionsAccount || !mentionsChange) return null;
  const text = fold(`${message.subject} ${message.snippet ?? ""}`);
  if (text.includes("contrasena") || text.includes("password")) return "password";
  if (text.includes("correo") || text.includes("email")) return "email";
  return "account";
}

/**
 * Correo de inicio de Disney+: asunto "Tu código de acceso único para Disney+"
 * (remitente disneyplus@trx.mail2.disneyplus.com). El cuerpo suele mencionar
 * "dirección de correo electrónico" o "reciente compra"; eso no lo convierte en un aviso de cambio.
 */
export function isDisneyLoginCode(message: ClassifiableMessage) {
  const host = domainOf(message.from);
  if (!hostMatches(host, ["disneyplus.com", "disney.com", "bamgrid.com", "bamtech.com"])) return false;
  const subject = fold(message.subject);
  if (!subject.includes("codigo de acceso unico")) return false;
  if (includesAny(subject, PASSWORD) || includesAny(subject, EMAIL_CHANGE)) return false;
  return true;
}

const LOGIN_SUBJECTS = [
  "sign-in code",
  "signin code",
  "sign in code",
  "codigo de inicio",
  "codigo de acceso",
  "your code is",
  "tu codigo es",
  "codigo temporal",
  "one-time code",
  "otp",
  // HBO Max: "Tu código de un solo uso"
  "codigo de un solo uso",
  "un solo uso",
  "single-use code",
  "one-time passcode",
];

const VERIFICATION_SUBJECTS = [
  "verification code",
  "codigo de verificacion",
  "verify your sign-in",
  "confirma tu inicio",
  "security code",
  "codigo de seguridad",
  // Netflix: "Este código vence en 15 minutos" / "Código de verificación: 804276"
  "codigo vence en",
  "codigo expira en",
  "code expires in",
];

// Netflix: "Tu código de acceso temporal de Netflix" (trae un botón "Solicitar código", no el número).
const NETFLIX_TEMP_ACCESS = [
  "codigo de acceso temporal",
  "temporary access code",
];

// Netflix: "Importante: Cómo cambiar tu hogar Netflix" (botón "Sí, lo solicité yo" → página "Actualizar hogar").
const NETFLIX_HOUSEHOLD_LINK = [
  "como cambiar tu hogar netflix",
  "cambiar tu hogar netflix",
  "how to update your netflix household",
  "update your netflix household",
  "change your netflix household",
];

const TRAVEL_SUBJECTS = [
  "estoy de viaje",
  "i'm traveling",
  "i am traveling",
  "travel",
  "update your tv",
  "codigo de tv",
];

// Disney+: "¿Vas a actualizar tu Hogar de Disney+?"
const DISNEY_HOUSEHOLD = [
  "actualizar tu hogar de disney",
  "hogar de disney",
  "solicito actualizar el hogar",
  "disney+ household",
  "update your household",
];

const HOUSEHOLD_SUBJECTS = [
  "actualizar hogar",
  "update household",
  "household",
  "hogar de netflix",
];

function includesAny(haystack: string, needles: string[]) {
  return needles.some((item) => haystack.includes(item));
}

function isMailboxSecurity(from: string, host: string, text: string) {
  if (MAILBOX_SECURITY_SENDERS.some((item) => from.includes(item))) return true;
  if (hostMatches(host, MAILBOX_SECURITY_DOMAINS)) {
    if (host.endsWith("youtube.com") || host === "youtube.com") return false;
    if (host.endsWith("apple.com") && !host.includes("id.apple") && !host.includes("appleid")) {
      return includesAny(text, ["apple id", "appleid", "id de apple", "cuenta de apple"]);
    }
    return true;
  }
  return includesAny(text, [
    "verificacion de google",
    "google verification",
    "codigo de google",
    "gmail security",
    "seguridad de gmail",
    "microsoft account",
    "cuenta microsoft",
  ]);
}

export function classifyEmailMessage(
  message: ClassifiableMessage,
  policy: EmailCodeFilterPolicy,
  platform?: Pick<Platform, "slug" | "name"> | null,
): MessageVerdict {
  const from = fold(message.from);
  const host = domainOf(message.from);
  const text = fold(`${message.subject} ${message.snippet ?? ""}`);
  const extra = policy.extraBlockKeywords.map(fold).filter(Boolean);

  if (isMailboxSecurity(from, host, text)) {
    return {
      decision: "block",
      type: "UNKNOWN_BLOCKED",
      category: "mailbox",
      reason: "Bloqueado: seguridad del buzón (Gmail/Outlook). El cliente no debe ver este mensaje.",
    };
  }
  // Disney+ "Tu código de acceso único": el cuerpo menciona el correo o una compra, pero es un código de inicio.
  // Los avisos reales (asunto de cambio de clave o de correo) no entran aquí.
  if (isDisneyLoginCode(message)) {
    return policy.allowLoginCode
      ? {
          decision: "allow",
          type: "LOGIN_CODE",
          category: "login",
          reason: "Permitido: código de acceso único de Disney+.",
        }
      : {
          decision: "block",
          type: "UNKNOWN_BLOCKED",
          category: "login",
          reason: "Bloqueado: el código de inicio de sesión está apagado.",
        };
  }
  if (includesAny(text, EMAIL_CHANGE)) {
    return {
      decision: "block",
      type: "UNKNOWN_BLOCKED",
      category: "email",
      reason: "Bloqueado: intento de cambio o recuperación de correo.",
    };
  }
  if (includesAny(text, PASSWORD)) {
    return {
      decision: "block",
      type: "UNKNOWN_BLOCKED",
      category: "password",
      reason: "Bloqueado: cambio o restablecimiento de contraseña.",
    };
  }
  if (includesAny(text, TWO_FACTOR)) {
    return {
      decision: "block",
      type: "UNKNOWN_BLOCKED",
      category: "2fa",
      reason: "Bloqueado: configuración o códigos de respaldo de 2FA.",
    };
  }
  if (includesAny(text, PAYMENTS)) {
    return {
      decision: "block",
      type: "UNKNOWN_BLOCKED",
      category: "payments",
      reason: "Bloqueado: pagos, tarjetas o facturación.",
    };
  }
  if (includesAny(text, OWNERSHIP)) {
    return {
      decision: "block",
      type: "UNKNOWN_BLOCKED",
      category: "ownership",
      reason: "Bloqueado: recuperación o cambio de titular.",
    };
  }
  if (extra.length && includesAny(text, extra)) {
    return {
      decision: "block",
      type: "UNKNOWN_BLOCKED",
      category: "custom",
      reason: "Bloqueado por una palabra extra que configuraste.",
    };
  }

  const slug = platform?.slug ?? "";
  const allowedHosts = platformAllowDomains(slug);
  const senderOk = allowedHosts.length ? hostMatches(host, allowedHosts) : false;
  const isNetflix = slug.toLowerCase().includes("netflix");

  if (isNetflix && includesAny(text, NETFLIX_TEMP_ACCESS) && (senderOk || host.endsWith("netflix.com"))) {
    return policy.allowNetflixTravel
      ? {
          decision: "allow",
          type: "NETFLIX_TRAVEL_CODE",
          category: "travel_link",
          reason: "Permitido: código de acceso temporal de Netflix (se obtiene con el enlace).",
        }
      : {
          decision: "block",
          type: "UNKNOWN_BLOCKED",
          category: "travel",
          reason: "Bloqueado: el código de viaje / TV de Netflix está apagado.",
        };
  }
  if (isNetflix && includesAny(text, NETFLIX_HOUSEHOLD_LINK) && (senderOk || host.endsWith("netflix.com"))) {
    return policy.allowNetflixHousehold
      ? {
          decision: "allow",
          type: "NETFLIX_HOUSEHOLD_ACTION",
          category: "household_link",
          reason: "Permitido: actualizar hogar de Netflix (se hace con el enlace).",
        }
      : {
          decision: "block",
          type: "UNKNOWN_BLOCKED",
          category: "household",
          reason: "Bloqueado: actualizar hogar de Netflix está apagado.",
        };
  }
  if (policy.allowNetflixTravel && isNetflix && includesAny(text, TRAVEL_SUBJECTS) && (senderOk || host.endsWith("netflix.com"))) {
    return {
      decision: "allow",
      type: "NETFLIX_TRAVEL_CODE",
      category: "travel",
      reason: "Permitido: código de viaje / TV de Netflix.",
    };
  }
  if (
    policy.allowNetflixHousehold &&
    isNetflix &&
    includesAny(text, HOUSEHOLD_SUBJECTS) &&
    (senderOk || host.endsWith("netflix.com"))
  ) {
    return {
      decision: "allow",
      type: "NETFLIX_HOUSEHOLD_ACTION",
      category: "household",
      reason: "Permitido: actualizar hogar de Netflix.",
    };
  }
  // Disney Hogar: va antes que "inicio de sesión" porque el correo también dice "código de acceso".
  if (slug.toLowerCase().includes("disney") && senderOk && includesAny(text, DISNEY_HOUSEHOLD)) {
    return policy.allowDisneyHousehold
      ? {
          decision: "allow",
          type: "NETFLIX_HOUSEHOLD_ACTION",
          category: "household",
          reason: "Permitido: actualizar Hogar de Disney+.",
        }
      : {
          decision: "block",
          type: "UNKNOWN_BLOCKED",
          category: "household",
          reason: "Bloqueado: actualizar Hogar de Disney+ está desactivado.",
        };
  }
  if (senderOk && policy.allowLoginCode && includesAny(text, LOGIN_SUBJECTS)) {
    return {
      decision: "allow",
      type: "LOGIN_CODE",
      category: "login",
      reason: "Permitido: código de inicio de sesión de la plataforma.",
    };
  }
  if (senderOk && policy.allowVerificationCode && includesAny(text, VERIFICATION_SUBJECTS)) {
    return {
      decision: "allow",
      type: "VERIFICATION_CODE",
      category: "verification",
      reason: "Permitido: código de verificación de la plataforma.",
    };
  }

  return {
    decision: "block",
    type: "UNKNOWN_BLOCKED",
    category: "unmatched",
    reason: "Bloqueado por defecto: el remitente o el asunto no coinciden con un código de acceso.",
  };
}

/**
 * Convierte el HTML de un correo en texto legible.
 * Quita estilos, scripts y comentarios: ahí hay colores como "#707070"
 * que antes se confundían con el código.
 */
const NETFLIX_ACTION_PATHS = {
  travel: "/account/travel/verify",
  household: "/account/update-primary-location",
} as const;

/**
 * Enlace de acción de un correo de Netflix: "Solicitar código" (acceso temporal) o "Sí, lo solicité yo" (hogar).
 * Solo se acepta esa ruta exacta de netflix.com: nunca los enlaces de contraseña o de cerrar sesión.
 */
export function extractNetflixActionLink(raw: string, kind: keyof typeof NETFLIX_ACTION_PATHS) {
  const path = NETFLIX_ACTION_PATHS[kind];
  const pattern = new RegExp(`https://www\\.netflix\\.com${path.replace(/\//g, "\\/")}\\?[^\\s"'<>\\]\\)]+`, "gi");
  for (const match of raw.matchAll(pattern)) {
    try {
      const url = new URL(match[0].replace(/&amp;/gi, "&"));
      if (url.hostname === "www.netflix.com" && url.pathname === path) return url.toString();
    } catch {
      /* siguiente */
    }
  }
  return null;
}

export function extractNetflixTravelLink(raw: string) {
  return extractNetflixActionLink(raw, "travel");
}

export function htmlToText(html: string) {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(style|script|head|title)\b[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#\d+;|&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ");
}

export function extractAccessCode(text: string) {
  // Ignora números pegados a "#" (colores CSS), a letras o a otros dígitos.
  const match = /(?<![#\w])(\d{4,8})(?![\w])/.exec(text);
  if (match) return match[1];
  // Códigos escritos con espacios entre dígitos, ej. "8 0 4 2 7 6" (Netflix).
  const spaced = /(?<!\d)(\d(?:[  ]\d){3,7})(?!\d)/.exec(text);
  return spaced ? spaced[1].replace(/[  ]/g, "") : undefined;
}

/** Disney+ manda el código de 6 dígitos en el cuerpo. Se prefiere ese, no un año u otro número. */
export function extractDisneyAccessCode(text: string) {
  const matches = [...text.matchAll(/(?<!\d)(\d{6})(?!\d)/g)];
  if (!matches.length) return extractAccessCode(text);
  const hint = text.search(/c[oó]digo|code|passcode/i);
  if (hint >= 0) {
    const after = matches.find((item) => (item.index ?? 0) >= hint);
    if (after) return after[1];
  }
  return matches[0][1];
}

export function demoCodeForPlatform(slug: string) {
  const s = slug.toLowerCase();
  if (s.includes("netflix")) return "4827";
  if (s.includes("disney")) return "5510";
  if (s.includes("max") || s.includes("hbo")) return "1934";
  if (s.includes("prime") || s.includes("amazon")) return "7741";
  if (s.includes("spotify")) return "2209";
  return "3920";
}

export function simulatedRecentMessages(platform: Pick<Platform, "slug" | "name">): ClassifiableMessage[] {
  const slug = platform.slug.toLowerCase();
  const hosts = platformAllowDomains(slug);
  const host = hosts[0] ?? "example.com";
  const from = `info@account.${host}`;
  const code = demoCodeForPlatform(slug);
  const loginSubject = slug.includes("netflix")
    ? `Your Netflix sign-in code is ${code}`
    : `Código de inicio de sesión ${code}`;

  return [
    {
      from: "no-reply@accounts.google.com",
      subject: "Código de verificación de Google",
      snippet: "Usa este código para verificar que eres tú.",
    },
    {
      from,
      subject: "Confirma el cambio de correo de tu cuenta",
      snippet: "Alguien pidió cambiar el correo electrónico asociado.",
    },
    {
      from,
      subject: "Restablecer contraseña",
      snippet: "Sigue este enlace para crear una nueva contraseña.",
    },
    {
      from,
      subject: loginSubject,
      snippet: `Tu código temporal es ${code}. Caduca en unos minutos.`,
    },
    {
      from: "info@account.netflix.com",
      subject: "Estoy de viaje — código de TV",
      snippet: "Usa este código para actualizar tu televisor.",
    },
  ];
}

export const FILTER_TEST_PRESETS = [
  {
    label: "Netflix · código de inicio",
    from: "info@account.netflix.com",
    subject: "Your Netflix sign-in code is 4827",
    slug: "netflix",
  },
  {
    label: "Netflix · cambio de correo",
    from: "info@account.netflix.com",
    subject: "Confirma el cambio de correo de tu cuenta",
    slug: "netflix",
  },
  {
    label: "Gmail · código de Google",
    from: "no-reply@accounts.google.com",
    subject: "Código de verificación de Google",
    slug: "netflix",
  },
  {
    label: "Netflix · restablecer contraseña",
    from: "info@account.netflix.com",
    subject: "Restablecer contraseña",
    slug: "netflix",
  },
  {
    label: "Netflix · estoy de viaje",
    from: "info@account.netflix.com",
    subject: "Estoy de viaje",
    slug: "netflix",
  },
  {
    label: "Disney · código de acceso único",
    from: "disneyplus@trx.mail2.disneyplus.com",
    subject: "Tu código de acceso único para Disney+",
    slug: "disney",
  },
  {
    label: "Max · método de pago",
    from: "help@max.com",
    subject: "Actualiza tu método de pago",
    slug: "max",
  },
] as const;

export function mailboxMatchesService(mailboxEmail: string, platformEmail: string) {
  return fold(mailboxEmail) === fold(platformEmail);
}
