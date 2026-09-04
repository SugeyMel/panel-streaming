"use client";

import { createSupportTicketForm } from "@/app/actions/business";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function SupportForm() {
  return (
    <Card className="space-y-4 p-5">
      <form action={createSupportTicketForm} className="space-y-4">
        <input type="hidden" name="audience" value="seller" />
        <label className="block text-sm">
          Asunto
          <input name="subject" required className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5" />
        </label>
        <label className="block text-sm">
          Mensaje
          <textarea name="message" required className="mt-2 min-h-28 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5" />
        </label>
        <Button type="submit">Enviar</Button>
      </form>
    </Card>
  );
}
