export type UserRole = "admin" | "superadmin" | "seller" | "customer" | "support";

export const DEFAULT_SUPPORT_HOURS = "Lun a Dom · 8:00 am – 11:00 pm";

export type SellerStatus = "activo" | "suspendido" | "pendiente" | "desactivado";

export type CustomerStatus = "activo" | "inactivo" | "suspendido";

export type SubscriptionStatus =
  | "activo"
  | "proximo_a_vencer"
  | "vencido"
  | "suspendido"
  | "cancelado";

export type OrderStatus =
  | "pendiente_pago"
  | "pago_enviado"
  | "pago_aprobado"
  | "preparando"
  | "entregado"
  | "cancelado";

export type PaymentMethod = "yape" | "plin" | "bank";

export type SellerPaymentMethod = {
  id: string;
  sellerId: string;
  kind: PaymentMethod;
  holderName: string;
  accountNumber: string;
  qrPath?: string | null;
  qrUrl?: string | null;
  logoPath?: string | null;
  logoUrl?: string | null;
  isPrimary: boolean;
  isActive: boolean;
};

export type PaymentStatus = "pendiente" | "enviado" | "aprobado" | "rechazado";

export type SupportStatus = "pendiente" | "en_proceso" | "respondido" | "cerrado";

export type EmailProvider = "google" | "microsoft";

export type EmailConnectionStatus =
  | "registrado"
  | "conectado"
  | "requiere_reconexion"
  | "desconectado"
  | "error";

export type EmailLookupStatus =
  | "encontrado"
  | "no_encontrado"
  | "bloqueado"
  | "error"
  | "sin_autorizacion"
  | "servicio_vencido";

export type EmailLookupType =
  | "LOGIN_CODE"
  | "VERIFICATION_CODE"
  | "NETFLIX_TRAVEL_CODE"
  | "NETFLIX_HOUSEHOLD_ACTION"
  | "UNKNOWN_BLOCKED";

export type User = {
  id: string;
  role: UserRole;
  name: string;
  email: string;
};

export type Admin = User & {
  role: "admin";
};

export type Seller = {
  id: string;
  userId: string;
  name: string;
  businessName: string;
  slug: string;
  email: string;
  whatsapp: string;
  supportHours: string;
  status: SellerStatus;
  /** false = el administrador desactivó la creación de clientes para este vendedor. */
  canCreateCustomers?: boolean;
  registeredAt: string;
  yapeHolder: string;
  yapeNumber: string;
  plinHolder: string;
  plinNumber: string;
  logoPath: string | null;
  logoUrl: string | null;
  storeMessage: string;
  storeBannerEnabled: boolean;
  storeBannerKicker: string;
  storeBannerTitle: string;
  storeBannerAccent: string;
  storeBannerDescription: string;
  storeBannerPath: string | null;
  storeBannerUrl: string | null;
  notifyLoginEmail: boolean;
  notifyNewOrder: boolean;
  notifyPaymentReview: boolean;
  notifyServiceExpiring: boolean;
  notifyInventoryExpiring: boolean;
};

export type Customer = {
  id: string;
  sellerId: string;
  name: string;
  whatsapp: string;
  email: string;
  status: CustomerStatus;
  registeredAt: string;
};

export type CustomerAccount = {
  id: string;
  customerId: string;
  sellerId: string;
  name: string;
  email: string;
  whatsapp: string;
  status: "activo" | "pendiente" | "suspendido";
  lastAccessAt: string | null;
};

export type Platform = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  available: boolean;
  accentFrom: string;
  accentTo: string;
  logoUrl?: string | null;
  customerLogoUrl?: string | null;
};

export type Product = {
  id: string;
  sellerId: string;
  platformId: string;
  name: string;
  description: string;
  internalCost: number;
  salePrice: number;
  durationDays: number;
  active: boolean;
  stock: number;
  soldOut: boolean;
  compareAtPrice: number | null;
  onOffer: boolean;
  inventoryLinked: boolean;
};

export type StreamingAccount = {
  id: string;
  sellerId: string;
  platformId: string;
  email: string;
  password: string;
  label: string;
  maxProfiles: number;
  status: "available" | "full" | "inactive";
  usedProfiles: number;
  expiresAt: string | null;
  supplierName: string;
  supplierContact: string;
  supplierCost: number;
  supplierNote: string;
  supplierExpiresAt: string | null;
  saleKind: "profiles" | "full";
  resellerName: string;
  resellerWhatsapp: string;
  /** true cuando el administrador asignó la cuenta a este vendedor. */
  assignedByAdmin?: boolean;
};

export type Plan = {
  id: string;
  productId: string;
  name: string;
  durationMonths: number;
  salePrice: number;
  internalCost: number;
  custom: boolean;
};

export type Subscription = {
  id: string;
  sellerId: string;
  customerId: string;
  platformId: string;
  productId: string;
  planId: string;
  startDate: string;
  endDate: string;
  durationMonths: number;
  salePrice: number;
  internalCost: number;
  status: SubscriptionStatus;
  platformEmail: string;
  connectedEmailAccountId: string;
  platformEmailAssignmentId: string;
  renewalIntent?: "none" | "renew" | "decline";
  orderId?: string;
  accountId?: string;
  accessPassword?: string;
  accessProfile?: string;
  notes?: string;
};

