import { EmailCodesBoard } from "@/components/email/EmailCodesBoard";
import { SellerAccessPromo } from "@/components/panel/SellerAccessPromo";
import { loadAdminWhatsapp } from "@/lib/seller-permissions";
import { loadEmailCodesBundle, loadPlatforms, panelScope, loadStreamingAccounts } from "@/lib/data/queries";
import { isGoogleOAuthConfigured, isMicrosoftOAuthConfigured, oauthRedirectUri } from "@/lib/email-oauth-config";

export const dynamic = "force-dynamic";

export default async function SellerEmailsPage({
  searchParams,
}: {
  searchParams: Promise<{ oauth?: string }>;
}) {
  const { sellerId } = await panelScope();
  const { oauth } = await searchParams;
  const [bundle, platforms, accounts, adminWhatsapp] = await Promise.all([
    loadEmailCodesBundle(sellerId),
    loadPlatforms(),
    loadStreamingAccounts(sellerId),
    loadAdminWhatsapp(),
  ]);

  return (
    <div className="space-y-4">
    {/* Crear acceso a clientes: planes por WhatsApp (el registro real de clientes llega en la siguiente fase). */}
    <SellerAccessPromo platforms={platforms} adminWhatsapp={adminWhatsapp} />
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
