"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmailConnectionCard } from "@/components/email/EmailConnectionCard";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { platforms } from "@/data/mock";
import { CURRENT_SELLER_ID } from "@/lib/session";
import { sellerEmails } from "@/lib/selectors";

export default function SellerEmailsPage() {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Correos conectados"
        description="OAuth posterior. Nunca se solicitan contraseñas de correo."
        action={<Button onClick={() => setOpen(true)}>+ Conectar correo</Button>}
      />
      <Card className="border-amber-400/20 bg-amber-400/8 p-5 text-sm text-amber-100">
        Por seguridad recomendamos conectar una cuenta de correo utilizada exclusivamente
        para tus servicios de streaming y no tu correo personal.
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        {sellerEmails(CURRENT_SELLER_ID).map((account) => (
          <EmailConnectionCard key={account.id} account={account} platforms={platforms} />
        ))}
      </div>
      <Modal open={open} title="Conectar correo" onClose={() => setOpen(false)}>
        <div className="space-y-3">
          <Button className="w-full">Conectar con Google</Button>
          <Button variant="secondary" className="w-full">
            Conectar con Microsoft
          </Button>
          <p className="text-xs text-slate-500">
            No existe opción de contraseña de aplicación. La conexión real será OAuth.
          </p>
        </div>
      </Modal>
    </div>
  );
}
