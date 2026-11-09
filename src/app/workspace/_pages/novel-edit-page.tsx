import { notFound } from "next/navigation";

import { PageContainer } from "@/components/page-container";
import { getAdminAccess } from "@/lib/access";
import { getWorkspaceNovelForEdit } from "@/lib/data/workspace";
import { WORKSPACE_BASE } from "@/lib/workspace";
import { NovelForm } from "../_components/novel-form";

export async function WorkspaceNovelEditPage({
  novelId,
}: {
  novelId: string;
}) {
  const base = WORKSPACE_BASE;

  const access = await getAdminAccess();
  if (!access) notFound();
  const novel = await getWorkspaceNovelForEdit(access, novelId);
  if (!novel) notFound();

  return (
    <PageContainer as="div" width="default">
      <NovelForm novel={novel} backHref={base} />
    </PageContainer>
  );
}
