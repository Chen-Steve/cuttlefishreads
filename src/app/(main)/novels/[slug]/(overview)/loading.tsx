import { LoadingStatus, Skeleton } from "@/components/skeleton";
import { PageContainer } from "@/components/page-container";

export default function NovelLoading() {
  return (
    <PageContainer
      as="article"
      width="prose"
      className="min-h-[calc(100dvh-4rem)] pt-4 sm:pt-6 lg:pt-6"
    >
      <LoadingStatus label="Loading novel">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-8">
          <Skeleton className="aspect-[3/4] w-28 shrink-0 rounded-lg sm:w-40" />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <Skeleton className="hidden h-8 w-2/3 sm:block" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-2 h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <div className="mt-2 flex gap-2">
              <Skeleton className="h-9 w-28 rounded-lg" />
              <Skeleton className="h-9 w-28 rounded-lg" />
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-border">
          <div className="h-9 border-b border-border" />
          {Array.from({ length: 8 }, (_, index) => (
            <div
              key={index}
              className="flex flex-col gap-2 border-b border-border px-4 py-3 last:border-b-0"
            >
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      </LoadingStatus>
    </PageContainer>
  );
}
