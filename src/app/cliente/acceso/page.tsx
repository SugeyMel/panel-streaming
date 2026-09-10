import { CustomerAccessCenter } from "@/components/access/CustomerAccessCenter";
import { customerScope, loadConnectedEmails, loadPlatforms, loadServices } from "@/lib/data/queries";
import { serviceStatusFromDates } from "@/lib/format";

export default async function CustomerAccessPage() {
  const { customerId } = await customerScope();
  const [services, platforms] = await Promise.all([
    loadServices({ customerId }),
    loadPlatforms(),
  ]);
  const mine = services
    .filter((item) => {
      const status = serviceStatusFromDates(item.endDate, item.status);
      return status === "activo" || status === "proximo_a_vencer";
    })
    .map((item) => ({ ...item, internalCost: 0 }));
  const sellerId = mine[0]?.sellerId ?? "";
  const mailboxes = sellerId ? await loadConnectedEmails(sellerId) : [];
  const enabledMailboxEmails = mailboxes.filter((item) => item.codesEnabled).map((item) => item.email);

  return (
    <CustomerAccessCenter
      services={mine}
      platforms={platforms}
      customerId={customerId ?? ""}
      sellerId={sellerId}
      enabledMailboxEmails={enabledMailboxEmails}
    />
  );
}
