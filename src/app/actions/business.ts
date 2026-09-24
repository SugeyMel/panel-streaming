"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAppSession, requireRole } from "@/lib/auth/get-session";
import { isPhoneLogin, normalizePhone, phoneToAuthEmail, toAuthEmail } from "@/lib/auth/phone-login";
import { whatsappParaGuardar } from "@/lib/clientes";
import { isHomeImageSlot } from "@/lib/home-images";
import {
  MAX_CUERPO_WHATSAPP,
  textoPlantillaUtil,
  type TipoPlantillaMensaje,
} from "@/lib/whatsapp";
import { uiCustomerStatusToDb, uiSellerStatusToDb } from "@/lib/db/map";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { supplierProductImagePublicUrl } from "@/lib/supplier-product-images";
import { writeSupplierProductImage } from "@/lib/supplier-product-upload";
import { DEFAULT_SUPPORT_HOURS, type CustomerStatus, type SellerStatus } from "@/lib/types";
import { parsePricingToken, wholesalePricing, withPricingToken, withSortToken, nextWholesaleSortOrder } from "@/lib/wholesale";
import { canonicalPlatformName } from "@/lib/platform-logos";
import { copySellerVisualTemplate } from "@/lib/seller-visual-template";

const ALLOWED_MIME = new Set(["image/png", "image/jpeg"]);
const ALLOWED_LOGO_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_VOUCHER_BYTES = 5 * 1024 * 1024;
const MAX_LOGO_BYTES = 8 * 1024 * 1024;
const MAX_HOME_IMAGE_BYTES = 8 * 1024 * 1024;
const PLATFORM_LOGO_BUCKET = "platform-logos";
const CUSTOMER_LOGO_SQL_HINT =
  "Falta ejecutar el SQL 0029_platform_customer_logo.sql en Supabase para el logo cuadrado de Clientes.";
const SUPPORT_HOURS_SQL_HINT =
  "Falta ejecutar el SQL 0031_seller_support_hours.sql en Supabase para el horario de atención.";
const PAYMENT_QR_BUCKET = "seller-qr";
const SELLER_LOGO_BUCKET = "seller-logos";
const MAX_QR_BYTES = 2 * 1024 * 1024;

function voucherMime(file: File) {
  if (ALLOWED_MIME.has(file.type)) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  return null;
}

