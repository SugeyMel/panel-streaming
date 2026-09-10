import { customers, orders, platforms, products, sellers, subscriptions } from "@/data/mock";
import { getAppSession } from "@/lib/auth/get-session";
import { mapCustomer, mapOrder, mapPlatform, mapProduct, mapSeller, mapService } from "@/lib/db/map";
import { DEMO_CUSTOMER_ID, DEMO_SELLER_ID } from "@/lib/session";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { platformDisplayName, REQUIRED_PLATFORM_SEEDS } from "@/lib/platform-logos";
import { type CustomerRow } from "@/lib/selectors";
import type {
  ConnectedEmailAccount,
  Customer,
  EmailAuditLog,
  EmailCodeFilterPolicy,
  Order,
  Platform,
  Product,
  Seller,
  StreamingAccount,
  Subscription,
  Supplier,
  WholesaleCatalogProduct,
  WholesaleSale,
  WholesaleStockEntry,
} from "@/lib/types";
import {
  compareWholesaleCatalog,
  mapWholesaleCatalogProduct,
  mapWholesaleSale,
  mapWholesaleStockEntry,
} from "@/lib/wholesale";
import { defaultEmailFilterPolicy } from "@/lib/email-code-filter";
import {
  demoEmailState,
  inventoryRowsToMailboxes,
  mapConnectedEmail,
  mapEmailAuditLog,
  mapEmailFilterPolicy,
  missingEmailCodesSql,
} from "@/lib/email-codes";
import type { HomeImagesMap } from "@/lib/home-images";
import { isHomeImageSlot } from "@/lib/home-images";
import type { PlantillasWhatsapp, TipoPlantillaMensaje } from "@/lib/whatsapp";

export async function liveClient() {
  if (!isSupabaseConfigured()) return null;
  return createClient();
}

function wholesaleLedgerClient() {
  return createServiceClient();
}

export async function loadPlatforms(): Promise<Platform[]> {
  const supabase = await liveClient();
  if (!supabase) return platforms;
  const { data, error } = await supabase.from("platforms").select("*").order("name");
  if (error) throw error;
  let rows = data ?? [];
  const existing = new Set(rows.map((row) => String(row.slug ?? "").toLowerCase()));
  const missing = REQUIRED_PLATFORM_SEEDS.filter((item) => !existing.has(item.slug));
  if (missing.length) {
    const writer = createServiceClient() ?? supabase;
    const { error: insertError } = await writer.from("platforms").insert(missing.map((item) => ({ ...item })));
    if (!insertError) {
      const retry = await supabase.from("platforms").select("*").order("name");
      if (!retry.error && retry.data) rows = retry.data;
    }
  }
  return rows.map((row) => mapPlatform(row as Record<string, unknown>));
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
  const rows = error ? (await (async () => {
    let fallback = supabase.from("orders").select("*").order("created_at", { ascending: false });
    if (filter?.sellerId) fallback = fallback.eq("seller_id", filter.sellerId);
    if (filter?.customerId) fallback = fallback.eq("customer_id", filter.customerId);
    const retry = await fallback;
    if (retry.error) throw retry.error;
    return retry.data ?? [];
  })()) : (data ?? []);

  const list = rows.map((row) => {
    const record = row as Record<string, unknown> & {
      customers?: { whatsapp?: string; name?: string } | { whatsapp?: string; name?: string }[];
      products?: { platform_id?: string; name?: string } | { platform_id?: string; name?: string }[];
      sellers?: { name?: string } | { name?: string }[];
    };
    const customer = Array.isArray(record.customers) ? record.customers[0] : record.customers;
    const product = Array.isArray(record.products) ? record.products[0] : record.products;
    const seller = Array.isArray(record.sellers) ? record.sellers[0] : record.sellers;
    const mapped = mapOrder(record, {
      whatsapp: customer?.whatsapp,
      platformId: product?.platform_id,
    });
    return {
      ...mapped,
      sellerName: seller?.name,
      customerName: customer?.name,
      platformName: product?.name,
    };
  });

  return hydrateOrderPlatforms(supabase, list);
}

