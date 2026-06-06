import type { Novel } from "@/types";
import { NovelCard } from "./novel-card";

export function NovelGrid({
  novels,
  compact = false,
}: {
  novels: Novel[];
  compact?: boolean;
}) {
  if (novels.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-surface px-4 py-12 text-center text-sm text-muted">
        No novels found.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-6 lg:grid-cols-4 xl:grid-cols-5">
      {novels.map((novel) => (
        <NovelCard key={novel.id} novel={novel} compact={compact} />
      ))}
    </div>
  );
}
