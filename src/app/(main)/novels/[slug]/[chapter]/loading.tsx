import { LoadingStatus, Skeleton } from "@/components/skeleton";
import { PageContainer } from "@/components/page-container";

const lineWidths = ["w-full", "w-full", "w-11/12", "w-full", "w-4/5", "w-full", "w-full", "w-3/4"];

export default function ChapterLoading() {
  return (
    <PageContainer
      as="article"
      width="narrow"
      className="min-h-[calc(100dvh-4rem)] pt-4 sm:pt-6 lg:pt-6"
    >
      <span data-hide-main-footer hidden />
      <LoadingStatus label="Loading chapter">
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-6 w-56 max-w-full" />
        </div>
        <Skeleton className="mx-auto mt-4 h-10 w-full max-w-xs rounded-xl" />
        <div className="mt-8 flex flex-col gap-3">
          {lineWidths.map((width, index) => (
            <Skeleton key={index} className={`h-4 ${width}`} />
          ))}
        </div>
      </LoadingStatus>
    </PageContainer>
  );
}
