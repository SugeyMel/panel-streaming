import { customers, orders, platforms, products, sellers, subscriptions } from "@/data/mock";
import { getAppSession } from "@/lib/auth/get-session";
import { mapCustomer, mapOrder, mapPlatform, mapProduct, mapSeller, mapService } from "@/lib/db/map";
import { DEMO_CUSTOMER_ID, DEMO_SELLER_ID } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { type CustomerRow } from "@/lib/selectors";
import type { Customer, Order, Platform, Product, Seller, StreamingAccount, Subscription } from "@/lib/types";

export async function liveClient() {
  if (!isSupabaseConfigured()) return null;
  return createClient();
}

export async function loadPlatforms(): Promise<Platform[]> {
  const supabase = await liveClient();
  if (!supabase) return platforms;
  const { data, error } = await supabase.from("platforms").select("*").order("name");
  if (error) throw error;
  return (data ?? []).map((row) => mapPlatform(row as Record<string, unknown>));
}

export async function loadSellers(): Promise<Seller[]> {
  const supabase = await liveClient();
  if (!supabase) return sellers;
  const { data, error } = await supabase.from("sellers").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapSeller(row as Record<string, unknown>));
}

export async function loadCustomers(sellerId?: string | null): Promise<Customer[]> {
  if (sellerId === null) return [];
  const supabase = await liveClient();
  if (!supabase) {
    return sellerId ? customers.filter((item) => item.sellerId === sellerId) : customers;
  }
  let query = supabase.from("customers").select("*").order("created_at", { ascending: false });
  if (sellerId) query = query.eq("seller_id", sellerId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => mapCustomer(row as Record<string, unknown>));
}

export async function loadProducts(sellerId?: string | null, hideCost = false): Promise<Product[]> {
  if (sellerId === null) return [];
  const supabase = await liveClient();
  if (!supabase) {
    const list = sellerId ? products.filter((item) => item.sellerId === sellerId) : products;
    return hideCost ? list.map((item) => ({ ...item, internalCost: 0 })) : list;
  }
  let query = supabase.from("products").select("*").order("name");
  if (sellerId) query = query.eq("seller_id", sellerId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => mapProduct(row as Record<string, unknown>, hideCost));
}

export async function loadOrders(filter?: { sellerId?: string | null; customerId?: string | null }): Promise<Order[]> {
  if (filter?.sellerId === null || filter?.customerId === null) return [];
  const supabase = await liveClient();
  if (!supabase) {
    return orders.filter((item) => {
      if (filter?.sellerId && item.sellerId !== filter.sellerId) return false;
      if (filter?.customerId && item.customerId !== filter.customerId) return false;
      return true;
    });
  }
  let query = supabase
    .from("orders")
    .select("*, customers(whatsapp, name), products(platform_id, name), sellers(name)")
    .order("created_at", { ascending: false });
  if (filter?.sellerId) query = query.eq("seller_id", filter.sellerId);
  if (filter?.customerId) query = query.eq("customer_id", filter.customerId);
  const { data, error } = await query;
  if (error) {
    let fallback = supabase.from("orders").select("*").order("created_at", { ascending: false });
    if (filter?.sellerId) fallback = fallback.eq("seller_id", filter.sellerId);
    if (filter?.customerId) fallback = fallback.eq("customer_id", filter.customerId);
    const retry = await fallback;
    if (retry.error) throw retry.error;
    return (retry.data ?? []).map((row) => {
      const record = row as Record<string, unknown>;
      const mapped = mapOrder(record);
      return mapped;
    });
  }
  return (data ?? []).map((row) => {
    const record = row as Record<string, unknown> & {
      customers?: { whatsapp?: string; name?: string };
      products?: { platform_id?: string; name?: string };
      sellers?: { name?: string };
    };
    const mapped = mapOrder(record, {
      whatsapp: record.customers?.whatsapp,
      platformId: record.products?.platform_id,
    });
    return {
      ...mapped,
      sellerName: record.sellers?.name,
      customerName: record.customers?.name,
      platformName: record.products?.name,
    };
  });
}

