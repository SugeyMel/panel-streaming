import { Hero } from "@/components/store/Hero";
import { HowItWorks } from "@/components/store/HowItWorks";
import { PlatformCatalog } from "@/components/store/PlatformCatalog";
import { loadPlatforms } from "@/lib/data/queries";

export default async function HomePage() {
  const platforms = await loadPlatforms();
  return (
    <main>
      <Hero />
      <PlatformCatalog platforms={platforms} />
      <HowItWorks />
    </main>
  );
}
