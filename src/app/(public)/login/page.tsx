import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccessScreen } from "@/components/auth/AccessScreen";
import { getAppSession, portalPath } from "@/lib/auth/get-session";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

export default async function LoginPage() {
  const session = await getAppSession();
  if (session.mode === "live" && session.userId) {
    redirect(portalPath(session.role));
  }

  return (
    <Suspense>
      <AccessScreen />
    </Suspense>
  );
}