export async function loadServices(filter?: {
  sellerId?: string | null;
  customerId?: string | null;
}): Promise<Subscription[]> {
  if (filter?.sellerId === null || filter?.customerId === null) return [];
  const supabase = await liveClient();
  if (!supabase) {
    return subscriptions.filter((item) => {
      if (filter?.sellerId && item.sellerId !== filter.sellerId) return false;
      if (filter?.customerId && item.customerId !== filter.customerId) return false;
      return true;
    });
  }
  let query = supabase.from("services").select("*").order("end_date", { ascending: false });
  if (filter?.sellerId) query = query.eq("seller_id", filter.sellerId);
  if (filter?.customerId) query = query.eq("customer_id", filter.customerId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => mapService(row as Record<string, unknown>));
}

export async function loadStreamingAccounts(sellerId: string | null): Promise<StreamingAccount[]> {
  if (!sellerId) return [];
  const supabase = await liveClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("streaming_accounts")
    .select("*")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });
  if (error) return [];
  const services = await loadServices({ sellerId });
  return (data ?? []).map((row) => {
    const id = String(row.id);
    const email = String(row.email ?? "");
    const occupied = services.filter(
      (item) =>
        item.accountId === id ||
        (email && item.platformEmail.toLowerCase() === email.toLowerCase()),
    );
    const status = String(row.status) as StreamingAccount["status"];
    return {
      id,
      sellerId: String(row.seller_id),
      platformId: String(row.platform_id),
      email,
      password: String(row.password ?? ""),
      label: String(row.label ?? ""),
      maxProfiles: Number(row.max_profiles ?? 5),
      status: status === "full" || status === "inactive" ? status : "available",
      usedProfiles: occupied.length,
    };
  });
}

export async function loadCustomerRows(sellerId?: string | null): Promise<CustomerRow[]> {
  const [list, services, allOrders, allSellers] = await Promise.all([
    loadCustomers(sellerId),
    loadServices(sellerId ? { sellerId } : undefined),
    loadOrders(sellerId ? { sellerId } : undefined),
    loadSellers(),
  ]);
  return list.map((customer) => {
    const customerServices = services.filter((item) => item.customerId === customer.id);
    const customerOrders = allOrders.filter((item) => item.customerId === customer.id);
    const upcoming = customerServices
      .filter((item) => item.status !== "vencido" && item.status !== "cancelado")
      .sort((a, b) => a.endDate.localeCompare(b.endDate))[0];
    const last = [...customerOrders].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    return {
      ...customer,
      sellerName: allSellers.find((item) => item.id === customer.sellerId)?.name,
      activeServices: customerServices.filter(
        (item) => item.status === "activo" || item.status === "proximo_a_vencer",
      ).length,
      expiredServices: customerServices.filter((item) => item.status === "vencido").length,
      nextExpiry: upcoming?.endDate ?? null,
      totalPurchases: customerOrders.reduce((sum, item) => sum + item.amount, 0),
      lastPurchase: last?.createdAt ?? null,
    };
  });
}

export async function loadExpenses(sellerId?: string | null) {
  if (sellerId === null) return [];
  const supabase = await liveClient();
  if (!supabase) {
    return [{ id: "exp_demo", sellerId: DEMO_SELLER_ID, amount: 120, description: "Recarga mayorista", occurredAt: "2026-09-01" }]
      .filter((item) => !sellerId || item.sellerId === sellerId);
  }
  let query = supabase.from("expenses").select("*").order("occurred_at", { ascending: false });
  if (sellerId) query = query.eq("seller_id", sellerId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: String(row.id),
    sellerId: String(row.seller_id),
    amount: Number(row.amount),
    description: String(row.description),
    occurredAt: String(row.occurred_at),
  }));
}

export async function loadSuppliers() {
  const supabase = await liveClient();
  if (!supabase) {
    return [
      {
        id: "sup_demo",
        name: "Mayorista Demo",
        contact: "999000111",
        status: "active",
        notes: "Visible cuando Supabase esté conectado con datos reales.",
      },
    ];
  }
  const { data, error } = await supabase.from("suppliers").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function loadSupplierProducts() {
  const supabase = await liveClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from("supplier_products").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function loadCustomerById(id: string | null) {
  if (!id) return null;
  const supabase = await liveClient();
  if (!supabase) return customers.find((item) => item.id === id) ?? null;
  const { data, error } = await supabase.from("customers").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapCustomer(data as Record<string, unknown>) : null;
}

export async function loadSellerById(id: string | null) {
  if (!id) return null;
  const supabase = await liveClient();
  if (!supabase) return sellers.find((item) => item.id === id) ?? null;
  const { data, error } = await supabase.from("sellers").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapSeller(data as Record<string, unknown>) : null;
}

export async function loadPaymentMethods(sellerId: string | null) {
  if (!sellerId) return [];
  const supabase = await liveClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("seller_payment_methods")
    .select("*")
    .eq("seller_id", sellerId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: String(row.id),
    sellerId: String(row.seller_id),
    kind: String(row.kind) as "yape" | "plin" | "bank",
    holderName: String(row.holder_name),
    accountNumber: String(row.account_number),
  }));
}

