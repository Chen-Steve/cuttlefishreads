import { LoadingStatus, Skeleton } from "@/components/skeleton";
import { PageContainer } from "@/components/page-container";

export default function HomeLoading() {
  return (
    <PageContainer className="min-h-[calc(100dvh-4rem)] pt-2 pb-6 sm:pt-3 sm:pb-8 lg:pb-10">
      <LoadingStatus label="Loading home">
        <div className="mt-3 flex gap-3 overflow-hidden sm:mt-4">
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
