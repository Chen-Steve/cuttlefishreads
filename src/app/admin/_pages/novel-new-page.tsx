import { PageContainer } from "@/components/page-container";
import { WORKSPACE_BASE, type WorkspaceKind } from "@/lib/workspace";
import { NovelForm } from "../_components/novel-form";

export function WorkspaceNovelNewPage({
  workspace,
}: {
  workspace: WorkspaceKind;
}) {
  const base = WORKSPACE_BASE[workspace];

  return (
    <PageContainer as="div" width="default">
      <NovelForm backHref={base} />
    </PageContainer>
  );
}