async function hydrateOrderPlatforms(
  supabase: NonNullable<Awaited<ReturnType<typeof liveClient>>>,
  list: Order[],
): Promise<Order[]> {
  if (!list.length) return list;
  const productIds = [...new Set(list.map((item) => item.productId).filter(Boolean))];
  const orderIds = list.map((item) => item.id);
  const [{ data: userProductRows }, { data: platformRows }, { data: serviceRows }] = await Promise.all([
    productIds.length
      ? supabase.from("products").select("id, platform_id, name, duration_days").in("id", productIds)
      : Promise.resolve({ data: [] as { id: string; platform_id: string; name: string; duration_days?: number }[] }),
    supabase.from("platforms").select("id, name, slug"),
    supabase.from("services").select("order_id, platform_id").in("order_id", orderIds),
  ]);
  let productRows = userProductRows ?? [];
  if (productIds.length && productRows.length < productIds.length) {
    const admin = createServiceClient();
    if (admin) {
      const { data } = await admin
        .from("products")
        .select("id, platform_id, name, duration_days")
        .in("id", productIds);
      if (data?.length) productRows = data;
    }
  }
  const productById = new Map((productRows ?? []).map((row) => [String(row.id), row]));
  const platformById = new Map((platformRows ?? []).map((row) => [String(row.id), row]));
  const platformByOrder = new Map(
    (serviceRows ?? [])
      .filter((row) => row.order_id)
      .map((row) => [String(row.order_id), String(row.platform_id)]),
  );

  return list.map((order) => {
    const product = productById.get(order.productId);
    const platformId =
      order.platformId ||
      (product?.platform_id ? String(product.platform_id) : "") ||
      platformByOrder.get(order.id) ||
      "";
    const platform = platformId ? platformById.get(platformId) : undefined;
    const label = platformDisplayName(
      platform ? { id: String(platform.id), name: String(platform.name), slug: String(platform.slug ?? "") } : order.platformName,
    );
    const days = product?.duration_days ? Number(product.duration_days) : 0;
    return {
      ...order,
      platformId,
      platformName: label || (platform ? String(platform.name) : "") || order.platformName,
      planName: product?.name || (days ? `${days} días` : order.planName),
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
      expiresAt: row.expires_at ? String(row.expires_at).slice(0, 10) : null,
      supplierName: String(row.supplier_name ?? ""),
      supplierContact: String(row.supplier_contact ?? ""),
      supplierCost: Number(row.supplier_cost ?? 0),
      supplierNote: String(row.supplier_note ?? ""),
      supplierExpiresAt: row.supplier_expires_at ? String(row.supplier_expires_at).slice(0, 10) : null,
      saleKind: String(row.sale_kind) === "full" ? "full" : "profiles",
      resellerName: String(row.reseller_name ?? ""),
      resellerWhatsapp: String(row.reseller_whatsapp ?? ""),
    };
  });
}

function emailTablesClient() {
  return createServiceClient();
}

async function loadMailboxFallback(sellerId?: string | null): Promise<ConnectedEmailAccount[]> {
  if (sellerId === null) return [];
  const supabase = emailTablesClient() ?? (await liveClient());
  if (!supabase) return [];
  let query = supabase.from("streaming_accounts").select("id, seller_id, platform_id, email, supplier_note");
  if (sellerId) query = query.eq("seller_id", sellerId);
  const { data, error } = await query;
  if (error) return [];
  return inventoryRowsToMailboxes((data ?? []) as Record<string, unknown>[]);
}

export type EmailCodesBundle = {
  emails: ConnectedEmailAccount[];
  globalFilter: EmailCodeFilterPolicy;
  sellerFilter: EmailCodeFilterPolicy;
  lookups: EmailAuditLog[];
  missingSql: boolean;
};

export async function loadConnectedEmails(sellerId?: string | null): Promise<ConnectedEmailAccount[]> {
  if (sellerId === null) return [];
  const supabase = await liveClient();
  if (!supabase) {
    const emails = demoEmailState().emails;
    return sellerId ? emails.filter((item) => item.sellerId === sellerId) : emails;
  }
  const db = emailTablesClient() ?? supabase;
  let query = db.from("connected_emails").select("*").order("created_at", { ascending: false });
  if (sellerId) query = query.eq("seller_id", sellerId);
  const { data, error } = await query;
  if (error) {
    if (missingEmailCodesSql(error.message)) return loadMailboxFallback(sellerId);
    throw error;
  }
  return (data ?? []).map((row) => mapConnectedEmail(row as Record<string, unknown>));
}

