import { CustomerAccessCenter } from "@/components/access/CustomerAccessCenter";
import { lockedServiceIds } from "@/lib/code-request-lock";
import { customerScope, loadConnectedEmails, loadPlatforms, loadSellerById, loadServices } from "@/lib/data/queries";
import { serviceStatusFromDates } from "@/lib/format";
import { loadAdminWhatsapp, sellerClientCodesEnabled } from "@/lib/seller-permissions";

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
  if (sellerId && !(await sellerClientCodesEnabled(sellerId))) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-[#253047] bg-[#0B111C] p-6 text-center">
        <h1 className="text-lg font-bold text-white">Gestor de códigos no disponible</h1>
        <p className="mt-2 text-sm text-[#94A3B8]">Consulta con tu vendedor para activarlo.</p>
      </div>
    );
  }
  const [mailboxes, seller, adminWhatsapp] = await Promise.all([
    sellerId ? loadConnectedEmails(sellerId) : Promise.resolve([]),
    sellerId ? loadSellerById(sellerId) : Promise.resolve(null),
    loadAdminWhatsapp().catch(() => ""),
  ]);
  const enabledMailboxEmails = mailboxes.filter((item) => item.codesEnabled).map((item) => item.email);
  const lockedIds = customerId ? await lockedServiceIds(customerId, mine.map((item) => item.id)) : [];

  return (
    <CustomerAccessCenter
      services={mine}
      platforms={platforms}
      customerId={customerId ?? ""}
      sellerId={sellerId}
      enabledMailboxEmails={enabledMailboxEmails}
      providerWhatsapp={seller?.whatsapp || adminWhatsapp}
      lockedServiceIds={lockedIds}
    />
  );
}
