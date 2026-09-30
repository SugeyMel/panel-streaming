import { CodeHistoryBoard } from "@/components/admin/CodeHistoryBoard";
import { loadCodeHistory } from "@/lib/code-history";
import { loadPlatforms } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function AdminHistoryPage() {
  const [rows, platforms] = await Promise.all([
    loadCodeHistory().catch(() => []),
    loadPlatforms().catch(() => []),
  ]);
  return (
    <CodeHistoryBoard
      rows={rows}
      platforms={platforms.map((item) => ({ id: item.id, name: item.name }))}
    />
  );
}