export async function loadEmailFilterPolicy(sellerId: string | null): Promise<EmailCodeFilterPolicy> {
  const fallback = defaultEmailFilterPolicy(sellerId);
  const supabase = await liveClient();
  if (!supabase) {
    return (
      demoEmailState().filters.find((item) => (item.sellerId ?? "") === (sellerId ?? "")) ?? fallback
    );
  }
  const db = emailTablesClient() ?? supabase;
  let query = db.from("email_code_filters").select("*");
  query = sellerId ? query.eq("seller_id", sellerId) : query.is("seller_id", null);
  const { data, error } = await query.maybeSingle();
  if (error) {
    if (missingEmailCodesSql(error.message)) return fallback;
    throw error;
  }
  return data ? mapEmailFilterPolicy(data as Record<string, unknown>) : fallback;
}

export async function loadEmailLookups(sellerId?: string | null): Promise<EmailAuditLog[]> {
  if (sellerId === null) return [];
  const supabase = await liveClient();
  if (!supabase) {
    const lookups = demoEmailState().lookups;
    return sellerId ? lookups.filter((item) => item.sellerId === sellerId) : lookups;
  }
  const db = emailTablesClient() ?? supabase;
  let query = db.from("email_code_lookups").select("*").order("created_at", { ascending: false }).limit(80);
  if (sellerId) query = query.eq("seller_id", sellerId);
  const { data, error } = await query;
  if (error) {
    if (missingEmailCodesSql(error.message)) return [];
    throw error;
  }
  return (data ?? []).map((row) => mapEmailAuditLog(row as Record<string, unknown>));
}

export async function loadEmailCodesBundle(sellerId?: string | null): Promise<EmailCodesBundle> {
  const empty: EmailCodesBundle = {
    emails: [],
    globalFilter: defaultEmailFilterPolicy(null),
    sellerFilter: defaultEmailFilterPolicy(sellerId ?? null),
    lookups: [],
    missingSql: false,
  };
  if (sellerId === null) return empty;

  const supabase = await liveClient();
  if (!supabase) {
    const demo = demoEmailState();
    return {
      emails: sellerId ? demo.emails.filter((item) => item.sellerId === sellerId) : demo.emails,
      globalFilter: demo.filters.find((item) => !item.sellerId) ?? defaultEmailFilterPolicy(null),
      sellerFilter:
        demo.filters.find((item) => item.sellerId === (sellerId ?? "")) ??
        defaultEmailFilterPolicy(sellerId ?? null),
      lookups: sellerId ? demo.lookups.filter((item) => item.sellerId === sellerId) : demo.lookups,
      missingSql: false,
    };
  }

  const db = emailTablesClient() ?? supabase;
  const emailsQuery = sellerId
    ? db.from("connected_emails").select("*").eq("seller_id", sellerId).order("created_at", { ascending: false })
    : db.from("connected_emails").select("*").order("created_at", { ascending: false });
  const lookupsQuery = sellerId
    ? db
        .from("email_code_lookups")
        .select("*")
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false })
        .limit(80)
    : db.from("email_code_lookups").select("*").order("created_at", { ascending: false }).limit(80);

  const [emailsRes, globalRes, sellerRes, lookupsRes] = await Promise.all([
    emailsQuery,
    db.from("email_code_filters").select("*").is("seller_id", null).maybeSingle(),
    sellerId
      ? db.from("email_code_filters").select("*").eq("seller_id", sellerId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    lookupsQuery,
  ]);

  const missingSql = [emailsRes.error, globalRes.error, sellerRes.error, lookupsRes.error]
    .map((error) => error?.message ?? "")
    .some((message) => message && missingEmailCodesSql(message));

  return {
    emails: missingSql
      ? await loadMailboxFallback(sellerId)
      : (emailsRes.data ?? []).map((row) => mapConnectedEmail(row as Record<string, unknown>)),
    globalFilter: globalRes.data
      ? mapEmailFilterPolicy(globalRes.data as Record<string, unknown>)
      : defaultEmailFilterPolicy(null),
    sellerFilter: sellerRes.data
      ? mapEmailFilterPolicy(sellerRes.data as Record<string, unknown>)
      : defaultEmailFilterPolicy(sellerId ?? null),
    lookups: missingSql ? [] : (lookupsRes.data ?? []).map((row) => mapEmailAuditLog(row as Record<string, unknown>)),
    missingSql,
  };
}

