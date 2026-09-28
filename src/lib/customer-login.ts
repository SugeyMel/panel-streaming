import { randomBytes } from "node:crypto";
import type { createServiceClient } from "@/lib/supabase/server";

type AdminClient = NonNullable<ReturnType<typeof createServiceClient>>;

/**
 * Crea (o reutiliza) el usuario de acceso del cliente: entra con su CORREO, sin clave.
 * Si el cliente ya tenía acceso (por ejemplo, el antiguo acceso por celular), se le cambia al correo nuevo.
 */
export async function ensureCustomerLogin(
  admin: AdminClient,
  email: string,
  whatsapp: string,
  name: string,
  currentProfileId: string | null,
): Promise<{ id: string } | { error: string }> {
  const { data: owner } = await admin.from("profiles").select("id, role").eq("email", email).maybeSingle();
  if (owner?.id) {
    if (owner.role !== "customer") return { error: "Ese correo ya pertenece a un vendedor o administrador." };
    return { id: String(owner.id) };
  }

  // Tenía un acceso anterior solo de cliente: se cambia su correo de entrada.
  if (currentProfileId) {
    const { data: current } = await admin.from("profiles").select("role").eq("id", currentProfileId).maybeSingle();
    if (current?.role === "customer") {
      const { error } = await admin.auth.admin.updateUserById(currentProfileId, { email, email_confirm: true });
      if (error) return { error: error.message };
      await admin.from("profiles").update({ email, full_name: name, whatsapp }).eq("id", currentProfileId);
      return { id: currentProfileId };
    }
  }

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    // Clave aleatoria que nadie usa: el cliente entra solo con su correo.
    password: randomBytes(18).toString("base64url"),
    email_confirm: true,
    user_metadata: { full_name: name, role: "customer", phone: whatsapp },
  });
  if (error || !created.user) return { error: error?.message ?? "No se pudo crear el acceso del cliente." };
  await admin
    .from("profiles")
    .update({ role: "customer", full_name: name, email, whatsapp })
    .eq("id", created.user.id);
  return { id: created.user.id };
}
