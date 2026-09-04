import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicEnv } from "@/lib/supabase/config";

type AppRole = "superadmin" | "seller" | "customer" | "support";

function homeFor(role: AppRole | null) {
  if (role === "superadmin" || role === "support") return "/admin";
  if (role === "seller") return "/panel";
  if (role === "customer") return "/cliente";
  return "/login";
}

export async function updateSession(request: NextRequest) {
  const env = getSupabasePublicEnv();
  if (!env) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const needsAuth =
    path.startsWith("/admin") ||
    path.startsWith("/panel") ||
    path.startsWith("/cliente");

  if (!needsAuth) {
    return response;
  }

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = (profile?.role as AppRole | undefined) ?? null;

  if (path.startsWith("/admin") && role !== "superadmin" && role !== "support") {
    const url = request.nextUrl.clone();
    url.pathname = homeFor(role);
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (path.startsWith("/panel") && role !== "seller" && role !== "superadmin") {
    const url = request.nextUrl.clone();
    url.pathname = homeFor(role);
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (path.startsWith("/cliente") && role !== "customer" && role !== "superadmin") {
    const url = request.nextUrl.clone();
    url.pathname = homeFor(role);
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
