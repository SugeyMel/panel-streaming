"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAppSession, requireRole } from "@/lib/auth/get-session";
import { isPhoneLogin, normalizePhone, phoneToAuthEmail, toAuthEmail } from "@/lib/auth/phone-login";
import { uiCustomerStatusToDb, uiSellerStatusToDb } from "@/lib/db/map";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { CustomerStatus, SellerStatus } from "@/lib/types";

const ALLOWED_MIME = new Set(["image/png", "image/jpeg"]);
const ALLOWED_LOGO_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_VOUCHER_BYTES = 5 * 1024 * 1024;
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const PLATFORM_LOGO_BUCKET = "platform-logos";

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

function ensureLive() {
  if (!isSupabaseConfigured()) {
    return { ok: false as const, error: "Supabase no está configurado. La acción quedó en modo demo." };
  }
  return null;
}

export async function signInAction(formData: FormData) {
  const identifier = String(formData.get("identifier") ?? formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!identifier || !password) {
    return { ok: false, error: "Celular o correo, y clave, son obligatorios." };
  }

  if (!isSupabaseConfigured()) {
    const dest = identifier.includes("admin")
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
  const next = String(formData.get("next") ?? "");
  const safeNext =
    next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : "";

  if (session.role === "superadmin" || session.role === "support") redirect("/admin");
  if (session.role === "seller") redirect("/panel");
  if (safeNext.startsWith("/cliente") || safeNext.startsWith("/tienda/")) redirect(safeNext);
  redirect("/cliente");
}

export async function signOutAction() {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/login");
}

export async function upsertSellerAction(formData: FormData) {
  const blocked = ensureLive();
  if (blocked) return blocked;
  const session = await getAppSession();
  requireRole(session, ["superadmin"]);
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Sin cliente" };

  const id = String(formData.get("id") ?? "");
  const payload = {
    name: String(formData.get("name") ?? "").trim(),
    business_name: String(formData.get("businessName") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    whatsapp: String(formData.get("whatsapp") ?? "").trim(),
    status: uiSellerStatusToDb(String(formData.get("status") ?? "pendiente") as SellerStatus),
    yape_holder: String(formData.get("yapeHolder") ?? ""),
    yape_number: String(formData.get("yapeNumber") ?? ""),
    plin_holder: String(formData.get("plinHolder") ?? ""),
    plin_number: String(formData.get("plinNumber") ?? ""),
  };
  if (!payload.name || !payload.slug) return { ok: false, error: "Nombre y slug son obligatorios." };

  const query = id
    ? supabase.from("sellers").update(payload).eq("id", id)
    : supabase.from("sellers").insert(payload);
  const { error } = await query;
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/vendedores");
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
  const id = String(formData.get("id") ?? "");
  const payload = {
    name: String(formData.get("name") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim(),
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
  const removeLogo = String(formData.get("removeLogo") ?? "") === "1";
  const hasFile = file instanceof File && file.size > 0;
  const { data: current } = await supabase.from("platforms").select("logo_path").eq("id", platformId).maybeSingle();
  const previousPath = current?.logo_path ? String(current.logo_path) : null;
  const uploader = createServiceClient() ?? supabase;

  if (removeLogo && !hasFile) {
    if (previousPath) {
      await uploader.storage.from(PLATFORM_LOGO_BUCKET).remove([previousPath]);
    }
    const { error } = await supabase.from("platforms").update({ logo_path: null }).eq("id", platformId);
    if (error) return { ok: false, error: error.message };
  } else if (hasFile && file instanceof File) {
    const mime = logoMime(file);
    if (!mime) return { ok: false, error: "El logo debe ser PNG, WEBP o JPG. SVG no está permitido." };
    if (file.size > MAX_LOGO_BYTES) return { ok: false, error: "El logo no puede superar 2 MB." };
    const path = `${platformId}/logo.${logoExt(mime)}`;
    if (previousPath && previousPath !== path) {
      await uploader.storage.from(PLATFORM_LOGO_BUCKET).remove([previousPath]);
    }
    const { error: uploadError } = await uploader.storage
      .from(PLATFORM_LOGO_BUCKET)
      .upload(path, file, { upsert: true, contentType: mime });
    if (uploadError) return { ok: false, error: uploadError.message };
    const { error } = await supabase.from("platforms").update({ logo_path: path }).eq("id", platformId);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/admin/plataformas");
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
  const whatsapp = normalizePhone(String(formData.get("whatsapp") ?? "").trim());
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const payload = {
    seller_id: session.sellerId,
    name,
    whatsapp,
    email: email || null,
    status: uiCustomerStatusToDb(String(formData.get("status") ?? "activo") as CustomerStatus),
  };
  if (!payload.name || !payload.whatsapp) return { ok: false, error: "Nombre y celular son obligatorios." };
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
  revalidatePath("/panel/productos");
  revalidatePath("/panel/inventario");
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
  return { ok: true };
}

export async function upsertSupplierProductAction(formData: FormData) {
  const blocked = ensureLive();
  if (blocked) return blocked;
  const session = await getAppSession();
  requireRole(session, ["superadmin"]);
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Sin cliente" };
  const { error } = await supabase.from("supplier_products").insert({
    supplier_id: String(formData.get("supplierId") ?? ""),
    platform_id: String(formData.get("platformId") ?? "") || null,
    name: String(formData.get("name") ?? "").trim(),
    wholesale_price: Number(formData.get("wholesalePrice") ?? 0),
    status: String(formData.get("status") ?? "active"),
    notes: String(formData.get("notes") ?? ""),
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/proveedores");
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
  revalidatePath("/panel/pedidos");
  revalidatePath("/panel/comprobantes");
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
  const payload = {
    seller_id: sellerId,
    kind: String(formData.get("kind") ?? "yape"),
    holder_name: String(formData.get("holderName") ?? "").trim(),
    account_number: String(formData.get("accountNumber") ?? "").trim(),
  };
  if (!payload.holder_name || !payload.account_number) {
    return { ok: false, error: "Completa el nombre y el número / cuenta." };
  }
  if (!id) {
    const { count } = await supabase
      .from("seller_payment_methods")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", sellerId);
    if ((count ?? 0) >= 5) return { ok: false, error: "Máximo 5 medios de pago." };
  }
  const query = id
    ? supabase.from("seller_payment_methods").update(payload).eq("id", id).eq("seller_id", sellerId)
    : supabase.from("seller_payment_methods").insert(payload);
  const { error } = await query;
  if (error) return { ok: false, error: error.message };
  revalidatePath("/panel/configuracion");
  revalidatePath("/admin/configuracion");
  revalidatePath("/admin/vendedores");
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
  };
  if (!payload.platform_id || !payload.email) return { ok: false, error: "Completa plataforma y correo / usuario." };
  const query = id
    ? supabase.from("streaming_accounts").update(payload).eq("id", id).eq("seller_id", session.sellerId)
    : supabase.from("streaming_accounts").insert(payload);
  const { error } = await query;
  if (error) return { ok: false, error: error.message };
  revalidatePath("/panel/inventario");
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
    : {
        notes: String(formData.get("notes") ?? ""),
        access_profile: String(formData.get("accessProfile") ?? "").trim() || null,
        access_password: String(formData.get("accessPassword") ?? "").trim() || null,
      };
  if (!free) {
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
  const { error } = await supabase.from("seller_payment_methods").delete().eq("id", id).eq("seller_id", owner);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/panel/configuracion");
  revalidatePath("/admin/configuracion");
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

export async function placeCheckoutAction(formData: FormData) {
  const sellerSlug = String(formData.get("sellerSlug") ?? "");
  const productId = String(formData.get("productId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const whatsapp = String(formData.get("whatsapp") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const method = String(formData.get("method") ?? "yape") as "yape" | "plin";
  const file = formData.get("voucher") as File | null;

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
