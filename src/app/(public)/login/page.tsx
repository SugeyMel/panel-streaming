import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

export default function LoginPage() {
  return (
    <main className="mx-auto flex max-w-6xl items-center justify-center px-4 py-16 sm:px-6">
      <Card className="w-full max-w-md p-7">
        <p className="text-sm font-medium text-cyan-300">Acceso al panel</p>
        <h1 className="mt-2 text-2xl font-semibold text-white">Iniciar sesión</h1>
        <p className="mt-2 mb-6 text-sm text-slate-400">
          Cliente: celular y clave. Vendedor o admin: correo y clave.
        </p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </Card>
    </main>
  );
}
