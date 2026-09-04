import type {
  Customer,
  CustomerStatus,
  Order,
  OrderStatus,
  PaymentStatus,
  Platform,
  Product,
  Seller,
  SellerStatus,
  Subscription,
  SubscriptionStatus,
} from "@/lib/types";
import { serviceStatusFromDates } from "@/lib/format";
import { platformLogoPublicUrl } from "@/lib/platform-logos";

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
  return {
    id: String(row.id),
    userId: String(row.profile_id ?? ""),
    name: String(row.name),
    businessName: String(row.business_name),
    slug: String(row.slug),
    email: String(row.email),
    whatsapp: String(row.whatsapp ?? ""),
    status: sellerStatus[String(row.status)] ?? "pendiente",
    registeredAt: String(row.created_at),
    yapeHolder: String(row.yape_holder ?? ""),
    yapeNumber: String(row.yape_number ?? ""),
    plinHolder: String(row.plin_holder ?? ""),
    plinNumber: String(row.plin_number ?? ""),
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

export function mapPlatform(row: Record<string, unknown>): Platform {
  const stored = platformLogoPublicUrl(row.logo_path ? String(row.logo_path) : null);
  const version = row.updated_at ? String(row.updated_at) : "";
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    tagline: String(row.tagline ?? ""),
    available: Boolean(row.available),
    accentFrom: String(row.accent_from),
    accentTo: String(row.accent_to),
    logoUrl: stored ? `${stored}${stored.includes("?") ? "&" : "?"}v=${encodeURIComponent(version)}` : null,
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
    soldOut: String(row.status) === "sold_out" || row.soldOut === true,
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
