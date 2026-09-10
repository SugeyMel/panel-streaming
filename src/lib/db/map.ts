import {
  DEFAULT_SUPPORT_HOURS,
  type Customer,
  type CustomerStatus,
  type Order,
  type OrderStatus,
  type PaymentStatus,
  type Platform,
  type Product,
  type Seller,
  type SellerStatus,
  type Subscription,
  type SubscriptionStatus,
} from "@/lib/types";
import { serviceStatusFromDates } from "@/lib/format";
import { canonicalPlatformName, platformLogoPublicUrl } from "@/lib/platform-logos";

const sellerStatus: Record<string, SellerStatus> = {
  active: "activo",
  suspended: "suspendido",
  pending: "pendiente",
  disabled: "desactivado",
};

const customerStatus: Record<string, CustomerStatus> = {
  active: "activo",
  inactive: "inactivo",
  suspended: "suspendido",
};

const orderStatus: Record<string, OrderStatus> = {
  pending_payment: "pendiente_pago",
  pending_review: "pago_enviado",
  approved: "pago_aprobado",
  rejected: "cancelado",
  cancelled: "cancelado",
  delivered: "entregado",
};

const paymentStatus: Record<string, PaymentStatus> = {
  pending: "pendiente",
  submitted: "enviado",
  paid: "aprobado",
  rejected: "rechazado",
};

const serviceStatus: Record<string, SubscriptionStatus> = {
  active: "activo",
  expiring: "proximo_a_vencer",
  expired: "vencido",
  suspended: "suspendido",
  cancelled: "cancelado",
};

export function mapSeller(row: Record<string, unknown>): Seller {
  const logoPath = row.logo_path ? String(row.logo_path) : row.logoPath ? String(row.logoPath) : null;
  const bannerPath = row.store_banner_path
    ? String(row.store_banner_path)
    : row.storeBannerPath
      ? String(row.storeBannerPath)
      : null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
  const version = row.updated_at ? String(row.updated_at) : "";
  const publicFile = (path: string | null) =>
    path && base
      ? `${base}/storage/v1/object/public/seller-logos/${path.replace(/^\/+/, "")}?v=${encodeURIComponent(version || path)}`
      : null;
  return {
    id: String(row.id),
    userId: String(row.profile_id ?? ""),
    name: String(row.name),
    businessName: String(row.business_name ?? row.businessName ?? ""),
    slug: String(row.slug),
    email: String(row.email ?? ""),
    whatsapp: String(row.whatsapp ?? ""),
    supportHours: String(row.support_hours ?? row.supportHours ?? "").trim() || DEFAULT_SUPPORT_HOURS,
    status: sellerStatus[String(row.status)] ?? "pendiente",
    registeredAt: String(row.created_at ?? new Date().toISOString()),
    yapeHolder: String(row.yape_holder ?? row.yapeHolder ?? ""),
    yapeNumber: String(row.yape_number ?? row.yapeNumber ?? ""),
    plinHolder: String(row.plin_holder ?? row.plinHolder ?? ""),
    plinNumber: String(row.plin_number ?? row.plinNumber ?? ""),
    logoPath,
    logoUrl: publicFile(logoPath),
    storeMessage: String(row.store_message ?? row.storeMessage ?? ""),
    storeBannerEnabled: row.store_banner_enabled !== false && row.storeBannerEnabled !== false,
    storeBannerKicker: String(row.store_banner_kicker ?? row.storeBannerKicker ?? ""),
    storeBannerTitle: String(row.store_banner_title ?? row.storeBannerTitle ?? ""),
    storeBannerAccent: String(row.store_banner_accent ?? row.storeBannerAccent ?? ""),
    storeBannerDescription: String(row.store_banner_description ?? row.storeBannerDescription ?? ""),
    storeBannerPath: bannerPath,
    storeBannerUrl: publicFile(bannerPath),
    notifyLoginEmail: row.notify_login_email !== false,
    notifyNewOrder: row.notify_new_order !== false,
    notifyPaymentReview: row.notify_payment_review !== false,
    notifyServiceExpiring: row.notify_service_expiring !== false,
    notifyInventoryExpiring: row.notify_inventory_expiring !== false,
  };
}

export function mapCustomer(row: Record<string, unknown>): Customer {
  return {
    id: String(row.id),
    sellerId: String(row.seller_id),
    name: String(row.name),
    whatsapp: String(row.whatsapp),
    email: String(row.email ?? ""),
    status: customerStatus[String(row.status)] ?? "activo",
    registeredAt: String(row.created_at),
  };
}

