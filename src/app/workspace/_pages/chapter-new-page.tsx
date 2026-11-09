import { notFound } from "next/navigation";

import { PageContainer } from "@/components/page-container";
import { getAdminAccess } from "@/lib/access";
import { getWorkspaceChapterDraft } from "@/lib/data/workspace";
import { ChapterForm } from "../_components/chapter-form";

export async function WorkspaceChapterNewPage({
  novelId,
}: {
  novelId: string;
}) {
  const access = await getAdminAccess();
  if (!access) notFound();
  const draft = await getWorkspaceChapterDraft(access, novelId);
  if (!draft) notFound();
  const { novel, latestChapterUnlockAt, defaultCoinCost, nextChapterNumber } = draft;

  return (
    <PageContainer as="div">
      <ChapterForm
        novelId={novel.id}
        latestChapterUnlockAt={latestChapterUnlockAt}
        defaultCoinCost={defaultCoinCost}
        nextChapterNumber={nextChapterNumber}
      />
    </PageContainer>
  );
}
