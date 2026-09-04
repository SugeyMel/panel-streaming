export type AppRole = "superadmin" | "seller" | "customer" | "support";

export type AppSession = {
  mode: "demo" | "live";
  userId: string | null;
  role: AppRole;
  sellerId: string | null;
  customerId: string | null;
  name: string;
  email: string;
};

export const DEMO_SELLER_ID = "sel_juan";
export const DEMO_CUSTOMER_ID = "cus_carlos";
export const DEMO_ADMIN_ID = "usr_admin";
export const mockNow = new Date("2026-09-07T12:00:00.000Z");

/** Compatibilidad temporal con páginas que aún importan estos identificadores. */
export const CURRENT_SELLER_ID = DEMO_SELLER_ID;
export const CURRENT_CUSTOMER_ID = DEMO_CUSTOMER_ID;
export const CURRENT_ADMIN_ID = DEMO_ADMIN_ID;
