import { CodeRulesBoard } from "@/components/admin/CodeRulesBoard";
import { EmailCodesBoard } from "@/components/email/EmailCodesBoard";
import { loadCodeSettings, platformRuleFor } from "@/lib/code-settings";
import { loadEmailCodesBundle, loadPlatforms, loadSellers } from "@/lib/data/queries";
import { isGoogleOAuthConfigured, isMicrosoftOAuthConfigured, oauthRedirectUri } from "@/lib/email-oauth-config";

export const dynamic = "force-dynamic";

export default async function AdminEmailsPage({
  searchParams,
}: {
  searchParams: Promise<{ oauth?: string }>;
}) {
  const { oauth } = await searchParams;
  const [bundle, platforms, sellers, codeSettings] = await Promise.all([
    loadEmailCodesBundle(),
    loadPlatforms(),
    loadSellers(),
    loadCodeSettings(),
  ]);
  const sellerNameById = Object.fromEntries(sellers.map((seller) => [seller.id, seller.businessName || seller.name]));

  return (
    <>
      <CodeRulesBoard
        platforms={platforms.map((item) => ({ id: item.id, name: item.name, slug: item.slug ?? "" }))}
        rules={Object.fromEntries(
          platforms.map((item) => [item.id, platformRuleFor(codeSettings, item, bundle.globalFilter)]),
        )}
        savedIds={Object.keys(codeSettings.rules)}
        globalWords={bundle.globalFilter.extraBlockKeywords}
      />
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
    </>
  );
}
