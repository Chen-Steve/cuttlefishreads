import { notFound } from "next/navigation";

import { PageContainer } from "@/components/page-container";
import { getAdminAccess } from "@/lib/access";
import { getWorkspaceChapterDraft } from "@/lib/data/workspace";
import { WORKSPACE_BASE } from "@/lib/workspace";
import { BulkChapterUpload } from "../_components/bulk-chapter-upload";

export async function WorkspaceChapterBulkPage({
  novelId,
}: {
  novelId: string;
}) {
  const base = WORKSPACE_BASE;
  const access = await getAdminAccess();
  if (!access) notFound();
  const draft = await getWorkspaceChapterDraft(access, novelId);
  if (!draft) notFound();
  const {
    novel,
    existingNumbers,
    nextChapterNumber,
    latestChapterUnlockAt,
    defaultCoinCost,
  } = draft;

  return (
    <PageContainer as="div">
      <BulkChapterUpload
        novelId={novel.id}
        backHref={`${base}/novels/${novelId}/chapters`}
        nextChapterNumber={nextChapterNumber}
        existingNumbers={existingNumbers}
        latestChapterUnlockAt={latestChapterUnlockAt}
        defaultCoinCost={defaultCoinCost}
      />
    </PageContainer>
  );
}
