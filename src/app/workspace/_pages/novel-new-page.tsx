import { PageContainer } from "@/components/page-container";
import { WORKSPACE_BASE } from "@/lib/workspace";
import { NovelForm } from "../_components/novel-form";

export function WorkspaceNovelNewPage() {
  const base = WORKSPACE_BASE;

  return (
    <PageContainer as="div" width="default">
      <NovelForm backHref={base} />
    </PageContainer>
  );
}
