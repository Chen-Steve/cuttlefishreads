import { LoadingStatus, Skeleton } from "@/components/skeleton";
import { PageContainer } from "@/components/page-container";

export default function HomeLoading() {
  return (
    <PageContainer className="min-h-[calc(100dvh-4rem)] pt-3 pb-6 sm:py-8 lg:py-10">
      <LoadingStatus label="Loading home">
        <div className="hidden rounded-xl border border-border bg-surface px-4 py-6 sm:block sm:px-8 sm:py-9">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-3 h-8 w-full max-w-md" />
          <Skeleton className="mt-3 h-4 w-full max-w-lg" />
          <div className="mt-5 flex gap-2">
            <Skeleton className="h-9 w-32 rounded-lg" />
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        </div>

        <div className="mt-0 flex gap-3 overflow-hidden sm:mt-8">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton
              key={index}
              className="aspect-[3/4] w-[7.5rem] shrink-0 rounded-lg"
            />
          ))}
        </div>
      </LoadingStatus>
    </PageContainer>
  );
}
