import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminJsClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getServiceRoleKey, getSupabasePublicEnv } from "@/lib/supabase/config";

export async function createClient() {
  const env = getSupabasePublicEnv();
  if (!env) return null;
  const cookieStore = await cookies();

  return createServerClient(env.url, env.anonKey, {
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          /* set from Server Component */
        }
      },
    },
  });
}

/** Solo servidor. Nunca importar este helper en componentes cliente. */
export function createServiceClient() {
  const env = getSupabasePublicEnv();
  const serviceKey = getServiceRoleKey();
  if (!env || !serviceKey) return null;
  return createAdminJsClient(env.url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
