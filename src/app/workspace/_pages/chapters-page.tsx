import { notFound } from "next/navigation";

import { PageContainer } from "@/components/page-container";
import { getAdminAccess } from "@/lib/access";
import { getWorkspaceChapters } from "@/lib/data/workspace";
import { WORKSPACE_BASE } from "@/lib/workspace";
import { ChapterList } from "../_components/chapter-list";

export async function WorkspaceChaptersPage({
  novelId,
}: {
  novelId: string;
}) {
  const base = WORKSPACE_BASE;

  const access = await getAdminAccess();
  if (!access) notFound();
  const loaded = await getWorkspaceChapters(access, novelId);
  if (!loaded) notFound();
  const { title: novelTitle, chapters: rows, draftCount } = loaded;

  return (
    <PageContainer as="div">
      <ChapterList
        novelId={novelId}
        novelTitle={novelTitle}
        chapters={rows}
        backHref={base}
        addHref={`${base}/novels/${novelId}/chapters/new`}
        bulkHref={`${base}/novels/${novelId}/chapters/bulk`}
        draftCount={draftCount}
      />
    </PageContainer>
  );
}
