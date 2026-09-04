import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  DEMO_CUSTOMER_ID,
  DEMO_SELLER_ID,
  type AppRole,
  type AppSession,
} from "@/lib/session";

export async function getAppSession(): Promise<AppSession> {
  if (!isSupabaseConfigured()) {
    return {
      mode: "demo",
      userId: "usr_juan",
      role: "seller",
      sellerId: DEMO_SELLER_ID,
      customerId: DEMO_CUSTOMER_ID,
      name: "Juan",
      email: "juan@panelstreaming.com",
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    return demoFallback();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      mode: "live",
      userId: null,
      role: "customer",
      sellerId: null,
      customerId: null,
      name: "",
      email: "",
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const role = (profile?.role as AppRole | undefined) ?? "customer";

  const [{ data: seller }, { data: customer }] = await Promise.all([
    supabase.from("sellers").select("id, name").eq("profile_id", user.id).maybeSingle(),
    supabase.from("customers").select("id, name").eq("profile_id", user.id).maybeSingle(),
  ]);

  return {
    mode: "live",
    userId: user.id,
    role,
    sellerId: seller?.id ?? null,
    customerId: customer?.id ?? null,
    name: profile?.full_name || seller?.name || customer?.name || user.email || "",
    email: profile?.email || user.email || "",
  };
}

function demoFallback(): AppSession {
  return {
    mode: "demo",
    userId: "usr_juan",
    role: "seller",
    sellerId: DEMO_SELLER_ID,
    customerId: DEMO_CUSTOMER_ID,
    name: "Juan",
    email: "juan@panelstreaming.com",
  };
}

export function portalPath(role: AppRole) {
  if (role === "superadmin" || role === "support") return "/admin";
  if (role === "seller") return "/panel";
  return "/cliente";
}

export function requireRole(session: AppSession, roles: AppRole[]) {
  if (session.mode === "demo") return;
  if (!session.userId) {
    throw new Error("No autorizado");
  }
  if (session.role === "superadmin") return;
  if (!roles.includes(session.role)) {
    throw new Error("No autorizado");
  }
}
