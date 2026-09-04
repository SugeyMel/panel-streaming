import { PlatformsManager } from "@/components/admin/PlatformsManager";
import { loadPlatforms } from "@/lib/data/queries";

export default async function AdminPlatformsPage() {
  const platforms = await loadPlatforms();
  return <PlatformsManager platforms={platforms} />;
}
