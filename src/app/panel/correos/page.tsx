import { EmailCodesBoard } from "@/components/email/EmailCodesBoard";
import { SellerAccessPromo } from "@/components/panel/SellerAccessPromo";
import { SellerCustomersBoard } from "@/components/panel/SellerCustomersBoard";
import { loadAdminWhatsapp, sellerCanCreateCustomers } from "@/lib/seller-permissions";
import { loadCustomers, loadEmailCodesBundle, loadPlatforms, panelScope, loadStreamingAccounts } from "@/lib/data/queries";
import { isGoogleOAuthConfigured, isMicrosoftOAuthConfigured, oauthRedirectUri } from "@/lib/email-oauth-config";

export const dynamic = "force-dynamic";

export default async function SellerEmailsPage({
  searchParams,
}: {
  searchParams: Promise<{ oauth?: string }>;
}) {
  const { sellerId } = await panelScope();
  const { oauth } = await searchParams;
  const [bundle, platforms, accounts, adminWhatsapp, customers, canCreate] = await Promise.all([
    loadEmailCodesBundle(sellerId),
    loadPlatforms(),
    loadStreamingAccounts(sellerId),
    loadAdminWhatsapp(),
    loadCustomers(sellerId),
    sellerCanCreateCustomers(sellerId),
  ]);

  return (
    <div className="space-y-4">
    {/* Si aún no tiene activado crear clientes, se muestran los planes para contratarlo por WhatsApp. */}
    {canCreate ? null : <SellerAccessPromo platforms={platforms} adminWhatsapp={adminWhatsapp} />}
    <SellerCustomersBoard customers={customers} canCreate={canCreate} adminWhatsapp={adminWhatsapp} />
    <EmailCodesBoard
      mode="seller"
      sellerId={sellerId}
      platforms={platforms}
      emails={bundle.emails}
      inventoryEmails={accounts.map((item) => ({ email: item.email, platformId: item.platformId }))}
      filterPolicy={bundle.sellerFilter}
      globalFilter={bundle.globalFilter}
      lookups={bundle.lookups}
      missingSql={bundle.missingSql}
      oauthConfigured={{ google: isGoogleOAuthConfigured(), microsoft: isMicrosoftOAuthConfigured() }}
      oauthRedirects={{ google: oauthRedirectUri("google"), microsoft: oauthRedirectUri("microsoft") }}
      oauthResult={oauth}
    />
    </div>
  );
}