export async function loadOrderReceiptUrl(orderId: string) {
  const supabase = await liveClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("payment_receipts")
    .select("storage_path")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data?.storage_path) return null;
  const { data: signed } = await supabase.storage
    .from("payment-receipts")
    .createSignedUrl(String(data.storage_path), 60 * 60);
  return signed?.signedUrl ?? null;
}

export async function loadFinance(sellerId?: string | null) {
  if (sellerId === null) {
    return {
      sales: 0,
      costs: 0,
      grossProfit: 0,
      expenses: 0,
      netProfit: 0,
      paidOrders: 0,
      averageTicket: 0,
      pendingOrders: 0,
      activeServices: 0,
      expiringServices: 0,
    };
  }
  const [orderList, expenseList, serviceList] = await Promise.all([
    loadOrders(sellerId ? { sellerId } : undefined),
    loadExpenses(sellerId),
    loadServices(sellerId ? { sellerId } : undefined),
  ]);
  const paid = orderList.filter((item) =>
    ["pago_aprobado", "preparando", "entregado"].includes(item.status),
  );
  const sales = paid.reduce((sum, item) => sum + item.amount, 0);
  const costs = paid.reduce((sum, item) => sum + item.internalCost, 0);
  const expensesTotal = expenseList.reduce((sum, item) => sum + item.amount, 0);
  const pendingOrders = orderList.filter((item) =>
    ["pendiente_pago", "pago_enviado"].includes(item.status),
  ).length;
  const activeServices = serviceList.filter((item) => item.status === "activo").length;
  const expiringServices = serviceList.filter((item) => item.status === "proximo_a_vencer").length;
  return {
    sales,
    costs,
    grossProfit: sales - costs,
    expenses: expensesTotal,
    netProfit: sales - costs - expensesTotal,
    paidOrders: paid.length,
    averageTicket: paid.length ? sales / paid.length : 0,
    pendingOrders,
    activeServices,
    expiringServices,
  };
}

export async function panelScope() {
  const session = await getAppSession();
  const sellerId = session.mode === "live" ? session.sellerId : DEMO_SELLER_ID;
  return { session, sellerId };
}

export async function customerScope() {
  const session = await getAppSession();
  const customerId = session.mode === "live" ? session.customerId : DEMO_CUSTOMER_ID;
  return { session, customerId };
}

export { type CustomerRow };

export async function loadStorefront(slug: string) {
  const supabase = await liveClient();
  if (!supabase) {
    const seller = sellers.find((item) => item.slug === slug);
    if (!seller) return null;
    return {
      seller,
      products: products.filter((item) => item.sellerId === seller.id && item.active),
    };
  }
  const { data, error } = await supabase.rpc("get_storefront", { p_seller_slug: slug });
  if (error) throw error;
  if (!data) return null;
  const payload = data as {
    seller: Record<string, unknown>;
    products: Record<string, unknown>[];
  };
  const seller = mapSeller({
    id: payload.seller.id,
    profile_id: "",
    name: payload.seller.name,
    business_name: payload.seller.businessName,
    slug: payload.seller.slug,
    email: "",
    whatsapp: payload.seller.whatsapp,
    status: "active",
    created_at: new Date().toISOString(),
    yape_holder: payload.seller.yapeHolder,
    yape_number: payload.seller.yapeNumber,
    plin_holder: payload.seller.plinHolder,
    plin_number: payload.seller.plinNumber,
  });
  const list = (payload.products ?? []).map((row) =>
    mapProduct(
      {
        id: row.id,
        seller_id: payload.seller.id,
        platform_id: row.platformId,
        name: row.name,
        description: row.description,
        sale_price: row.salePrice,
        duration_days: row.durationDays,
        stock: row.stock,
        status: "active",
        cost_price: 0,
      },
      true,
    ),
  );
  return { seller, products: list };
}