function logoMime(file: File) {
  if (file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg")) return null;
  if (ALLOWED_LOGO_MIME.has(file.type)) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  return null;
}

function logoExt(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

function missingCustomerLogoColumn(message?: string) {
  return /customer_logo_path/i.test(message ?? "");
}

function ensureLive() {
  if (!isSupabaseConfigured()) {
    return { ok: false as const, error: "Supabase no está configurado. La acción quedó en modo demo." };
  }
  return null;
}

function intendedRoleFits(intended: string, role: string) {
  if (intended === "admin") return role === "superadmin" || role === "support";
  if (intended === "seller") return role === "seller";
  if (intended === "customer") return role === "customer";
  return true;
}

function intendedRoleLabel(intended: string) {
  if (intended === "admin") return "administrador";
  if (intended === "seller") return "vendedor";
  if (intended === "customer") return "cliente";
  return "ese rol";
}

export async function signInAction(formData: FormData) {
  const identifier = String(formData.get("identifier") ?? formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const intendedRole = String(formData.get("intendedRole") ?? "").trim();
  if (!identifier || !password) {
    return { ok: false, error: "Celular o correo, y clave, son obligatorios." };
  }

  if (!isSupabaseConfigured()) {
    const dest =
      intendedRole === "admin"
        ? "/admin"
        : intendedRole === "seller"
          ? "/panel"
          : intendedRole === "customer"
            ? "/cliente"
            : identifier.includes("admin")
              ? "/admin"
              : identifier.includes("cliente") || identifier.includes("carlos") || isPhoneLogin(identifier)
                ? "/cliente"
                : "/panel";
    redirect(dest);
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No se pudo crear el cliente de Supabase." };

  const email = toAuthEmail(identifier);
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: "Celular/correo o clave incorrectos." };

  const session = await getAppSession();
  if (intendedRole && !intendedRoleFits(intendedRole, session.role)) {
    await supabase.auth.signOut();
    return {
      ok: false,
      error: `Esa cuenta no es de ${intendedRoleLabel(intendedRole)}. Elige la pestaña correcta.`,
    };
  }

  const next = String(formData.get("next") ?? "");
  const safeNext =
    next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : "";

  if (session.role === "superadmin" || session.role === "support") redirect("/admin");
  if (session.role === "seller") redirect("/panel");
  if (safeNext.startsWith("/cliente") || safeNext.startsWith("/tienda/")) redirect(safeNext);
  redirect("/cliente");
}

/**
 * Acceso de clientes y vendedores solo con correo o celular (sin clave).
 * Las cuentas de administrador quedan excluidas: deben usar correo y clave.
 * Crea la sesión desde el servidor con un enlace de un solo uso.
 */
export async function signInWithoutPasswordAction(formData: FormData) {
  const identifier = String(formData.get("identifier") ?? "").trim();
  if (!identifier) return { ok: false, error: "Ingresa tu correo o celular." };

  if (!isSupabaseConfigured()) {
    if (identifier.includes("admin")) {
      return { ok: false, error: "Las cuentas de administrador entran con correo y clave." };
    }
    redirect(
      identifier.includes("cliente") || identifier.includes("carlos") || isPhoneLogin(identifier)
        ? "/cliente"
        : "/panel",
    );
  }

  const notFound = { ok: false, error: "No encontramos una cuenta con ese correo o celular." };
  const admin = createServiceClient();
  const supabase = await createClient();
  if (!admin || !supabase) return { ok: false, error: "No se pudo iniciar sesión. Falta configuración del servidor." };

  const email = toAuthEmail(identifier);
  if (!email) return notFound;

  // generateLink crearía la cuenta si no existe, así que primero comprobamos que exista.
  let userId: string | null = null;
  for (let page = 1; page <= 20 && !userId; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return { ok: false, error: "No se pudo iniciar sesión. Inténtalo de nuevo." };
    userId = data.users.find((user) => (user.email ?? "").toLowerCase() === email)?.id ?? null;
    if (data.users.length < 1000) break;
  }
  if (!userId) return notFound;

  const { data: profile } = await admin.from("profiles").select("role").eq("id", userId).maybeSingle();
  const role = String(profile?.role ?? "customer");
  if (role === "superadmin" || role === "support") {
    return { ok: false, error: "Las cuentas de administrador entran con correo y clave (Acceso administrador)." };
  }

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const tokenHash = link?.properties?.hashed_token;
  if (linkError || !tokenHash) return { ok: false, error: "No se pudo iniciar sesión. Inténtalo de nuevo." };

  const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
  if (verifyError) return { ok: false, error: "No se pudo iniciar sesión. Inténtalo de nuevo." };

  const next = String(formData.get("next") ?? "");
  const safeNext =
    next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : "";

  if (role === "seller") redirect("/panel");
  if (safeNext.startsWith("/cliente") || safeNext.startsWith("/tienda/")) redirect(safeNext);
  redirect("/cliente");
}

export async function signOutAction() {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/login");
}

async function ensureSellerWebAccess(options: {
  profileId: string | null;
  email: string;
  name: string;
  whatsapp: string;
  password: string;
}): Promise<{ ok: true; profileId: string } | { ok: false; error: string }> {
  const admin = createServiceClient();
  if (!admin) {
    return { ok: false, error: "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor para crear el acceso." };
  }

  if (options.profileId) {
    const patch: {
      email: string;
      email_confirm: true;
      user_metadata: { full_name: string; role: "seller"; phone: string };
      password?: string;
    } = {
      email: options.email,
      email_confirm: true,
      user_metadata: { full_name: options.name, role: "seller", phone: options.whatsapp },
    };
    if (options.password) patch.password = options.password;
    const { error } = await admin.auth.admin.updateUserById(options.profileId, patch);
    if (error) return { ok: false, error: error.message };
    await admin
      .from("profiles")
      .update({
        role: "seller",
        full_name: options.name,
        email: options.email,
        whatsapp: options.whatsapp,
      })
      .eq("id", options.profileId);
    return { ok: true, profileId: options.profileId };
  }

  if (!options.password) {
    return { ok: false, error: "La clave de acceso es obligatoria." };
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: options.email,
    password: options.password,
    email_confirm: true,
    user_metadata: { full_name: options.name, role: "seller", phone: options.whatsapp },
  });
  if (createError || !created.user) {
    return { ok: false, error: createError?.message ?? "No se pudo crear el acceso a la web." };
  }
  await admin
    .from("profiles")
    .update({
      role: "seller",
      full_name: options.name,
      email: options.email,
      whatsapp: options.whatsapp,
    })
    .eq("id", created.user.id);
  return { ok: true, profileId: created.user.id };
}

export async function upsertSellerAction(formData: FormData) {
  const blocked = ensureLive();
  if (blocked) return blocked;
  const session = await getAppSession();
  requireRole(session, ["superadmin"]);
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Sin cliente" };

  const id = String(formData.get("id") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");
  const payload = {
    name: String(formData.get("name") ?? "").trim(),
    business_name: String(formData.get("businessName") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    whatsapp: whatsappParaGuardar(String(formData.get("whatsapp") ?? "")),
    status: uiSellerStatusToDb(String(formData.get("status") ?? "pendiente") as SellerStatus),
    yape_holder: String(formData.get("yapeHolder") ?? ""),
    yape_number: String(formData.get("yapeNumber") ?? ""),
    plin_holder: String(formData.get("plinHolder") ?? ""),
    plin_number: String(formData.get("plinNumber") ?? ""),
  };
  if (!payload.name || !payload.slug) return { ok: false, error: "Nombre y slug son obligatorios." };
  if (!payload.business_name) return { ok: false, error: "El nombre del negocio es obligatorio." };
  if (!payload.email || !payload.email.includes("@")) {
    return { ok: false, error: "El correo es obligatorio para el acceso a la web." };
  }
  if (!payload.whatsapp) return { ok: false, error: "El WhatsApp debe tener 9 dígitos" };

  let profileId: string | null = null;
  if (id) {
    const { data: existing } = await supabase.from("sellers").select("profile_id").eq("id", id).maybeSingle();
    profileId = existing?.profile_id ? String(existing.profile_id) : null;
  }

  const creatingLogin = !id || !profileId || Boolean(password);
  if (creatingLogin) {
    if (password.length < 6) return { ok: false, error: "La clave de acceso debe tener al menos 6 caracteres." };
    if (password !== confirm) return { ok: false, error: "Las claves no coinciden." };
  }

  const access = await ensureSellerWebAccess({
    profileId,
    email: payload.email,
    name: payload.name,
    whatsapp: payload.whatsapp,
    password,
  });
  if (!access.ok) return access;
  profileId = access.profileId;

  const row = profileId ? { ...payload, profile_id: profileId } : payload;
  if (id) {
    const { error } = await supabase.from("sellers").update(row).eq("id", id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { data: created, error } = await supabase.from("sellers").insert(row).select("id").maybeSingle();
    if (error) {
      if (profileId) {
        const admin = createServiceClient();
        await admin?.auth.admin.deleteUser(profileId);
      }
      return { ok: false, error: error.message };
    }
    if (created?.id) await copySellerVisualTemplate(String(created.id));
  }
  revalidatePath("/admin/vendedores");
  return { ok: true };
}

export async function deleteSellerAction(id: string) {
  const blocked = ensureLive();
  if (blocked) return blocked;
  const session = await getAppSession();
  requireRole(session, ["superadmin"]);
  const writer = createServiceClient() ?? (await createClient());
  if (!writer) return { ok: false, error: "Sin cliente" };

  const sellerId = id.trim();
  if (!sellerId) return { ok: false, error: "Vendedor no encontrado." };

  const { data: existing, error: loadError } = await writer
    .from("sellers")
    .select("id, profile_id")
    .eq("id", sellerId)
    .maybeSingle();
  if (loadError) return { ok: false, error: loadError.message };
  if (!existing) return { ok: false, error: "Vendedor no encontrado." };

  const profileId = existing.profile_id ? String(existing.profile_id) : null;

  const { error: wholesaleError } = await writer.from("wholesale_sales").delete().eq("seller_id", sellerId);
  if (wholesaleError) return { ok: false, error: wholesaleError.message };

  const { error } = await writer.from("sellers").delete().eq("id", sellerId);
  if (error) return { ok: false, error: error.message };

  if (profileId) {
    const admin = createServiceClient();
    await admin?.auth.admin.deleteUser(profileId);
  }

  revalidatePath("/admin/vendedores");
  revalidatePath("/admin");
  return { ok: true };
}

export async function setSellerStatusAction(id: string, status: SellerStatus) {
  const blocked = ensureLive();
  if (blocked) return blocked;
  const session = await getAppSession();
  requireRole(session, ["superadmin"]);
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Sin cliente" };
  const { error } = await supabase
    .from("sellers")
    .update({ status: uiSellerStatusToDb(status) })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/vendedores");
  return { ok: true };
}

export async function upsertPlatformAction(formData: FormData) {
  const blocked = ensureLive();
  if (blocked) return blocked;
  const session = await getAppSession();
  requireRole(session, ["superadmin"]);
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Sin cliente" };
  const db = supabase;
  const id = String(formData.get("id") ?? "");
  const rawName = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const payload = {
    name: canonicalPlatformName({ name: rawName, slug }) || rawName,
    slug,
    tagline: String(formData.get("tagline") ?? ""),
    available: String(formData.get("available") ?? "true") === "true",
  };
  if (!payload.name || !payload.slug) return { ok: false, error: "Nombre y slug son obligatorios." };

  let platformId = id;
  if (id) {
    const { error } = await supabase.from("platforms").update(payload).eq("id", id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { data, error } = await supabase.from("platforms").insert(payload).select("id").single();
    if (error) return { ok: false, error: error.message };
    platformId = String(data.id);
  }

  const file = formData.get("logo");
  const customerFile = formData.get("customerLogo");
  const removeLogo = String(formData.get("removeLogo") ?? "") === "1";
  const removeCustomerLogo = String(formData.get("removeCustomerLogo") ?? "") === "1";
  const hasCustomerFile = customerFile instanceof File && customerFile.size > 0;
  const uploader = createServiceClient() ?? supabase;

  const currentSelect = await supabase
    .from("platforms")
    .select("logo_path, customer_logo_path")
    .eq("id", platformId)
    .maybeSingle();

  let previousPath: string | null = null;
  let previousCustomerPath: string | null = null;
  if (currentSelect.error && missingCustomerLogoColumn(currentSelect.error.message)) {
    if (hasCustomerFile || removeCustomerLogo) return { ok: false, error: CUSTOMER_LOGO_SQL_HINT };
    const fallback = await supabase.from("platforms").select("logo_path").eq("id", platformId).maybeSingle();
    previousPath = fallback.data?.logo_path ? String(fallback.data.logo_path) : null;
  } else if (currentSelect.error) {
    return { ok: false, error: currentSelect.error.message };
  } else {
    previousPath = currentSelect.data?.logo_path ? String(currentSelect.data.logo_path) : null;
    const raw = (currentSelect.data as { customer_logo_path?: string | null } | null)?.customer_logo_path;
    previousCustomerPath = raw ? String(raw) : null;
  }

  async function savePlatformImage(
    incoming: FormDataEntryValue | null,
    remove: boolean,
    previous: string | null,
    column: "logo_path" | "customer_logo_path",
    stem: "logo" | "clientes",
  ) {
    const hasIncoming = incoming instanceof File && incoming.size > 0;
    if (remove && !hasIncoming) {
      if (previous) await uploader.storage.from(PLATFORM_LOGO_BUCKET).remove([previous]);
      const { error } = await db.from("platforms").update({ [column]: null }).eq("id", platformId);
      if (error) {
        if (column === "customer_logo_path" && missingCustomerLogoColumn(error.message)) {
          return CUSTOMER_LOGO_SQL_HINT;
        }
        return error.message;
      }
      return null;
    }
    if (!hasIncoming || !(incoming instanceof File)) return null;
    const mime = logoMime(incoming);
    if (!mime) return "El logo debe ser PNG, WEBP o JPG. SVG no está permitido.";
    if (incoming.size > MAX_LOGO_BYTES) return "El logo no puede superar 8 MB.";
    const path = `${platformId}/${stem}.${logoExt(mime)}`;
    if (previous && previous !== path) {
      await uploader.storage.from(PLATFORM_LOGO_BUCKET).remove([previous]);
    }
    const { error: uploadError } = await uploader.storage
      .from(PLATFORM_LOGO_BUCKET)
      .upload(path, incoming, { upsert: true, contentType: mime });
    if (uploadError) return uploadError.message;
    const { error } = await db.from("platforms").update({ [column]: path }).eq("id", platformId);
    if (error) {
      if (column === "customer_logo_path" && missingCustomerLogoColumn(error.message)) {
        return CUSTOMER_LOGO_SQL_HINT;
      }
      return error.message;
    }
    return null;
  }

  const storeError = await savePlatformImage(file, removeLogo, previousPath, "logo_path", "logo");
  if (storeError) return { ok: false, error: storeError };
  const customerError = await savePlatformImage(
    customerFile,
    removeCustomerLogo,
    previousCustomerPath,
    "customer_logo_path",
    "clientes",
  );
  if (customerError) return { ok: false, error: customerError };

  revalidatePath("/admin/plataformas");
  revalidatePath("/admin/mayorista");
  revalidatePath("/panel");
  revalidatePath("/panel/productos");
  revalidatePath("/panel/inventario");
  revalidatePath("/panel/clientes");
  revalidatePath("/cliente");
  revalidatePath("/cliente/comprar");
  revalidatePath("/tienda", "layout");
  revalidatePath("/");
  return { ok: true };
}

export async function upsertCustomerAction(formData: FormData) {
  const blocked = ensureLive();
  if (blocked) return blocked;
  const session = await getAppSession();
  requireRole(session, ["seller"]);
  const supabase = await createClient();
  if (!supabase || !session.sellerId) return { ok: false, error: "Vendedor no encontrado." };
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const whatsapp = whatsappParaGuardar(String(formData.get("whatsapp") ?? ""));
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const payload = {
    seller_id: session.sellerId,
    name,
    whatsapp,
    email: email || null,
    status: uiCustomerStatusToDb(String(formData.get("status") ?? "activo") as CustomerStatus),
  };
  if (!payload.name) return { ok: false, error: "Nombre y celular son obligatorios." };
  if (!payload.whatsapp) return { ok: false, error: "El WhatsApp debe tener 9 dígitos" };
  if (id) {
    const { data: existing } = await supabase.from("customers").select("seller_id").eq("id", id).maybeSingle();
    if (!existing || existing.seller_id !== session.sellerId) return { ok: false, error: "No autorizado." };
  }

  let profileId: string | null = null;
  if (!id && password) {
    if (password.length < 6) return { ok: false, error: "La clave debe tener al menos 6 caracteres." };
    const admin = createServiceClient();
    if (!admin) {
      return { ok: false, error: "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor para crear el acceso." };
    }
    const authEmail = phoneToAuthEmail(whatsapp);
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, role: "customer", phone: whatsapp },
    });
    if (createError || !created.user) {
      return { ok: false, error: createError?.message ?? "No se pudo crear el acceso." };
    }
    profileId = created.user.id;
    await admin
      .from("profiles")
      .update({ role: "customer", full_name: name, email: authEmail, whatsapp })
      .eq("id", profileId);
  }

  const row = profileId ? { ...payload, profile_id: profileId } : payload;
  const { data, error } = id
    ? await supabase.from("customers").update(payload).eq("id", id).eq("seller_id", session.sellerId).select("id").maybeSingle()
    : await supabase.from("customers").insert(row).select("id").maybeSingle();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/panel/clientes");
  revalidatePath("/panel/inventario");
  return { ok: true, id: data?.id ?? id };
}

const PRODUCT_DURATION_DAYS = [30, 90, 180, 365] as const;

function optionalMoney(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim().replace(",", ".");
  if (!raw) return null;
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return amount;
}

export async function upsertProductAction(formData: FormData) {
  const blocked = ensureLive();
  if (blocked) return blocked;
  const session = await getAppSession();
  requireRole(session, ["seller"]);
  const supabase = await createClient();
  if (!supabase || !session.sellerId) return { ok: false, error: "Vendedor no encontrado." };
  const platformId = String(formData.get("platformId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "");
  const costPrice = Number(formData.get("costPrice") || 0);
  const stock = Number(formData.get("stock") || 0);
  const status = String(formData.get("active") ?? "true") === "true" ? "active" : "inactive";
  const onOffer = formData.getAll("onOffer").includes("true");
  const compareAt = optionalMoney(formData.get("compareAtPrice"));
  const groupPlatformId = String(formData.get("groupPlatformId") ?? platformId);
  const groupName = String(formData.get("groupName") ?? name);
  if (!name || !platformId) return { ok: false, error: "Completa producto y plataforma." };

  const { data: siblings, error: loadError } = await supabase
    .from("products")
    .select("*")
    .eq("seller_id", session.sellerId)
    .eq("platform_id", groupPlatformId)
    .eq("name", groupName);
  if (loadError) return { ok: false, error: loadError.message };

  const prices = PRODUCT_DURATION_DAYS.map((days) => ({
    days,
    amount: optionalMoney(formData.get(`price${days}`)),
  }));
  if (prices.every((item) => item.amount == null) && !(siblings ?? []).length) {
    return { ok: false, error: "Pon al menos un precio (1, 3, 6 o 12 meses)." };
  }

  for (const term of prices) {
    const existing = (siblings ?? []).find((row) => Number(row.duration_days) === term.days);
    const payload = {
      seller_id: session.sellerId,
      platform_id: platformId,
      name,
      description,
      cost_price: costPrice,
      sale_price: term.amount ?? existing?.sale_price ?? 0,
      duration_days: term.days,
      status: term.amount == null ? "inactive" : status,
      stock,
      on_offer: onOffer,
      compare_at_price: onOffer ? compareAt : null,
    };
    if (existing) {
      const { error } = await supabase
        .from("products")
        .update(payload)
        .eq("id", existing.id)
        .eq("seller_id", session.sellerId);
      if (error) return { ok: false, error: error.message };
    } else if (term.amount != null) {
      const { error } = await supabase.from("products").insert(payload);
      if (error) return { ok: false, error: error.message };
    }
  }

  const accountIds = formData.getAll("accountId").map((value) => String(value)).filter(Boolean);
  if (formData.has("accountId") || formData.get("syncAccounts") === "1") {
    const { error: delError } = await supabase
      .from("store_offer_accounts")
      .delete()
      .eq("seller_id", session.sellerId)
      .eq("platform_id", groupPlatformId)
      .eq("product_name", groupName);
    if (delError) return { ok: false, error: delError.message };
    if (accountIds.length) {
      const { data: owned } = await supabase
        .from("streaming_accounts")
        .select("id")
        .eq("seller_id", session.sellerId)
        .eq("platform_id", platformId)
        .in("id", accountIds);
      const rows = (owned ?? []).map((row) => ({
        seller_id: session.sellerId,
        platform_id: platformId,
        product_name: name,
        account_id: String(row.id),
      }));
      if (rows.length) {
        const { error: linkError } = await supabase.from("store_offer_accounts").insert(rows);
        if (linkError) return { ok: false, error: linkError.message };
      }
    }
  }

  revalidatePath("/panel/productos");
  revalidatePath("/panel/inventario");
  revalidatePath("/panel/vendedores");
  return { ok: true };
}

export async function upsertServiceAction(formData: FormData) {
  const blocked = ensureLive();
  if (blocked) return blocked;
  const session = await getAppSession();
  requireRole(session, ["seller"]);
  const supabase = await createClient();
  if (!supabase || !session.sellerId) return { ok: false, error: "Vendedor no encontrado." };
  const productId = String(formData.get("productId") ?? "");
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .eq("seller_id", session.sellerId)
    .maybeSingle();
  if (!product) return { ok: false, error: "Producto inválido." };
  const customerId = String(formData.get("customerId") ?? "");
  const { data: ownedCustomer } = await supabase
    .from("customers")
    .select("id")
    .eq("id", customerId)
    .eq("seller_id", session.sellerId)
    .maybeSingle();
  if (!ownedCustomer) return { ok: false, error: "Cliente inválido." };
  const startDate = String(formData.get("startDate") ?? "") || new Date().toISOString().slice(0, 10);
  const endDate =
    String(formData.get("endDate") ?? "") ||
    new Date(Date.now() + Number(product.duration_days ?? 30) * 86400000).toISOString().slice(0, 10);
  const accountId = String(formData.get("accountId") ?? "").trim();
  const accessProfile = String(formData.get("accessProfile") ?? "").trim();
  const accessPassword = String(formData.get("accessPassword") ?? "").trim();
  const payload = {
    seller_id: session.sellerId,
    customer_id: customerId,
    product_id: productId,
    platform_id: product.platform_id,
    start_date: startDate,
    end_date: endDate,
    cost_price: Number(formData.get("costPrice") ?? product.cost_price),
    sale_price: Number(formData.get("salePrice") ?? product.sale_price),
    status: String(formData.get("status") ?? "active"),
    notes: String(formData.get("notes") ?? ""),
    platform_email: String(formData.get("platformEmail") ?? "").trim() || null,
    account_id: accountId || null,
    access_profile: accessProfile || null,
    access_password: accessPassword || null,
  };
  const { error } = await supabase.from("services").insert(payload);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/panel/servicios");
  revalidatePath("/panel/inventario");
  revalidatePath("/panel/clientes");
  revalidatePath("/cliente/acceso");
  return { ok: true };
}

export async function assignPlatformEmailAction(formData: FormData) {
  const blocked = ensureLive();
  if (blocked) return blocked;
  const session = await getAppSession();
  requireRole(session, ["seller"]);
  const supabase = await createClient();
  if (!supabase || !session.sellerId) return { ok: false, error: "Vendedor no encontrado." };
  const serviceId = String(formData.get("serviceId") ?? "");
  const platformEmail = String(formData.get("platformEmail") ?? "").trim();
  const { error } = await supabase
    .from("services")
    .update({ platform_email: platformEmail || null })
    .eq("id", serviceId)
    .eq("seller_id", session.sellerId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/panel/servicios");
  revalidatePath("/cliente/acceso");
  return { ok: true };
}

export async function createExpenseAction(formData: FormData) {
  const blocked = ensureLive();
  if (blocked) return blocked;
  const session = await getAppSession();
  requireRole(session, ["seller"]);
  const supabase = await createClient();
  if (!supabase || !session.sellerId) return { ok: false, error: "Vendedor no encontrado." };
  const { error } = await supabase.from("expenses").insert({
    seller_id: session.sellerId,
    amount: Number(formData.get("amount") ?? 0),
    description: String(formData.get("description") ?? "").trim(),
    occurred_at: String(formData.get("occurredAt") ?? new Date().toISOString().slice(0, 10)),
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/panel/finanzas");
  return { ok: true };
}

export async function upsertSupplierAction(formData: FormData) {
  const blocked = ensureLive();
  if (blocked) return blocked;
  const session = await getAppSession();
  requireRole(session, ["superadmin"]);
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Sin cliente" };
  const id = String(formData.get("id") ?? "");
  const payload = {
    name: String(formData.get("name") ?? "").trim(),
    contact: String(formData.get("contact") ?? ""),
    status: String(formData.get("status") ?? "active"),
    notes: String(formData.get("notes") ?? ""),
  };
  const query = id
    ? supabase.from("suppliers").update(payload).eq("id", id)
    : supabase.from("suppliers").insert(payload);
  const { error } = await query;
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/proveedores");
  revalidatePath("/admin/mayorista");
  return { ok: true };
}

export async function upsertSupplierProductAction(formData: FormData) {
  const blocked = ensureLive();
  if (blocked) return blocked;
  const session = await getAppSession();
  requireRole(session, ["superadmin"]);
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Sin cliente" };

  const id = String(formData.get("id") ?? "").trim();
  const supplierId = String(formData.get("supplierId") ?? "").trim();
  const offerKind = String(formData.get("offerKind") ?? "perfil") === "cuenta_completa" ? "cuenta_completa" : "perfil";
  const unitPrice = Number(String(formData.get("unitPrice") ?? "0").replace(",", "."));
  const bulkQtyRaw = Number(formData.get("bulkQty") ?? 3);
  const bulkQty = Number.isInteger(bulkQtyRaw) && bulkQtyRaw >= 2 ? bulkQtyRaw : 3;
  let currentRow: { notes?: string | null; image_path?: string | null } | null = null;
  if (id) {
    const withImage = await supabase.from("supplier_products").select("notes, image_path").eq("id", id).maybeSingle();
    if (withImage.error && /image_path/i.test(withImage.error.message)) {
      const withoutImage = await supabase.from("supplier_products").select("notes").eq("id", id).maybeSingle();
      currentRow = withoutImage.data;
    } else {
      currentRow = withImage.data;
    }
  }
  const currentNotes = currentRow?.notes ? String(currentRow.notes) : "";
  let nextOrder = 0;
  if (!id) {
    const listed = await supabase.from("supplier_products").select("sort_order, notes");
    const orderRows =
      listed.error && /sort_order/i.test(listed.error.message)
        ? ((await supabase.from("supplier_products").select("notes")).data ?? [])
        : (listed.data ?? []);
    nextOrder = nextWholesaleSortOrder(orderRows);
  }
  const payload: Record<string, unknown> = {
    supplier_id: supplierId || null,
    platform_id: String(formData.get("platformId") ?? "") || null,
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? ""),
    wholesale_price: Number(formData.get("wholesalePrice") ?? 0),
    unit_price: unitPrice,
    bulk_qty: bulkQty,
    cost_price: Number(formData.get("costPrice") ?? 0),
    offer_kind: offerKind,
    status: String(formData.get("status") ?? "active"),
    notes: id
      ? withPricingToken(currentNotes, Number.isFinite(unitPrice) ? unitPrice : 0, bulkQty)
      : withSortToken(withPricingToken(currentNotes, Number.isFinite(unitPrice) ? unitPrice : 0, bulkQty), nextOrder),
  };
  if (!id) payload.sort_order = nextOrder;
  if (!payload.name) {
    return { ok: false, error: "El nombre del producto es obligatorio." };
  }

  const catalogHint =
    "Falta ejecutar el SQL 0022_wholesale_catalog_sales.sql en Supabase para costo, tipo y descripción.";
  let productId = id;
  if (id) {
    let { error } = await supabase.from("supplier_products").update(payload).eq("id", id);
    if (error && /unit_price|bulk_qty/i.test(error.message)) {
      const fallback = { ...payload };
      delete fallback.unit_price;
      delete fallback.bulk_qty;
      delete fallback.sort_order;
      fallback.notes = withPricingToken(currentNotes, unitPrice, bulkQty);
      ({ error } = await supabase.from("supplier_products").update(fallback).eq("id", id));
    }
    if (error) {
      return {
        ok: false,
        error: /cost_price|offer_kind|description|null value.*supplier_id/i.test(error.message) ? catalogHint : error.message,
      };
    }
  } else {
    let { data, error } = await supabase.from("supplier_products").insert(payload).select("id").single();
    if (error && /unit_price|bulk_qty|sort_order/i.test(error.message)) {
      const fallback = { ...payload };
      delete fallback.unit_price;
      delete fallback.bulk_qty;
      delete fallback.sort_order;
      fallback.notes = withSortToken(withPricingToken(currentNotes, unitPrice, bulkQty), nextOrder);
      ({ data, error } = await supabase.from("supplier_products").insert(fallback).select("id").single());
    }
    if (error || !data) {
      return {
        ok: false,
        error: error && /cost_price|offer_kind|description|null value.*supplier_id/i.test(error.message)
          ? catalogHint
          : error?.message ?? "No se pudo crear el producto.",
      };
    }
    productId = String(data.id);
  }

  const file = formData.getAll("image").find((item): item is File => item instanceof File && item.size > 0) ?? null;
  const removeImage = String(formData.get("removeImage") ?? "") === "1";
  let imageUrl = supplierProductImagePublicUrl(
    currentRow?.image_path ? String(currentRow.image_path) : null,
    String(Date.now()),
  );
  if (file || removeImage) {
    const imageResult = await writeSupplierProductImage(productId, file, removeImage && !file);
    if (!imageResult.ok) return imageResult;
    imageUrl = imageResult.imageUrl;
  }

  revalidatePath("/admin/proveedores");
  revalidatePath("/admin/mayorista");
  revalidatePath("/admin/ventas");
  revalidatePath("/admin");
  revalidatePath("/admin/finanzas");
  revalidatePath("/panel");
  revalidatePath("/panel/mayorista");
  return {
    ok: true,
    imageUrl,
    id: productId,
  };
}

export async function uploadSupplierProductImageAction(formData: FormData) {
  const blocked = ensureLive();
  if (blocked) return blocked;
  const session = await getAppSession();
  requireRole(session, ["superadmin"]);
  const productId = String(formData.get("id") ?? "").trim();
  if (!productId) return { ok: false, error: "Falta el producto." };
  const file = formData.getAll("image").find((item): item is File => item instanceof File && item.size > 0) ?? null;
  const remove = String(formData.get("removeImage") ?? "") === "1";
  if (!file && !remove) return { ok: false, error: "No llegó la imagen. Elige el archivo otra vez y guarda." };
  const result = await writeSupplierProductImage(productId, file, remove && !file);
  if (result.ok) {
    revalidatePath("/admin/mayorista");
    revalidatePath("/panel");
    revalidatePath("/panel/mayorista");
  }
  return result;
}

export async function reorderWholesaleCatalogAction(orderedIds: string[]) {
  const blocked = ensureLive();
  if (blocked) return blocked;
  const session = await getAppSession();
  requireRole(session, ["superadmin"]);
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Sin cliente" };
  const ids = [...new Set(orderedIds.map((id) => String(id).trim()).filter(Boolean))];
  if (ids.length === 0) return { ok: false, error: "No hay productos para ordenar." };

  const listed = await supabase.from("supplier_products").select("id, notes").in("id", ids);
  if (listed.error) return { ok: false, error: listed.error.message };
  const notesById = new Map((listed.data ?? []).map((row) => [String(row.id), row.notes ? String(row.notes) : ""]));

  let useNotes = false;
  for (const [index, id] of ids.entries()) {
    const { error } = await supabase.from("supplier_products").update({ sort_order: index }).eq("id", id);
    if (error && /sort_order|schema cache|does not exist/i.test(error.message)) {
      useNotes = true;
      break;
    }
    if (error) return { ok: false, error: error.message };
  }
  if (useNotes) {
    for (const [index, id] of ids.entries()) {
      const { error } = await supabase
        .from("supplier_products")
        .update({ notes: withSortToken(notesById.get(id) ?? "", index) || null })
        .eq("id", id);
      if (error) return { ok: false, error: error.message };
    }
  }

  revalidatePath("/admin/mayorista");
  revalidatePath("/panel");
  revalidatePath("/panel/mayorista");
  return { ok: true };
}

function wholesaleSchemaHint(message: string) {
  if (/unit_price|bulk_qty/i.test(message)) {
    return "Falta ejecutar el SQL 0023_wholesale_unit_bulk_prices.sql en Supabase.";
  }
  if (/does not exist|schema cache|wholesale_/i.test(message)) {
    return "Falta ejecutar el SQL 0022_wholesale_catalog_sales.sql en Supabase.";
  }
  return message;
}

export async function addWholesaleStockAction(formData: FormData) {
  const blocked = ensureLive();
  if (blocked) return blocked;
  const session = await getAppSession();
  requireRole(session, ["superadmin"]);
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Sin cliente" };
  const supplierProductId = String(formData.get("supplierProductId") ?? "").trim();
  const quantity = Number(formData.get("quantity") ?? 0);
  if (!supplierProductId) return { ok: false, error: "Elige un producto del catálogo." };
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { ok: false, error: "La cantidad debe ser un entero mayor a 0." };
  }
  const unitCostRaw = String(formData.get("unitCost") ?? "").trim();
  const supplierId = String(formData.get("supplierId") ?? "").trim();
  const writer = createServiceClient() ?? supabase;
  const { error } = await writer.from("wholesale_stock_entries").insert({
    supplier_product_id: supplierProductId,
    supplier_id: supplierId || null,
    quantity,
    unit_cost: unitCostRaw === "" ? null : Number(unitCostRaw),
    received_at: String(formData.get("receivedAt") ?? "") || new Date().toISOString().slice(0, 10),
    notes: String(formData.get("notes") ?? ""),
  });
  if (error) return { ok: false, error: wholesaleSchemaHint(error.message) };
  revalidatePath("/admin/mayorista");
  revalidatePath("/admin/ventas");
  revalidatePath("/admin/proveedores");
  revalidatePath("/admin");
  revalidatePath("/admin/finanzas");
  revalidatePath("/panel");
  revalidatePath("/panel/mayorista");
  return { ok: true };
}

export async function upsertWholesaleSaleAction(formData: FormData) {
  const blocked = ensureLive();
  if (blocked) return blocked;
  const session = await getAppSession();
  requireRole(session, ["superadmin"]);
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Sin cliente" };

  const id = String(formData.get("id") ?? "").trim();
  const supplierProductId = String(formData.get("supplierProductId") ?? "").trim();
  const sellerId = String(formData.get("sellerId") ?? "").trim();
  if (!supplierProductId) return { ok: false, error: "La venta debe elegir un producto del catálogo Mayorista." };
  if (!sellerId) return { ok: false, error: "Elige el vendedor que compra." };

  const { data: product, error: productError } = await supabase
    .from("supplier_products")
    .select("id, platform_id, cost_price, wholesale_price, offer_kind")
    .eq("id", supplierProductId)
    .maybeSingle();
  if (productError) return { ok: false, error: wholesaleSchemaHint(productError.message) };
  if (!product) return { ok: false, error: "Ese producto ya no está en el catálogo." };

  const purchasedAt = String(formData.get("purchasedAt") ?? "").trim();
  const expiresAt = String(formData.get("expiresAt") ?? "").trim();
  if (!purchasedAt || !expiresAt) return { ok: false, error: "Fecha de compra y vencimiento son obligatorias." };

  const costRaw = String(formData.get("costPrice") ?? "").trim();
  const priceRaw = String(formData.get("wholesalePrice") ?? "").trim();
  const kindRaw = String(formData.get("offerKind") ?? "").trim();
  const platformRaw = String(formData.get("platformId") ?? "").trim();
  const quantity = Number(formData.get("quantity") ?? 1);

  const payload = {
    supplier_product_id: supplierProductId,
    seller_id: sellerId,
    platform_id: platformRaw || (product.platform_id ? String(product.platform_id) : null),
    offer_kind: kindRaw === "cuenta_completa" || kindRaw === "perfil" ? kindRaw : String(product.offer_kind ?? "perfil"),
    quantity: Number.isInteger(quantity) && quantity > 0 ? quantity : 1,
    cost_price: costRaw === "" ? Number(product.cost_price ?? 0) : Number(costRaw),
    wholesale_price: priceRaw === "" ? Number(product.wholesale_price ?? 0) : Number(priceRaw),
    purchased_at: purchasedAt,
    expires_at: expiresAt,
    notes: String(formData.get("notes") ?? ""),
    status: "active" as const,
  };

  if (id) {
    const { error } = await supabase.from("wholesale_sales").update(payload).eq("id", id);
    if (error) return { ok: false, error: wholesaleSchemaHint(error.message) };
  } else {
    const { error } = await supabase.from("wholesale_sales").insert(payload);
    if (error) return { ok: false, error: wholesaleSchemaHint(error.message) };
  }

  revalidatePath("/admin/ventas");
  revalidatePath("/admin/mayorista");
  revalidatePath("/admin/proveedores");
  revalidatePath("/admin");
  revalidatePath("/admin/finanzas");
  revalidatePath("/panel");
  revalidatePath("/panel/mayorista");
  return { ok: true };
}

function limaDatePlusDays(days: number) {
  const lima = new Date(Date.now() - 5 * 60 * 60 * 1000);
  const start = Date.UTC(lima.getUTCFullYear(), lima.getUTCMonth(), lima.getUTCDate());
  const end = new Date(start + days * 86_400_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    purchasedAt: `${lima.getUTCFullYear()}-${pad(lima.getUTCMonth() + 1)}-${pad(lima.getUTCDate())}`,
    expiresAt: `${end.getUTCFullYear()}-${pad(end.getUTCMonth() + 1)}-${pad(end.getUTCDate())}`,
  };
}

export async function purchaseWholesaleAction(formData: FormData) {
  const blocked = ensureLive();
  if (blocked) return blocked;
  const session = await getAppSession();
  requireRole(session, ["seller"]);
  if (!session.sellerId) return { ok: false, error: "No hay vendedor asociado a esta sesión." };
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Sin cliente" };

  const supplierProductId = String(formData.get("supplierProductId") ?? "").trim();
  const pack = String(formData.get("pack") ?? "") === "bulk" ? "bulk" : "unit";
  if (!supplierProductId) return { ok: false, error: "Falta el producto." };

  const productSelect =
    "id, platform_id, cost_price, wholesale_price, unit_price, bulk_qty, offer_kind, status, notes";
  const { data: firstProduct, error: firstError } = await supabase
    .from("supplier_products")
    .select(productSelect)
    .eq("id", supplierProductId)
    .maybeSingle();
  let product: Record<string, unknown> | null = firstProduct as Record<string, unknown> | null;
  let productError = firstError;
  if (productError && /unit_price|bulk_qty/i.test(productError.message)) {
    const retry = await supabase
      .from("supplier_products")
      .select("id, platform_id, cost_price, wholesale_price, offer_kind, status, notes")
      .eq("id", supplierProductId)
      .maybeSingle();
    product = retry.data as Record<string, unknown> | null;
    productError = retry.error;
  }
  if (productError) return { ok: false, error: wholesaleSchemaHint(productError.message) };
  if (!product || String(product.status ?? "active") !== "active") {
    return { ok: false, error: "Ese producto ya no está en el catálogo." };
  }

  const fromNotes = parsePricingToken(product.notes ? String(product.notes) : "");
  const pricing = wholesalePricing({
    wholesalePrice: Number(product.wholesale_price ?? 0),
    unitPrice: Number(product.unit_price ?? 0) || fromNotes.unitPrice,
    bulkQty: Number(product.bulk_qty ?? 0) >= 2 ? Number(product.bulk_qty) : fromNotes.bulkQty,
  });
  if (pack === "bulk" && !pricing.hasPackDeal) {
    return { ok: false, error: "Este producto no tiene pack de varias unidades." };
  }
  const quantity = pack === "bulk" ? pricing.bulkQty : 1;
  const wholesalePrice = pack === "bulk" ? pricing.packUnitPrice : pricing.unitPrice;
  const { purchasedAt, expiresAt } = limaDatePlusDays(30);

  const payload = {
    supplier_product_id: supplierProductId,
    seller_id: session.sellerId,
    platform_id: product.platform_id ? String(product.platform_id) : null,
    offer_kind: String(product.offer_kind ?? "perfil") === "cuenta_completa" ? "cuenta_completa" : "perfil",
    quantity,
    cost_price: Number(product.cost_price ?? 0),
    wholesale_price: wholesalePrice,
    purchased_at: purchasedAt,
    expires_at: expiresAt,
    notes:
      pack === "bulk"
        ? `Pack de ${quantity} unidades desde catálogo mayorista.`
        : "1 unidad desde catálogo mayorista.",
    status: "active" as const,
  };

  const writer = createServiceClient() ?? supabase;
  const { error } = await writer.from("wholesale_sales").insert(payload);
  if (error) {
    if (/sin stock suficiente/i.test(error.message)) {
      return { ok: false, error: `No hay stock suficiente para ${quantity} unidad${quantity === 1 ? "" : "es"}.` };
    }
    return { ok: false, error: wholesaleSchemaHint(error.message) };
  }

  revalidatePath("/admin/ventas");
  revalidatePath("/admin/mayorista");
  revalidatePath("/admin");
  revalidatePath("/admin/finanzas");
  revalidatePath("/panel");
  revalidatePath("/panel/mayorista");
  return { ok: true };
}

export async function cancelWholesaleSaleAction(formData: FormData) {
  const blocked = ensureLive();
  if (blocked) return blocked;
  const session = await getAppSession();
  requireRole(session, ["superadmin"]);
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Sin cliente" };
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, error: "Falta la venta." };
  const { error } = await supabase.from("wholesale_sales").update({ status: "cancelled" }).eq("id", id);
  if (error) return { ok: false, error: wholesaleSchemaHint(error.message) };
  revalidatePath("/admin/ventas");
  revalidatePath("/admin/mayorista");
  revalidatePath("/admin");
  revalidatePath("/admin/finanzas");
  revalidatePath("/panel");
  revalidatePath("/panel/mayorista");
  return { ok: true };
}

export async function createSupportTicketAction(formData: FormData) {
  const blocked = ensureLive();
  if (blocked) return blocked;
  const session = await getAppSession();
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Sin cliente" };
  const audience = String(formData.get("audience") ?? "seller");
  const sellerId =
    session.role === "seller"
      ? session.sellerId
      : String(formData.get("sellerId") ?? session.sellerId ?? "");
  const { error } = await supabase.from("support_tickets").insert({
    seller_id: sellerId,
    customer_id: session.customerId,
    created_by: session.userId,
    audience,
    subject: String(formData.get("subject") ?? "").trim(),
    message: String(formData.get("message") ?? "").trim(),
    status: "pending",
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/cliente/soporte");
  revalidatePath("/panel/soporte");
  revalidatePath("/admin/solicitudes");
  return { ok: true };
}

export async function reviewOrderAction(orderId: string, approve: boolean) {
  const blocked = ensureLive();
  if (blocked) return blocked;
  const session = await getAppSession();
  requireRole(session, ["seller"]);
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Sin cliente" };
  const { error } = await supabase.rpc("review_order", {
    p_order_id: orderId,
    p_approve: approve,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/panel/pedidos");
  revalidatePath("/panel/comprobantes");
  revalidatePath("/panel/servicios");
  revalidatePath("/panel/finanzas");
  revalidatePath("/cliente");
  revalidatePath("/cliente/pedidos");
  revalidatePath("/cliente/servicios");
  return { ok: true };
}

export async function deliverOrderAction(formData: FormData) {
  const blocked = ensureLive();
  if (blocked) return blocked;
  const session = await getAppSession();
  requireRole(session, ["seller"]);
  const supabase = await createClient();
  if (!supabase || !session.sellerId) return { ok: false, error: "Vendedor no encontrado." };
  const orderId = String(formData.get("orderId") ?? "");
  const platformEmail = String(formData.get("platformEmail") ?? "").trim();
  const accessPassword = String(formData.get("accessPassword") ?? "").trim();
  const accessProfile = String(formData.get("accessProfile") ?? "").trim();
  const deliveryNote = String(formData.get("deliveryNote") ?? "").trim();
  const accountId = String(formData.get("accountId") ?? "").trim();
  const accountPassword = String(formData.get("accountPassword") ?? "").trim();
  if (!orderId) return { ok: false, error: "Pedido inválido." };

  const { data: order } = await supabase
    .from("orders")
    .select("id, order_status")
    .eq("id", orderId)
    .eq("seller_id", session.sellerId)
    .maybeSingle();
  if (!order) return { ok: false, error: "Pedido no encontrado." };
  if (!["approved", "delivered"].includes(String(order.order_status))) {
    return { ok: false, error: "Primero aprueba el pago." };
  }

  const composedNote = [
    deliveryNote,
    accountPassword ? `Clave de la cuenta: ${accountPassword}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const { error: rpcError } = await supabase.rpc("deliver_order", {
    p_order_id: orderId,
    p_platform_email: platformEmail,
    p_access_password: accessPassword,
    p_access_profile: accessProfile,
    p_delivery_note: composedNote,
  });

  if (rpcError) {
    const noteLines = [
      deliveryNote,
      platformEmail ? `Usuario: ${platformEmail}` : "",
      accessPassword ? `Clave: ${accessPassword}` : "",
      accessProfile ? `Perfil: ${accessProfile}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    const { error: serviceError } = await supabase
      .from("services")
      .update({
        platform_email: platformEmail || null,
        notes: noteLines || null,
      })
      .eq("order_id", orderId)
      .eq("seller_id", session.sellerId);
    if (serviceError) return { ok: false, error: serviceError.message };
    const { error: orderError } = await supabase
      .from("orders")
      .update({ order_status: "delivered" })
      .eq("id", orderId)
      .eq("seller_id", session.sellerId);
    if (orderError) return { ok: false, error: orderError.message };
  }

  if (accountId) {
    await supabase
      .from("services")
      .update({ account_id: accountId })
      .eq("order_id", orderId)
      .eq("seller_id", session.sellerId);
  }

  revalidatePath("/panel/pedidos");
  revalidatePath("/panel/inventario");
  revalidatePath("/panel/clientes");
  revalidatePath("/panel/servicios");
  revalidatePath("/cliente");
  revalidatePath("/cliente/pedidos");
  revalidatePath("/cliente/servicios");
  revalidatePath("/cliente/acceso");
  return { ok: true };
}

export async function declineRenewalAction(serviceId: string) {
  const blocked = ensureLive();
  if (blocked) return blocked;
  const session = await getAppSession();
  requireRole(session, ["customer"]);
  const supabase = await createClient();
  if (!supabase || !session.customerId) return { ok: false, error: "Sin cliente" };
  const { error } = await supabase.rpc("decline_renewal", { p_service_id: serviceId });
  if (error) {
    const admin = createServiceClient();
    if (!admin) return { ok: false, error: error.message };
    const { error: updateError } = await admin
      .from("services")
      .update({ renewal_intent: "decline", status: "cancelled" })
      .eq("id", serviceId)
      .eq("customer_id", session.customerId);
    if (updateError) return { ok: false, error: updateError.message };
  }
  revalidatePath("/cliente");
  revalidatePath("/cliente/servicios");
  return { ok: true };
}

export async function placeRenewalCheckoutAction(formData: FormData) {
  const serviceId = String(formData.get("serviceId") ?? "");
  const productId = String(formData.get("productId") ?? "");
  const paymentMethodId = String(formData.get("paymentMethodId") ?? "");
  const file = formData.get("voucher") as File | null;

  if (!isSupabaseConfigured()) {
    return { ok: true, code: "PS-DEMO-0001", demo: true };
  }

  const session = await getAppSession();
  requireRole(session, ["customer"]);
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Sin cliente" };

  const { data, error } = await supabase.rpc("renew_service", {
    p_service_id: serviceId,
    p_product_id: productId,
    p_payment_method_id: paymentMethodId,
  });
  if (error) return { ok: false, error: error.message };
  const result = data as { order_id: string; code: string; seller_id: string };

  if (file && file.size > 0) {
    const mime = voucherMime(file);
    if (!mime) return { ok: false, error: "El voucher debe ser PNG o JPEG." };
    if (file.size > MAX_VOUCHER_BYTES) return { ok: false, error: "El voucher no puede superar 5 MB." };
    const ext = mime === "image/png" ? "png" : "jpg";
    const path = `${result.seller_id}/${result.order_id}/voucher.${ext}`;
    const admin = createServiceClient();
    const uploader = admin ?? supabase;
    const { error: uploadError } = await uploader.storage
      .from("payment-receipts")
      .upload(path, file, { upsert: true, contentType: mime });
    if (uploadError) return { ok: false, error: uploadError.message };
    const { error: attachError } = await supabase.rpc("attach_receipt", {
      p_order_id: result.order_id,
      p_storage_path: path,
      p_mime_type: mime,
      p_size_bytes: file.size,
    });
    if (attachError) return { ok: false, error: attachError.message };
  }

  revalidatePath("/cliente");
  revalidatePath("/cliente/pedidos");
  revalidatePath("/panel");
  revalidatePath("/panel/pedidos");
  revalidatePath("/panel/comprobantes");
  revalidatePath("/admin/pedidos");
  return { ok: true, code: result.code };
}

export async function upsertPaymentMethodAction(formData: FormData) {
  const blocked = ensureLive();
  if (blocked) return blocked;
  const session = await getAppSession();
  requireRole(session, ["seller", "superadmin"]);
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Sin cliente" };
  const sellerId =
    session.role === "seller" ? session.sellerId : String(formData.get("sellerId") ?? session.sellerId ?? "");
  if (!sellerId) return { ok: false, error: "Vendedor no encontrado." };
  const id = String(formData.get("id") ?? "");
  const kind = String(formData.get("kind") ?? "yape") as "yape" | "plin" | "bank";
  const payload = {
    seller_id: sellerId,
    kind,
    holder_name: String(formData.get("holderName") ?? "").trim(),
    account_number: String(formData.get("accountNumber") ?? "").trim(),
  };
  if (!payload.holder_name || !payload.account_number) {
    return { ok: false, error: "Completa el nombre y el número / cuenta." };
  }
  if (!["yape", "plin", "bank"].includes(kind)) {
    return { ok: false, error: "Tipo de medio de pago inválido." };
  }
  if (!id) {
    const { count } = await supabase
      .from("seller_payment_methods")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", sellerId);
    if ((count ?? 0) >= 5) return { ok: false, error: "Máximo 5 medios de pago." };
    if ((count ?? 0) === 0) Object.assign(payload, { is_primary: true, is_active: true });
  }

  const methodQuery = id
    ? supabase
        .from("seller_payment_methods")
        .update(payload)
        .eq("id", id)
        .eq("seller_id", sellerId)
        .select("id, qr_path, logo_path")
        .maybeSingle()
    : supabase.from("seller_payment_methods").insert(payload).select("id, qr_path, logo_path").maybeSingle();
  const { data: saved, error } = await methodQuery;
  if (error || !saved?.id) return { ok: false, error: error?.message ?? "No se pudo guardar el medio de pago." };

  const methodId = String(saved.id);
  const previousPath = saved.qr_path ? String(saved.qr_path) : "";
  const previousLogoPath = saved.logo_path ? String(saved.logo_path) : "";

  if (kind === "bank") {
    if (previousPath) {
      const uploader = createServiceClient() ?? supabase;
      await uploader.storage.from(PAYMENT_QR_BUCKET).remove([previousPath]);
      await supabase
        .from("seller_payment_methods")
        .update({ qr_path: null })
        .eq("id", methodId)
        .eq("seller_id", sellerId);
    }
  } else {
    const file = formData.get("qr");
    const hasFile = file instanceof File && file.size > 0;
    if (hasFile) {
      const mime = logoMime(file);
      if (!mime) return { ok: false, error: "El QR debe ser PNG, WEBP o JPG." };
      if (file.size > MAX_QR_BYTES) return { ok: false, error: "El QR no puede superar 2 MB." };
      const path = `${sellerId}/${methodId}/qr.${logoExt(mime)}`;
      const uploader = createServiceClient() ?? supabase;
      const { error: uploadError } = await uploader.storage
        .from(PAYMENT_QR_BUCKET)
        .upload(path, file, { upsert: true, contentType: mime, cacheControl: "0" });
      if (uploadError) return { ok: false, error: uploadError.message };
      const { error: pathError } = await supabase
        .from("seller_payment_methods")
        .update({ qr_path: path, updated_at: new Date().toISOString() })
        .eq("id", methodId)
        .eq("seller_id", sellerId);
      if (pathError) return { ok: false, error: pathError.message };
      if (previousPath && previousPath !== path) {
        await uploader.storage.from(PAYMENT_QR_BUCKET).remove([previousPath]);
      }
    }
  }

  const logoFile = formData.get("logo");
  const hasLogoFile = logoFile instanceof File && logoFile.size > 0;
  const removeLogo = String(formData.get("removeLogo") ?? "") === "true";
  if (hasLogoFile) {
    const mime = logoMime(logoFile);
    if (!mime) return { ok: false, error: "El logo debe ser PNG, WEBP o JPG." };
    if (logoFile.size > MAX_LOGO_BYTES) return { ok: false, error: "El logo no puede superar 8 MB." };
    const path = `${sellerId}/methods/${methodId}/logo.${logoExt(mime)}`;
    const uploader = createServiceClient() ?? supabase;
    const { error: uploadError } = await uploader.storage
      .from(SELLER_LOGO_BUCKET)
      .upload(path, logoFile, { upsert: true, contentType: mime, cacheControl: "0" });
    if (uploadError) return { ok: false, error: uploadError.message };
    const { error: pathError } = await supabase
      .from("seller_payment_methods")
      .update({ logo_path: path, updated_at: new Date().toISOString() })
      .eq("id", methodId)
      .eq("seller_id", sellerId);
    if (pathError) return { ok: false, error: pathError.message };
    if (previousLogoPath && previousLogoPath !== path) {
      await uploader.storage.from(SELLER_LOGO_BUCKET).remove([previousLogoPath]);
    }
  } else if (removeLogo && previousLogoPath) {
    const uploader = createServiceClient() ?? supabase;
    await uploader.storage.from(SELLER_LOGO_BUCKET).remove([previousLogoPath]);
    const { error: pathError } = await supabase
      .from("seller_payment_methods")
      .update({ logo_path: null, updated_at: new Date().toISOString() })
      .eq("id", methodId)
      .eq("seller_id", sellerId);
    if (pathError) return { ok: false, error: pathError.message };
  }

  revalidatePath("/panel/configuracion");
  revalidatePath("/admin/configuracion");
  revalidatePath("/admin/vendedores");
  revalidatePath("/cliente");
  revalidatePath("/cliente/checkout");
  revalidatePath("/cliente/pedidos");
  revalidatePath("/cliente/servicios");
  return { ok: true };
}

export async function upsertStreamingAccountAction(formData: FormData) {
  const blocked = ensureLive();
  if (blocked) return blocked;
  const session = await getAppSession();
  requireRole(session, ["seller"]);
  const supabase = await createClient();
  if (!supabase || !session.sellerId) return { ok: false, error: "Vendedor no encontrado." };
  const id = String(formData.get("id") ?? "");
  const payload = {
    seller_id: session.sellerId,
    platform_id: String(formData.get("platformId") ?? ""),
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? "").trim(),
    label: String(formData.get("label") ?? "").trim(),
    max_profiles: Math.min(8, Math.max(1, Number(formData.get("maxProfiles") || 5))),
    status: String(formData.get("status") ?? "available"),
    expires_at: String(formData.get("expiresAt") ?? "").trim() || null,
    supplier_name: String(formData.get("supplierName") ?? "").trim(),
    supplier_contact: String(formData.get("supplierContact") ?? "").trim(),
    supplier_cost: Number(formData.get("supplierCost") || 0),
    supplier_note: String(formData.get("supplierNote") ?? "").trim(),
    supplier_expires_at: String(formData.get("supplierExpiresAt") ?? "").trim() || null,
    sale_kind: String(formData.get("saleKind") ?? "profiles") === "full" ? "full" : "profiles",
    reseller_name: String(formData.get("resellerName") ?? "").trim(),
    reseller_whatsapp: "",
  };
  const resellerRaw = String(formData.get("resellerWhatsapp") ?? "").trim();
  if (resellerRaw) {
    const stored = whatsappParaGuardar(resellerRaw);
    if (!stored) return { ok: false, error: "El WhatsApp del vendedor debe tener 9 dígitos" };
    payload.reseller_whatsapp = stored;
  }
  if (payload.sale_kind === "full") {
    payload.max_profiles = 1;
    if (payload.reseller_whatsapp) payload.status = payload.status === "inactive" ? "inactive" : "full";
  }
  if (!payload.platform_id || !payload.email) return { ok: false, error: "Completa plataforma y correo / usuario." };
  const query = id
    ? supabase.from("streaming_accounts").update(payload).eq("id", id).eq("seller_id", session.sellerId)
    : supabase.from("streaming_accounts").insert(payload);
  const { data: saved, error } = await query.select("id").maybeSingle();
  if (error) return { ok: false, error: error.message };
  const accountId = String(saved?.id ?? id);
  const linkProductName = String(formData.get("linkProductName") ?? "").trim();
  if (accountId && formData.has("linkProductName")) {
    await supabase.from("store_offer_accounts").delete().eq("account_id", accountId).eq("seller_id", session.sellerId);
    if (linkProductName) {
      const { error: linkError } = await supabase.from("store_offer_accounts").insert({
        seller_id: session.sellerId,
        platform_id: payload.platform_id,
        product_name: linkProductName,
        account_id: accountId,
      });
      if (linkError) return { ok: false, error: linkError.message };
    }
  }
  revalidatePath("/panel/inventario");
  revalidatePath("/panel/clientes");
  revalidatePath("/panel/vendedores");
  revalidatePath("/panel/productos");
  return { ok: true };
}

/** Administrador → vendedor: asigna una cuenta concreta a un vendedor. */
export async function assignAccountToSellerAction(formData: FormData) {
  const blocked = ensureLive();
  if (blocked) return blocked;
  const session = await getAppSession();
  requireRole(session, ["support"]);
  const sellerId = String(formData.get("sellerId") ?? "");
  const platformId = String(formData.get("platformId") ?? "");
  const email = String(formData.get("email") ?? "").trim();
  if (!sellerId || !platformId || !email) return { ok: false, error: "Completa vendedor, plataforma y correo." };
  const saleKind = String(formData.get("saleKind") ?? "profiles") === "full" ? "full" : "profiles";
  const admin = createServiceClient();
  if (!admin) return { ok: false, error: "Servicio no disponible." };
  const { error } = await admin.from("streaming_accounts").insert({
    seller_id: sellerId,
    platform_id: platformId,
    email,
    password: String(formData.get("password") ?? "").trim(),
    label: saleKind === "full" ? "" : String(formData.get("label") ?? "").trim(),
    max_profiles: saleKind === "full" ? 1 : Math.min(8, Math.max(1, Number(formData.get("maxProfiles") || 5))),
    sale_kind: saleKind,
    status: "available",
    expires_at: String(formData.get("expiresAt") ?? "").trim() || null,
    assigned_by_admin: true,
    assigned_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/cuentas");
  revalidatePath("/panel/cuentas");
  return { ok: true };
}

/** Administrador: quita una cuenta que había asignado. */
export async function removeAssignedAccountAction(id: string) {
  const blocked = ensureLive();
  if (blocked) return blocked;
  const session = await getAppSession();
  requireRole(session, ["support"]);
  const admin = createServiceClient();
  if (!admin) return { ok: false, error: "Servicio no disponible." };
  const { error } = await admin
    .from("streaming_accounts")
    .delete()
    .eq("id", id)
    .eq("assigned_by_admin", true);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/cuentas");
  revalidatePath("/panel/cuentas");
  return { ok: true };
}

export async function deleteStreamingAccountAction(id: string) {
  const blocked = ensureLive();
  if (blocked) return blocked;
  const session = await getAppSession();
  requireRole(session, ["seller"]);
  const supabase = await createClient();
  if (!supabase || !session.sellerId) return { ok: false, error: "Vendedor no encontrado." };
  const { error } = await supabase
    .from("streaming_accounts")
    .delete()
    .eq("id", id)
    .eq("seller_id", session.sellerId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/panel/inventario");
  revalidatePath("/panel/clientes");
  revalidatePath("/panel/vendedores");
  return { ok: true };
}

export async function patchInventoryServiceAction(formData: FormData) {
  const blocked = ensureLive();
  if (blocked) return blocked;
  const session = await getAppSession();
  requireRole(session, ["seller"]);
  const supabase = await createClient();
  if (!supabase || !session.sellerId) return { ok: false, error: "Vendedor no encontrado." };
  const serviceId = String(formData.get("serviceId") ?? "");
  if (!serviceId) return { ok: false, error: "Servicio inválido." };
  const free = String(formData.get("free") ?? "") === "1";
  const payload: Record<string, unknown> = free
    ? { account_id: null, access_profile: null, status: "cancelled" }
    : {};
  if (!free) {
    if (formData.has("notes")) payload.notes = String(formData.get("notes") ?? "");
    if (formData.has("accessProfile")) {
      payload.access_profile = String(formData.get("accessProfile") ?? "").trim() || null;
    }
    if (formData.has("accessPassword")) {
      payload.access_password = String(formData.get("accessPassword") ?? "").trim() || null;
    }
    const startDate = String(formData.get("startDate") ?? "");
    const endDate = String(formData.get("endDate") ?? "");
    const salePrice = String(formData.get("salePrice") ?? "");
    if (startDate) payload.start_date = startDate;
    if (endDate) payload.end_date = endDate;
    if (salePrice) payload.sale_price = Number(salePrice);
  }
  const { error } = await supabase
    .from("services")
    .update(payload)
    .eq("id", serviceId)
    .eq("seller_id", session.sellerId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/panel/inventario");
  revalidatePath("/panel/clientes");
  revalidatePath("/panel/servicios");
  revalidatePath("/cliente/acceso");
  return { ok: true };
}

export async function deletePaymentMethodAction(id: string, sellerId: string) {
  const blocked = ensureLive();
  if (blocked) return blocked;
  const session = await getAppSession();
  requireRole(session, ["seller", "superadmin"]);
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Sin cliente" };
  const owner = session.role === "seller" ? session.sellerId : sellerId;
  if (!owner || (session.role === "seller" && owner !== session.sellerId)) {
    return { ok: false, error: "No autorizado." };
  }
  const { data: current } = await supabase
    .from("seller_payment_methods")
    .select("qr_path, logo_path")
    .eq("id", id)
    .eq("seller_id", owner)
    .maybeSingle();
  const { error } = await supabase.from("seller_payment_methods").delete().eq("id", id).eq("seller_id", owner);
  if (error) return { ok: false, error: error.message };
  const uploader = createServiceClient() ?? supabase;
  if (current?.qr_path) await uploader.storage.from(PAYMENT_QR_BUCKET).remove([String(current.qr_path)]);
  if (current?.logo_path) await uploader.storage.from(SELLER_LOGO_BUCKET).remove([String(current.logo_path)]);
  revalidatePath("/panel/configuracion");
  revalidatePath("/admin/configuracion");
  revalidatePath("/cliente");
  revalidatePath("/cliente/checkout");
  revalidatePath("/cliente/pedidos");
  revalidatePath("/cliente/servicios");
  return { ok: true };
}

export async function updateSellerSettingsAction(formData: FormData) {
  const blocked = ensureLive();
  if (blocked) return blocked;
  const session = await getAppSession();
  requireRole(session, ["seller"]);
  const supabase = await createClient();
  if (!supabase || !session.sellerId) return { ok: false, error: "Vendedor no encontrado." };
  const payload: Record<string, unknown> = {};
  const name = formData.get("name");
  const businessName = formData.get("businessName");
  const whatsapp = formData.get("whatsapp");
  const storeMessage = formData.get("storeMessage");
  if (typeof name === "string") payload.name = name.trim();
  if (typeof businessName === "string") payload.business_name = businessName.trim();
  if (typeof whatsapp === "string") {
    const stored = whatsappParaGuardar(whatsapp);
    if (!stored) return { ok: false, error: "El WhatsApp debe tener 9 dígitos" };
    payload.whatsapp = stored;
  }
  const supportHours = formData.get("supportHours");
  if (typeof supportHours === "string") {
    payload.support_hours = supportHours.trim().slice(0, 80) || DEFAULT_SUPPORT_HOURS;
  }
  if (typeof storeMessage === "string") payload.store_message = storeMessage.trim();
  const bannerEnabled = formData.getAll("storeBannerEnabled");
  if (bannerEnabled.length) payload.store_banner_enabled = bannerEnabled.includes("true");
  const bannerKicker = formData.get("storeBannerKicker");
  if (typeof bannerKicker === "string") payload.store_banner_kicker = bannerKicker.trim();
  const bannerTitle = formData.get("storeBannerTitle");
  if (typeof bannerTitle === "string") payload.store_banner_title = bannerTitle.trim();
  const bannerAccent = formData.get("storeBannerAccent");
  if (typeof bannerAccent === "string") payload.store_banner_accent = bannerAccent.trim();
  const bannerDescription = formData.get("storeBannerDescription");
  if (typeof bannerDescription === "string") payload.store_banner_description = bannerDescription.trim();
  for (const key of [
    "notifyLoginEmail",
    "notifyNewOrder",
    "notifyPaymentReview",
    "notifyServiceExpiring",
    "notifyInventoryExpiring",
  ] as const) {
    if (formData.has(key)) {
      const column = {
        notifyLoginEmail: "notify_login_email",
        notifyNewOrder: "notify_new_order",
        notifyPaymentReview: "notify_payment_review",
        notifyServiceExpiring: "notify_service_expiring",
        notifyInventoryExpiring: "notify_inventory_expiring",
      }[key];
      payload[column] = String(formData.get(key)) === "true";
    }
  }
  if (Object.keys(payload).length === 0) return { ok: false, error: "Nada que guardar." };
  const { error } = await supabase.from("sellers").update(payload).eq("id", session.sellerId);
  if (error) {
    if (error.message.toLowerCase().includes("support_hours")) return { ok: false, error: SUPPORT_HOURS_SQL_HINT };
    return { ok: false, error: error.message };
  }
  revalidatePath("/panel/configuracion");
  revalidatePath("/panel");
  revalidatePath("/cliente");
  revalidatePath("/cliente", "layout");
  return { ok: true };
}

const TIPOS_PLANTILLA_MENSAJE = new Set<TipoPlantillaMensaje>([
  "recordatorio_vencimiento",
  "oferta_renovacion",
  "entrega_pedido",
  "bienvenida",
]);

function revalidateMessageTemplates() {
  revalidatePath("/panel/configuracion");
  revalidatePath("/panel/clientes");
  revalidatePath("/panel/vendedores");
  revalidatePath("/panel/pedidos");
  revalidatePath("/panel/inventario");
  revalidatePath("/panel/servicios");
}

export async function upsertMessageTemplateAction(formData: FormData) {
  const blocked = ensureLive();
  if (blocked) return blocked;
  const session = await getAppSession();
  requireRole(session, ["seller"]);
  const supabase = await createClient();
  if (!supabase || !session.sellerId) return { ok: false, error: "Vendedor no encontrado." };
  const tipo = String(formData.get("tipo") ?? "") as TipoPlantillaMensaje;
  if (!TIPOS_PLANTILLA_MENSAJE.has(tipo)) return { ok: false, error: "Tipo de mensaje no válido." };
  const cuerpo = String(formData.get("cuerpo") ?? "");
  if (!textoPlantillaUtil(cuerpo)) {
    return { ok: false, error: "El mensaje no puede quedar vacío. Usa Restaurar original para volver al texto por defecto." };
  }
  if (cuerpo.length > MAX_CUERPO_WHATSAPP) {
    return { ok: false, error: `El mensaje no puede superar ${MAX_CUERPO_WHATSAPP} caracteres.` };
  }
  const vencidoRaw = String(formData.get("cuerpoVencido") ?? "");
  const cuerpoVencido = textoPlantillaUtil(vencidoRaw);
  if (cuerpoVencido && vencidoRaw.length > MAX_CUERPO_WHATSAPP) {
    return { ok: false, error: `El mensaje vencido no puede superar ${MAX_CUERPO_WHATSAPP} caracteres.` };
  }
  const { error } = await supabase.from("message_templates").upsert(
    {
      seller_id: session.sellerId,
      tipo,
      cuerpo: cuerpo.trim(),
      cuerpo_vencido: cuerpoVencido,
      activo: true,
    },
    { onConflict: "seller_id,tipo" },
  );
  if (error) return { ok: false, error: error.message };
  revalidateMessageTemplates();
  return { ok: true };
}

export async function restoreMessageTemplateAction(tipo: TipoPlantillaMensaje) {
  const blocked = ensureLive();
  if (blocked) return blocked;
  const session = await getAppSession();
  requireRole(session, ["seller"]);
  const supabase = await createClient();
  if (!supabase || !session.sellerId) return { ok: false, error: "Vendedor no encontrado." };
  if (!TIPOS_PLANTILLA_MENSAJE.has(tipo)) return { ok: false, error: "Tipo de mensaje no válido." };
  const { error } = await supabase
    .from("message_templates")
    .delete()
    .eq("seller_id", session.sellerId)
    .eq("tipo", tipo);
  if (error) return { ok: false, error: error.message };
  revalidateMessageTemplates();
  return { ok: true };
}

function revalidateHomeImages() {
  revalidatePath("/panel");
  revalidatePath("/panel/configuracion");
}

export async function uploadHomeImageAction(formData: FormData) {
  try {
    const blocked = ensureLive();
    if (blocked) return blocked;
    const session = await getAppSession();
    requireRole(session, ["seller"]);
    const supabase = await createClient();
    if (!supabase || !session.sellerId) return { ok: false, error: "Vendedor no encontrado." };
    const slot = String(formData.get("slot") ?? "");
    if (!isHomeImageSlot(slot)) return { ok: false, error: "Espacio de imagen no válido." };
    const file = formData.get("image");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "Elige una imagen PNG, JPG o WEBP." };
    }
    const mime = logoMime(file);
    if (!mime) return { ok: false, error: "Elige una imagen PNG, JPG o WEBP." };
    if (file.size > MAX_HOME_IMAGE_BYTES) return { ok: false, error: "La imagen no puede superar 8 MB." };
    const { data: current } = await supabase
      .from("home_images")
      .select("storage_path")
      .eq("seller_id", session.sellerId)
      .eq("slot", slot)
      .maybeSingle();
    const previousPath = current?.storage_path ? String(current.storage_path) : "";
    const path = `${session.sellerId}/home/${slot}.${logoExt(mime)}`;
    const uploader = createServiceClient() ?? supabase;
    const { error: uploadError } = await uploader.storage
      .from(SELLER_LOGO_BUCKET)
      .upload(path, file, { upsert: true, contentType: mime, cacheControl: "0" });
    if (uploadError) return { ok: false, error: uploadError.message };
    const { error } = await supabase.from("home_images").upsert(
      {
        seller_id: session.sellerId,
        slot,
        storage_path: path,
      },
      { onConflict: "seller_id,slot" },
    );
    if (error) return { ok: false, error: error.message };
    if (previousPath && previousPath !== path) {
      await uploader.storage.from(SELLER_LOGO_BUCKET).remove([previousPath]);
    }
    revalidateHomeImages();
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo subir la imagen.";
    return { ok: false, error: message };
  }
}

export async function removeHomeImageAction(slot: string) {
  const blocked = ensureLive();
  if (blocked) return blocked;
  const session = await getAppSession();
  requireRole(session, ["seller"]);
  const supabase = await createClient();
  if (!supabase || !session.sellerId) return { ok: false, error: "Vendedor no encontrado." };
  if (!isHomeImageSlot(slot)) return { ok: false, error: "Espacio de imagen no válido." };
  const { data: current } = await supabase
    .from("home_images")
    .select("storage_path")
    .eq("seller_id", session.sellerId)
    .eq("slot", slot)
    .maybeSingle();
  const previousPath = current?.storage_path ? String(current.storage_path) : "";
  const { error } = await supabase
    .from("home_images")
    .delete()
    .eq("seller_id", session.sellerId)
    .eq("slot", slot);
  if (error) return { ok: false, error: error.message };
  if (previousPath) {
    const uploader = createServiceClient() ?? supabase;
    await uploader.storage.from(SELLER_LOGO_BUCKET).remove([previousPath]);
  }
  revalidateHomeImages();
  return { ok: true };
}

export async function uploadSellerLogoAction(formData: FormData) {
  const blocked = ensureLive();
  if (blocked) return blocked;
  const session = await getAppSession();
  requireRole(session, ["seller"]);
  const supabase = await createClient();
  if (!supabase || !session.sellerId) return { ok: false, error: "Vendedor no encontrado." };
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Elige una imagen PNG o JPG." };
  const mime = logoMime(file);
  if (!mime || mime === "image/webp") return { ok: false, error: "El logo debe ser PNG o JPG." };
  if (file.size > MAX_LOGO_BYTES) return { ok: false, error: "El logo no puede superar 8 MB." };
  const { data: current } = await supabase.from("sellers").select("logo_path").eq("id", session.sellerId).maybeSingle();
  const previousPath = current?.logo_path ? String(current.logo_path) : "";
  const path = `${session.sellerId}/logo.${logoExt(mime)}`;
  const uploader = createServiceClient() ?? supabase;
  const { error: uploadError } = await uploader.storage
    .from(SELLER_LOGO_BUCKET)
    .upload(path, file, { upsert: true, contentType: mime, cacheControl: "0" });
  if (uploadError) return { ok: false, error: uploadError.message };
  const { error } = await supabase.from("sellers").update({ logo_path: path }).eq("id", session.sellerId);
  if (error) return { ok: false, error: error.message };
  if (previousPath && previousPath !== path) {
    await uploader.storage.from(SELLER_LOGO_BUCKET).remove([previousPath]);
  }
  revalidatePath("/panel/configuracion");
  return { ok: true };
}

export async function uploadStoreBannerAction(formData: FormData) {
  const blocked = ensureLive();
  if (blocked) return blocked;
  const session = await getAppSession();
  requireRole(session, ["seller"]);
  const supabase = await createClient();
  if (!supabase || !session.sellerId) return { ok: false, error: "Vendedor no encontrado." };
  const file = formData.get("banner");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Elige una imagen PNG o JPG." };
  const mime = logoMime(file);
  if (!mime || mime === "image/webp") return { ok: false, error: "El banner debe ser PNG o JPG." };
  if (file.size > MAX_HOME_IMAGE_BYTES) return { ok: false, error: "El banner no puede superar 8 MB." };
  const { data: current } = await supabase
    .from("sellers")
    .select("store_banner_path")
    .eq("id", session.sellerId)
    .maybeSingle();
  const previousPath = current?.store_banner_path ? String(current.store_banner_path) : "";
  const path = `${session.sellerId}/store/banner.${logoExt(mime)}`;
  const uploader = createServiceClient() ?? supabase;
  const { error: uploadError } = await uploader.storage
    .from(SELLER_LOGO_BUCKET)
    .upload(path, file, { upsert: true, contentType: mime, cacheControl: "0" });
  if (uploadError) return { ok: false, error: uploadError.message };
  const { error } = await supabase.from("sellers").update({ store_banner_path: path }).eq("id", session.sellerId);
  if (error) return { ok: false, error: error.message };
  if (previousPath && previousPath !== path) {
    await uploader.storage.from(SELLER_LOGO_BUCKET).remove([previousPath]);
  }
  revalidatePath("/panel/configuracion");
  return { ok: true };
}

export async function setPaymentMethodPrimaryAction(id: string, sellerId: string) {
  const blocked = ensureLive();
  if (blocked) return blocked;
  const session = await getAppSession();
  requireRole(session, ["seller", "superadmin"]);
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Sin cliente" };
  const owner = session.role === "seller" ? session.sellerId : sellerId;
  if (!owner) return { ok: false, error: "No autorizado." };
  await supabase.from("seller_payment_methods").update({ is_primary: false }).eq("seller_id", owner);
  const { error } = await supabase
    .from("seller_payment_methods")
    .update({ is_primary: true, is_active: true })
    .eq("id", id)
    .eq("seller_id", owner);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/panel/configuracion");
  revalidatePath("/admin/configuracion");
  return { ok: true };
}

export async function setPaymentMethodActiveAction(id: string, sellerId: string, active: boolean) {
  const blocked = ensureLive();
  if (blocked) return blocked;
  const session = await getAppSession();
  requireRole(session, ["seller", "superadmin"]);
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Sin cliente" };
  const owner = session.role === "seller" ? session.sellerId : sellerId;
  if (!owner) return { ok: false, error: "No autorizado." };
  const { error } = await supabase
    .from("seller_payment_methods")
    .update({ is_active: active })
    .eq("id", id)
    .eq("seller_id", owner);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/panel/configuracion");
  revalidatePath("/admin/configuracion");
  return { ok: true };
}

export async function changePasswordAction(formData: FormData) {
  const blocked = ensureLive();
  if (blocked) return blocked;
  const session = await getAppSession();
  requireRole(session, ["seller", "superadmin", "support", "customer"]);
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Sin cliente" };
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 6) return { ok: false, error: "La clave debe tener al menos 6 caracteres." };
  if (password !== confirm) return { ok: false, error: "Las claves no coinciden." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateCustomerNicknameAction(formData: FormData) {
  const blocked = ensureLive();
  if (blocked) return blocked;
  const session = await getAppSession();
  requireRole(session, ["customer"]);
  if (!session.userId || !session.customerId) return { ok: false, error: "Cliente no encontrado." };
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Sin cliente" };
  const name = String(formData.get("nickname") ?? "").trim();
  if (name.length < 2) return { ok: false, error: "El apodo debe tener al menos 2 caracteres." };
  if (name.length > 40) return { ok: false, error: "El apodo no puede superar 40 caracteres." };

  const { error: profileError } = await supabase.from("profiles").update({ full_name: name }).eq("id", session.userId);
  if (profileError) return { ok: false, error: profileError.message };

  const writer = createServiceClient() ?? supabase;
  const { error: customerError } = await writer
    .from("customers")
    .update({ name })
    .eq("id", session.customerId)
    .eq("profile_id", session.userId);
  if (customerError) return { ok: false, error: customerError.message };

  await supabase.auth.updateUser({ data: { full_name: name } });
  revalidatePath("/cliente", "layout");
  revalidatePath("/cliente/cuenta");
  return { ok: true };
}

export async function createExpenseForm(formData: FormData): Promise<void> {
  await createExpenseAction(formData);
}

export async function createSupportTicketForm(formData: FormData): Promise<void> {
  await createSupportTicketAction(formData);
}

export async function upsertSupplierForm(formData: FormData): Promise<void> {
  await upsertSupplierAction(formData);
}

export async function upsertSupplierProductForm(formData: FormData): Promise<void> {
  await upsertSupplierProductAction(formData);
}

export async function addWholesaleStockForm(formData: FormData): Promise<void> {
  await addWholesaleStockAction(formData);
}

export async function upsertWholesaleSaleForm(formData: FormData): Promise<void> {
  await upsertWholesaleSaleAction(formData);
}

export async function cancelWholesaleSaleForm(formData: FormData): Promise<void> {
  await cancelWholesaleSaleAction(formData);
}

export async function placeCheckoutAction(formData: FormData) {
  const sellerSlug = String(formData.get("sellerSlug") ?? "");
  const productId = String(formData.get("productId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const whatsapp = whatsappParaGuardar(String(formData.get("whatsapp") ?? ""));
  const email = String(formData.get("email") ?? "").trim();
  const method = String(formData.get("method") ?? "yape") as "yape" | "plin";
  const file = formData.get("voucher") as File | null;

  if (!whatsapp) return { ok: false, error: "El WhatsApp debe tener 9 dígitos" };

  if (!isSupabaseConfigured()) {
    return { ok: true, code: "PS-DEMO-0001", demo: true, goToCustomerOrders: false };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Sin cliente" };

  const { data, error } = await supabase.rpc("place_order", {
    p_seller_slug: sellerSlug,
    p_product_id: productId,
    p_name: name,
    p_whatsapp: whatsapp,
    p_email: email,
    p_payment_method: method,
  });
  if (error) return { ok: false, error: error.message };

  const result = data as { order_id: string; code: string; seller_id: string };
  revalidatePath("/cliente");
  revalidatePath("/cliente/pedidos");
  revalidatePath("/panel");
  revalidatePath("/panel/pedidos");
  revalidatePath("/panel/comprobantes");
  revalidatePath("/admin/pedidos");
  if (file && file.size > 0) {
    const mime = voucherMime(file);
    if (!mime) return { ok: false, error: "El voucher debe ser PNG o JPEG." };
    if (file.size > MAX_VOUCHER_BYTES) return { ok: false, error: "El voucher no puede superar 5 MB." };
    const ext = mime === "image/png" ? "png" : "jpg";
    const path = `${result.seller_id}/${result.order_id}/voucher.${ext}`;
    const admin = createServiceClient();
    const uploader = admin ?? supabase;
    const { error: uploadError } = await uploader.storage
      .from("payment-receipts")
      .upload(path, file, { upsert: true, contentType: mime });
    if (uploadError) return { ok: false, error: uploadError.message };
    const { error: attachError } = await supabase.rpc("attach_receipt", {
      p_order_id: result.order_id,
      p_storage_path: path,
      p_mime_type: mime,
      p_size_bytes: file.size,
    });
    if (attachError) return { ok: false, error: attachError.message };
  }

  const session = await getAppSession();
  return {
    ok: true,
    code: result.code,
    goToCustomerOrders: session.role === "customer" && Boolean(session.customerId),
  };
}
