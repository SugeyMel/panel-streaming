import { EmailCodesBoard } from "@/components/email/EmailCodesBoard";
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
  const [bundle, platforms, accounts] = await Promise.all([
    loadEmailCodesBundle(sellerId),
    loadPlatforms(),
    loadStreamingAccounts(sellerId),
  ]);

  return (
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
  );
}
