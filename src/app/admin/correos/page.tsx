import { EmailCodesBoard } from "@/components/email/EmailCodesBoard";
import { loadEmailCodesBundle, loadPlatforms, loadSellers } from "@/lib/data/queries";
import { isGoogleOAuthConfigured, isMicrosoftOAuthConfigured, oauthRedirectUri } from "@/lib/email-oauth-config";

export const dynamic = "force-dynamic";

export default async function AdminEmailsPage({
  searchParams,
}: {
  searchParams: Promise<{ oauth?: string }>;
}) {
  const { oauth } = await searchParams;
  const [bundle, platforms, sellers] = await Promise.all([
    loadEmailCodesBundle(),
    loadPlatforms(),
    loadSellers(),
  ]);
  const sellerNameById = Object.fromEntries(sellers.map((seller) => [seller.id, seller.businessName || seller.name]));

  return (
    <EmailCodesBoard
      mode="admin"
      sellerId={null}
      sellers={sellers}
      platforms={platforms}
      emails={bundle.emails}
      filterPolicy={bundle.globalFilter}
      globalFilter={bundle.globalFilter}
      lookups={bundle.lookups}
      missingSql={bundle.missingSql}
      sellerNameById={sellerNameById}
      oauthConfigured={{ google: isGoogleOAuthConfigured(), microsoft: isMicrosoftOAuthConfigured() }}
      oauthRedirects={{ google: oauthRedirectUri("google"), microsoft: oauthRedirectUri("microsoft") }}
      oauthResult={oauth}
    />
  );
}