function versionedPlatformImage(path: unknown, version: string) {
  const stored = platformLogoPublicUrl(path ? String(path) : null);
  if (!stored) return null;
  return `${stored}${stored.includes("?") ? "&" : "?"}v=${encodeURIComponent(version)}`;
}

export function mapPlatform(row: Record<string, unknown>): Platform {
  const version = row.updated_at ? String(row.updated_at) : "";
  const slug = String(row.slug);
  const name = String(row.name);
  return {
    id: String(row.id),
    slug,
    name: canonicalPlatformName({ slug, name }) || name,
    tagline: String(row.tagline ?? ""),
    available: Boolean(row.available),
    accentFrom: String(row.accent_from),
    accentTo: String(row.accent_to),
    logoUrl: versionedPlatformImage(row.logo_path, version),
    customerLogoUrl: versionedPlatformImage(row.customer_logo_path ?? row.customerLogoPath, version),
  };
}

export function mapProduct(row: Record<string, unknown>, hideCost = false): Product {
  return {
    id: String(row.id),
    sellerId: String(row.seller_id),
    platformId: String(row.platform_id),
    name: String(row.name),
    description: String(row.description ?? ""),
    internalCost: hideCost ? 0 : Number(row.cost_price ?? row.internalCost ?? 0),
    salePrice: Number(row.sale_price ?? row.salePrice ?? 0),
    durationDays: Number(row.duration_days ?? row.durationDays ?? 30),
    active: String(row.status ?? "active") === "active" || row.active === true,
    stock: Number(row.stock ?? 0),
    soldOut:
      String(row.status) === "sold_out" ||
      row.soldOut === true ||
      (Boolean(row.inventoryLinked || row.inventory_linked) && Number(row.stock ?? 0) <= 0),
    compareAtPrice:
      row.compare_at_price == null && row.compareAtPrice == null ? null : Number(row.compare_at_price ?? row.compareAtPrice),
    onOffer: row.on_offer === true || row.onOffer === true,
    inventoryLinked: row.inventory_linked === true || row.inventoryLinked === true,
  };
}

export function mapOrder(
  row: Record<string, unknown>,
  extra?: { platformId?: string; planId?: string; whatsapp?: string },
): Order {
  return {
    id: String(row.id),
    code: String(row.code),
    sellerId: String(row.seller_id),
    customerId: String(row.customer_id),
    platformId: extra?.platformId ?? String(row.platform_id ?? ""),
    productId: String(row.product_id),
    planId: extra?.planId ?? "",
    amount: Number(row.amount),
    internalCost: Number(row.cost_price ?? 0),
    status: orderStatus[String(row.order_status)] ?? "pendiente_pago",
    createdAt: String(row.created_at),
    whatsapp: extra?.whatsapp ?? "",
    planName: row.duration_days ? `${Number(row.duration_days)} días` : undefined,
    deliveryNote: String(row.delivery_note ?? ""),
    deliveredAt: row.delivered_at ? String(row.delivered_at) : null,
  };
}

export function mapService(row: Record<string, unknown>): Subscription {
  return {
    id: String(row.id),
    sellerId: String(row.seller_id),
    customerId: String(row.customer_id),
    platformId: String(row.platform_id),
    productId: String(row.product_id),
    planId: "",
    startDate: String(row.start_date),
    endDate: String(row.end_date),
    durationMonths: 1,
    salePrice: Number(row.sale_price),
    internalCost: Number(row.cost_price ?? 0),
    status: serviceStatusFromDates(String(row.end_date), serviceStatus[String(row.status)] ?? "activo"),
    platformEmail: String(row.platform_email ?? row.platformEmail ?? ""),
    orderId: row.order_id ? String(row.order_id) : "",
    accessPassword: String(row.access_password ?? ""),
    accessProfile: String(row.access_profile ?? ""),
    notes: String(row.notes ?? ""),
    accountId: row.account_id ? String(row.account_id) : "",
    connectedEmailAccountId: "",
    platformEmailAssignmentId: "",
    renewalIntent: (["none", "renew", "decline"].includes(String(row.renewal_intent))
      ? String(row.renewal_intent)
      : "none") as Subscription["renewalIntent"],
  };
}

export function uiSellerStatusToDb(status: SellerStatus) {
  const map: Record<SellerStatus, string> = {
    activo: "active",
    suspendido: "suspended",
    pendiente: "pending",
    desactivado: "disabled",
  };
  return map[status];
}

export function uiCustomerStatusToDb(status: CustomerStatus) {
  const map: Record<CustomerStatus, string> = {
    activo: "active",
    inactivo: "inactive",
    suspendido: "suspended",
  };
  return map[status];
}

export { paymentStatus as mapPaymentStatus };
