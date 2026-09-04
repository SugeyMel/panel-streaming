"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { OrderProgress } from "@/components/orders/OrderProgress";
import { orders } from "@/data/mock";
import { formatCurrency } from "@/lib/format";
import { namedOrder } from "@/lib/selectors";
import { PlatformName } from "@/components/ui/PlatformLogo";

export function OrderLookupForm() {
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [showResult, setShowResult] = useState(false);
  const tracked = namedOrder(orders[2]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowResult(true);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <Card className="p-6">
        <h1 className="text-2xl font-semibold text-white">Consultar pedido</h1>
        <p className="mt-2 text-sm text-slate-400">
          Ingresa tu número de pedido y tu celular para ver el estado actual.
        </p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">Número de pedido</span>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="PS-2026-0003"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">Número de celular</span>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="987654321"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
            />
          </label>
          <Button type="submit" className="w-full">
            Buscar pedido
          </Button>
        </form>
      </Card>

      <Card className="p-6">
        <p className="text-sm font-medium text-cyan-300">Seguimiento de ejemplo</p>
        <h2 className="mt-2 text-xl font-semibold text-white">
          Pedido {tracked.code}
        </h2>
        <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
          <p>
            Cliente:{" "}
            <span className="text-white">{tracked.customerName}</span>
          </p>
          <p>
            Celular: <span className="text-white">{tracked.whatsapp}</span>
          </p>
          <p className="flex items-center gap-2">
            Plataforma:{" "}
            <PlatformName platform={tracked.platformName || tracked.platformId} size="table" className="text-white" />
          </p>
          <p>
            Monto:{" "}
            <span className="text-white">
              {formatCurrency(tracked.amount)}
            </span>
          </p>
        </div>
        <div className="mt-8">
          <OrderProgress currentStep={showResult ? 1 : 1} />
        </div>
        <p className="mt-6 text-xs text-slate-500">
          {showResult
            ? "Resultado de demostración. Más adelante se conectará con la base de datos real."
            : "Puedes consultar con cualquier dato. Por ahora se muestra un pedido ficticio."}
        </p>
      </Card>
    </div>
  );
}
