import {
  connectedEmails,
  customers,
  emailAuditLogs,
  orders,
  payments,
  plans,
  platforms,
  products,
  sellers,
  subscriptions,
} from "@/data/mock";
import { daysRemaining } from "@/lib/format";
import type {
  ExpiryAlertLevel,
  FinancialSummary,
  Order,
  Subscription,
  Customer,
  Product,
} from "@/lib/types";

export function getSeller(id: string) {
  return sellers.find((item) => item.id === id);
}

export function getCustomer(id: string) {
  return customers.find((item) => item.id === id);
}

export function getPlatform(id: string) {
  return platforms.find((item) => item.id === id);
}

export function getProduct(id: string) {
  return products.find((item) => item.id === id);
}

export function getPlan(id: string) {
  return plans.find((item) => item.id === id);
}

export function sellerCustomers(sellerId: string) {
  return customers.filter((item) => item.sellerId === sellerId);
}

export function sellerProducts(sellerId: string) {
  return products.filter((item) => item.sellerId === sellerId && item.active);
}

export function sellerOrders(sellerId: string) {
  return orders.filter((item) => item.sellerId === sellerId);
}

export function sellerSubscriptions(sellerId: string) {
  return subscriptions.filter((item) => item.sellerId === sellerId);
}

export function customerSubscriptions(customerId: string) {
  return subscriptions.filter((item) => item.customerId === customerId);
}

export function customerOrders(customerId: string) {
  return orders.filter((item) => item.customerId === customerId);
}

export function sellerEmails(sellerId: string) {
  return connectedEmails.filter((item) => item.sellerId === sellerId);
}

export function productPlans(productId: string) {
  return plans.filter((item) => item.productId === productId);
}

export const PRODUCT_TERMS = [
  { months: 1, days: 30, field: "price30", label: "1 mes" },
  { months: 3, days: 90, field: "price90", label: "3 meses" },
  { months: 6, days: 180, field: "price180", label: "6 meses" },
  { months: 12, days: 365, field: "price365", label: "12 meses" },
] as const;

export const RENEWAL_TERMS = [
  { months: 1, minDays: 28, maxDays: 31, label: "1 mes" },
  { months: 3, minDays: 85, maxDays: 95, label: "3 meses" },
  { months: 6, minDays: 170, maxDays: 190, label: "6 meses" },
  { months: 12, minDays: 350, maxDays: 380, label: "12 meses" },
] as const;

export function productOfferKey(platformId: string, name: string) {
  return `${platformId}::${name.trim().toLowerCase()}`;
}

export type ProductOffer = {
  id: string;
  platformId: string;
  name: string;
  description: string;
  internalCost: number;
  stock: number;
  active: boolean;
  onOffer: boolean;
  compareAtPrice: number | null;
  inventoryLinked: boolean;
  variants: Product[];
};

export function groupProductOffers(list: Product[]): ProductOffer[] {
  const buckets = new Map<string, Product[]>();
  for (const item of list) {
    const key = productOfferKey(item.platformId, item.name);
    const bucket = buckets.get(key) ?? [];
    bucket.push(item);
    buckets.set(key, bucket);
  }
  return [...buckets.values()].map((variants) => {
    const ordered = [...variants].sort((a, b) => a.durationDays - b.durationDays);
    const primary = ordered[0];
    return {
      id: productOfferKey(primary.platformId, primary.name),
      platformId: primary.platformId,
      name: primary.name,
      description: primary.description,
      internalCost: primary.internalCost,
      stock: primary.stock,
      active: variants.some((item) => item.active),
      onOffer: variants.some((item) => item.onOffer),
      compareAtPrice:
        variants
          .map((item) => item.compareAtPrice)
          .filter((value): value is number => value != null && value > 0)
          .sort((a, b) => a - b)[0] ?? null,
      inventoryLinked: variants.some((item) => item.inventoryLinked),
      variants: ordered,
    };
  });
}