export async function loadCustomerRows(sellerId?: string | null): Promise<CustomerRow[]> {
  const list = await loadCustomers(sellerId);
  const [services, allOrders, allSellers] = await Promise.all([
    loadServices(sellerId ? { sellerId } : undefined).catch(() => []),
    loadOrders(sellerId ? { sellerId } : undefined).catch(() => []),
    sellerId ? Promise.resolve([]) : loadSellers().catch(() => []),
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

export async function loadSuppliers(): Promise<Supplier[]> {
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
  return (data ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    return {
      id: String(record.id),
      name: String(record.name ?? ""),
      contact: record.contact ? String(record.contact) : null,
      status: String(record.status ?? "active"),
      notes: record.notes ? String(record.notes) : null,
    };
  });
}

function wholesaleAbort() {
  return AbortSignal.timeout(8000);
}

export async function loadWholesaleSales(): Promise<WholesaleSale[]> {
  const supabase = await liveClient();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("wholesale_sales")
      .select("*")
      .order("purchased_at", { ascending: false })
      .abortSignal(wholesaleAbort());
    if (error) return [];
    return (data ?? []).map((row) => mapWholesaleSale(row as Record<string, unknown>));
  } catch {
    return [];
  }
}

async function loadWholesaleLedger(): Promise<{ entries: WholesaleStockEntry[]; sales: WholesaleSale[] }> {
  const supabase = wholesaleLedgerClient() ?? (await liveClient());
  if (!supabase) return { entries: [], sales: [] };
  try {
    const [entriesRes, salesRes] = await Promise.all([
      supabase.from("wholesale_stock_entries").select("*").abortSignal(wholesaleAbort()),
      supabase.from("wholesale_sales").select("*").abortSignal(wholesaleAbort()),
    ]);
    return {
      entries: (entriesRes.data ?? []).map((row) => mapWholesaleStockEntry(row as Record<string, unknown>)),
      sales: (salesRes.data ?? []).map((row) => mapWholesaleSale(row as Record<string, unknown>)),
    };
  } catch {
    return { entries: [], sales: [] };
  }
}

export async function loadWholesaleStockEntries(): Promise<WholesaleStockEntry[]> {
  const { entries } = await loadWholesaleLedger();
  return entries;
}

export async function loadSupplierProducts(): Promise<WholesaleCatalogProduct[]> {
  const supabase = await liveClient();
  if (!supabase) return [];
  const { entries, sales } = await loadWholesaleLedger();
  try {
    const { data, error } = await supabase
      .from("supplier_products")
      .select("*")
      .order("name")
      .abortSignal(wholesaleAbort());
    if (error) {
      const missingColumn = /column .* does not exist|image_path/i.test(error.message);
      if (!missingColumn) return [];
      const retry = await supabase
        .from("supplier_products")
        .select("id, supplier_id, platform_id, name, description, wholesale_price, cost_price, offer_kind, status, notes, updated_at")
        .abortSignal(wholesaleAbort());
      if (retry.error) return [];
      return (retry.data ?? []).map((row) =>
        mapWholesaleCatalogProduct(row as Record<string, unknown>, entries, sales),
      ).sort(compareWholesaleCatalog);
    }
    return (data ?? []).map((row) => mapWholesaleCatalogProduct(row as Record<string, unknown>, entries, sales)).sort(compareWholesaleCatalog);
  } catch {
    return [];
  }
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

const TIPOS_PLANTILLA = new Set<TipoPlantillaMensaje>([
  "recordatorio_vencimiento",
  "oferta_renovacion",
  "entrega_pedido",
  "bienvenida",
]);

export async function loadMessageTemplates(sellerId: string | null): Promise<PlantillasWhatsapp> {
  if (!sellerId) return {};
  const supabase = await liveClient();
  if (!supabase) return {};
  const { data, error } = await supabase
    .from("message_templates")
    .select("tipo, cuerpo, cuerpo_vencido, activo")
    .eq("seller_id", sellerId);
  if (error) return {};
  const plantillas: PlantillasWhatsapp = {};
  for (const row of data ?? []) {
    const record = row as Record<string, unknown>;
    const tipo = String(record.tipo) as TipoPlantillaMensaje;
    if (!TIPOS_PLANTILLA.has(tipo)) continue;
    plantillas[tipo] = {
      tipo,
      cuerpo: String(record.cuerpo ?? ""),
      cuerpoVencido: record.cuerpo_vencido == null || String(record.cuerpo_vencido).trim() === ""
        ? null
        : String(record.cuerpo_vencido),
      activo: record.activo !== false,
    };
  }
  return plantillas;
}

export async function loadHomeImages(sellerId: string | null): Promise<HomeImagesMap> {
  if (!sellerId) return {};
  const supabase = await liveClient();
  if (!supabase) return {};
  const { data, error } = await supabase
    .from("home_images")
    .select("slot, storage_path, updated_at")
    .eq("seller_id", sellerId);
  if (error) return {};
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
  const images: HomeImagesMap = {};
  for (const row of data ?? []) {
    const record = row as Record<string, unknown>;
    const slot = String(record.slot);
    if (!isHomeImageSlot(slot)) continue;
    const storagePath = String(record.storage_path ?? "");
    if (!storagePath || !base) continue;
    const version = String(record.updated_at ?? storagePath);
    images[slot] = {
      slot,
      storagePath,
      url: `${base}/storage/v1/object/public/seller-logos/${storagePath.replace(/^\/+/, "")}?v=${encodeURIComponent(version)}`,
    };
  }
  return images;
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
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
  return (data ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    const qrPath = record.qr_path ? String(record.qr_path) : null;
    const logoPath = record.logo_path ? String(record.logo_path) : null;
    return {
      id: String(record.id),
      sellerId: String(record.seller_id),
      kind: String(record.kind) as "yape" | "plin" | "bank",
      holderName: String(record.holder_name),
      accountNumber: String(record.account_number),
      qrPath,
      qrUrl:
        qrPath && base
          ? `${base}/storage/v1/object/public/seller-qr/${qrPath.replace(/^\/+/, "")}?v=${encodeURIComponent(String(record.updated_at ?? qrPath))}`
          : null,
      logoPath,
      logoUrl:
        logoPath && base
          ? `${base}/storage/v1/object/public/seller-logos/${logoPath.replace(/^\/+/, "")}?v=${encodeURIComponent(String(record.updated_at ?? logoPath))}`
          : null,
      isPrimary: record.is_primary === true,
      isActive: record.is_active !== false,
    };
  }).sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
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

export type StoreOfferLink = {
  id: string;
  sellerId: string;
  platformId: string;
  productName: string;
  accountId: string;
};

export async function loadStoreOfferLinks(sellerId: string | null): Promise<StoreOfferLink[]> {
  if (!sellerId) return [];
  const supabase = await liveClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("store_offer_accounts")
    .select("id, seller_id, platform_id, product_name, account_id")
    .eq("seller_id", sellerId);
  if (error) return [];
  return (data ?? []).map((row) => ({
    id: String(row.id),
    sellerId: String(row.seller_id),
    platformId: String(row.platform_id),
    productName: String(row.product_name),
    accountId: String(row.account_id),
  }));
}

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
    logo_path: payload.seller.logoPath,
    store_message: payload.seller.storeMessage,
    store_banner_enabled: payload.seller.storeBannerEnabled,
    store_banner_kicker: payload.seller.storeBannerKicker,
    store_banner_title: payload.seller.storeBannerTitle,
    store_banner_accent: payload.seller.storeBannerAccent,
    store_banner_description: payload.seller.storeBannerDescription,
    store_banner_path: payload.seller.storeBannerPath,
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
        compare_at_price: row.compareAtPrice,
        on_offer: row.onOffer,
        inventoryLinked: row.inventoryLinked,
      },
      true,
    ),
  );
  return { seller, products: list };
}
