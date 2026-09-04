import { notFound, redirect } from "next/navigation";
import { DeclineRenewalFlow } from "@/components/services/DeclineRenewalFlow";
import { customerScope, loadServices } from "@/lib/data/queries";

export default async function DeclineRenewalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { customerId } = await customerScope();
  if (!customerId) redirect("/login");
  const services = await loadServices({ customerId });
  const service = services.find((item) => item.id === id);
  if (!service) notFound();
  return <DeclineRenewalFlow serviceId={service.id} endDate={service.endDate} />;
}