export function activePlans(offer: ProductOffer) {
  const used = new Set<string>();
  const fromTerms = PRODUCT_TERMS.flatMap((term) => {
    const product =
      offer.variants.find((item) => item.active && item.durationDays === term.days) ??
      offer.variants.find((item) => item.active && Math.abs(item.durationDays - term.days) <= 5);
    if (!product || used.has(product.id)) return [];
    used.add(product.id);
    return [{ ...term, product }];
  });
  const extras = offer.variants
    .filter((item) => item.active && !used.has(item.id))
    .map((product) => ({
      months: Math.max(1, Math.round(product.durationDays / 30)),
      days: product.durationDays,
      field: `price${product.durationDays}` as const,
      label: `${product.durationDays} días`,
      product,
    }));
  return [...fromTerms, ...extras];
}

export function renewalOptionsForPlatform(
  productList: Product[],
  platformId: string,
  fallback?: Product | null,
) {
  const listed = productList.filter(
    (item) => item.active && (item.platformId === platformId || item.id === fallback?.id),
  );
  return RENEWAL_TERMS.map((term) => {
    const product =
      listed.find((item) => item.durationDays >= term.minDays && item.durationDays <= term.maxDays) ??
      listed.find((item) => Math.round(item.durationDays / 30) === term.months) ??
      (term.months === 1 ? fallback ?? listed[0] ?? null : null);
    return { ...term, product };
  });
}

export function profitOf(salePrice: number, internalCost: number) {
  return salePrice - internalCost;
}

export function summarizeOrders(list: Order[]): FinancialSummary {
  const paid = list.filter((item) =>
    ["pago_aprobado", "preparando", "entregado"].includes(item.status),
  );
  const sales = paid.reduce((sum, item) => sum + item.amount, 0);
  const costs = paid.reduce((sum, item) => sum + item.internalCost, 0);
  return {
    sales,
    costs,
    profit: sales - costs,
    paidOrders: paid.length,
    averageTicket: paid.length ? sales / paid.length : 0,
  };
}

export function expiryLevel(subscription: Subscription): ExpiryAlertLevel | null {
  const days = daysRemaining(subscription.endDate);
  if (days < 0 || subscription.status === "vencido") return "vencido";
  if (days === 0) return "vence_hoy";
  if (days === 1) return "vence_manana";
  if (days <= 3) return "vence_3_dias";
  if (days <= 7) return "vence_7_dias";
  return null;
}

export function expiryLabel(level: ExpiryAlertLevel) {
  const map: Record<ExpiryAlertLevel, string> = {
    vence_hoy: "Vence hoy",
    vence_manana: "Vence mañana",
    vence_3_dias: "Vence en 3 días",
    vence_7_dias: "Vence en 7 días",
    vencido: "Vencido",
  };
  return map[level];
}

export function orderPayment(orderId: string) {
  return payments.find((item) => item.orderId === orderId);
}

export function sellerEmailLookups(sellerId: string) {
  return emailAuditLogs.filter((item) => item.sellerId === sellerId);
}

export type CustomerRow = Customer & {
  sellerName?: string;
  activeServices: number;
  expiredServices: number;
  nextExpiry: string | null;
  totalPurchases: number;
  lastPurchase: string | null;
};

export function toCustomerRow(customer: Customer): CustomerRow {
  const services = subscriptions.filter((item) => item.customerId === customer.id);
  const customerOrdersList = orders.filter((item) => item.customerId === customer.id);
  const upcoming = services
    .filter((item) => item.status !== "vencido" && item.status !== "cancelado")
    .sort((a, b) => a.endDate.localeCompare(b.endDate))[0];
  const last = [...customerOrdersList].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  return {
    ...customer,
    sellerName: getSeller(customer.sellerId)?.name,
    activeServices: services.filter((item) => item.status === "activo" || item.status === "proximo_a_vencer").length,
    expiredServices: services.filter((item) => item.status === "vencido").length,
    nextExpiry: upcoming?.endDate ?? null,
    totalPurchases: customerOrdersList.reduce((sum, item) => sum + item.amount, 0),
    lastPurchase: last?.createdAt ?? null,
  };
}

export function namedOrder(order: Order) {
  return {
    ...order,
    sellerName: order.sellerName ?? getSeller(order.sellerId)?.name ?? "—",
    customerName: order.customerName ?? getCustomer(order.customerId)?.name ?? "—",
    platformName: order.platformName ?? getPlatform(order.platformId)?.name ?? "—",
    planName: order.planName ?? getPlan(order.planId)?.name ?? "—",
  };
}
