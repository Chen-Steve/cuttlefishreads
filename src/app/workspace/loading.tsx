import { PageContainer } from "@/components/page-container";
import { LoadingStatus, Skeleton } from "@/components/skeleton";

export default function WorkspaceLoading() {
  return (
    <PageContainer as="div">
      <LoadingStatus label="Loading workspace">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-3 h-4 w-72 max-w-full" />
        <div className="mt-6 flex flex-col gap-3">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-24 rounded-2xl" />
          ))}
        </div>
      </LoadingStatus>
    </PageContainer>
  );
}
