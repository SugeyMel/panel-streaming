import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AccessScreen } from "@/components/auth/AccessScreen";
import { getAppSession, portalPath } from "@/lib/auth/get-session";

export default async function HomePage() {
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
