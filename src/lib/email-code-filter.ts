import type { EmailCodeFilterPolicy, EmailLookupType, Platform } from "@/lib/types";

export type ClassifiableMessage = {
  from: string;
  subject: string;
  snippet?: string;
  id?: string;
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
];

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

const TRAVEL_SUBJECTS = [
  "estoy de viaje",
  "i'm traveling",
  "i am traveling",
  "travel",
  "update your tv",
  "codigo de tv",
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

export function extractAccessCode(text: string) {
  const match = /\b(\d{4,8})\b/.exec(text);
  if (match) return match[1];
  // Códigos escritos con espacios entre dígitos, ej. "8 0 4 2 7 6" (Netflix).
  const spaced = /(?<!\d)(\d(?:[  ]\d){3,7})(?!\d)/.exec(text);
  return spaced ? spaced[1].replace(/[  ]/g, "") : undefined;
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
    label: "Disney · código de acceso",
    from: "disneyplus@mailer.disneyplus.com",
    subject: "Tu código de inicio de sesión 5510",
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