export type OrderItem = {
  id: string;
  orderId: string;
  productId: string;
  planId: string;
  platformId: string;
  quantity: number;
  amount: number;
};

export type Order = {
  id: string;
  code: string;
  sellerId: string;
  customerId: string;
  platformId: string;
  productId: string;
  planId: string;
  amount: number;
  internalCost: number;
  status: OrderStatus;
  createdAt: string;
  whatsapp: string;
  sellerName?: string;
  customerName?: string;
  platformName?: string;
  planName?: string;
  deliveryNote?: string;
  deliveredAt?: string | null;
};

export type Payment = {
  id: string;
  orderId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  holder: string;
  number: string;
  voucherName: string | null;
  createdAt: string;
};

export type Transaction = {
  id: string;
  sellerId: string;
  orderId: string;
  type: "ingreso" | "costo";
  amount: number;
  createdAt: string;
};

export type FinancialSummary = {
  sales: number;
  costs: number;
  profit: number;
  paidOrders: number;
  averageTicket: number;
};

export type SupportRequest = {
  id: string;
  customerId: string;
  sellerId: string;
  subscriptionId: string | null;
  subject: string;
  message: string;
  status: SupportStatus;
  createdAt: string;
};

export type SellerSupportRequest = {
  id: string;
  sellerId: string;
  platformId: string | null;
  customerId: string | null;
  subscriptionId: string | null;
  type: string;
  description: string;
  status: SupportStatus;
  createdAt: string;
};

export type AuditLog = {
  id: string;
  userId: string;
  userName: string;
  role: UserRole;
  action: string;
  entity: string;
  result: string;
  createdAt: string;
};

export type ConnectedEmailAccount = {
  id: string;
  sellerId: string;
  email: string;
  provider: EmailProvider;
  status: EmailConnectionStatus;
  lastSyncAt: string | null;
  linkedPlatformIds: string[];
  codesEnabled: boolean;
  oauthEmail?: string | null;
};

export type EmailCodeFilterPolicy = {
  id: string;
  sellerId: string | null;
  allowLoginCode: boolean;
  allowVerificationCode: boolean;
  allowNetflixTravel: boolean;
  allowNetflixHousehold: boolean;
  extraBlockKeywords: string[];
};

export type PlatformEmailAssignment = {
  id: string;
  sellerId: string;
  customerId: string;
  subscriptionId: string;
  platformId: string;
  platformEmail: string;
  connectedEmailAccountId: string;
};

export type AllowedEmailRule = {
  id: string;
  platformId: string | "any";
  type: EmailLookupType;
  senders: string[];
  domains: string[];
  subjects: string[];
  urlPatterns: string[];
};

export type BlockedEmailRule = {
  id: string;
  category: string;
  description: string;
};

export type EmailLookupRequest = {
  customerId: string;
  sellerId: string;
  subscriptionId: string;
  platformId: string;
  connectedEmailAccountId: string;
  platformEmailAssignmentId: string;
};

export type EmailLookupResult = {
  type: EmailLookupType;
  status: "FOUND" | "NOT_FOUND" | "BLOCKED" | "DENIED" | "RATE_LIMITED";
  code?: string;
  safeActionAvailable?: boolean;
  message: string;
};

export type EmailAuditLog = {
  id: string;
  sellerId: string;
  customerId: string;
  subscriptionId: string;
  platformId: string;
  createdAt: string;
  result: EmailLookupStatus;
};

export type DashboardStat = {
  id: string;
  label: string;
  value: string;
  hint: string;
};

export type ExpiryAlertLevel =
  | "vence_hoy"
  | "vence_manana"
  | "vence_3_dias"
  | "vence_7_dias"
  | "vencido";

export type WholesaleOfferKind = "perfil" | "cuenta_completa";

export type Supplier = {
  id: string;
  name: string;
  contact: string | null;
  status: "active" | "inactive" | string;
  notes: string | null;
};

export type WholesaleCatalogProduct = {
  id: string;
  supplierId: string | null;
  platformId: string | null;
  name: string;
  description: string;
  wholesalePrice: number;
  unitPrice: number;
  bulkQty: number;
  costPrice: number;
  offerKind: WholesaleOfferKind;
  status: "active" | "inactive" | string;
  notes: string | null;
  imagePath: string | null;
  imageUrl: string | null;
  sortOrder: number;
  acquired: number;
  sold: number;
  available: number;
};

export type WholesaleStockEntry = {
  id: string;
  supplierProductId: string;
  supplierId: string | null;
  quantity: number;
  unitCost: number | null;
  receivedAt: string;
  notes: string | null;
};

export type WholesaleSale = {
  id: string;
  supplierProductId: string;
  sellerId: string;
  platformId: string | null;
  offerKind: WholesaleOfferKind;
  quantity: number;
  costPrice: number;
  wholesalePrice: number;
  purchasedAt: string;
  expiresAt: string;
  status: "active" | "cancelled";
  notes: string | null;
};
