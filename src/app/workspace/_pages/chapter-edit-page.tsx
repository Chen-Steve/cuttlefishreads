import { notFound } from "next/navigation";

import { PageContainer } from "@/components/page-container";
import { getAdminAccess } from "@/lib/access";
import { getWorkspaceChapterForEdit } from "@/lib/data/workspace";
import { ChapterForm } from "../_components/chapter-form";

export async function WorkspaceChapterEditPage({
  novelId,
  chapterId,
}: {
  novelId: string;
  chapterId: string;
}) {
  const access = await getAdminAccess();
  if (!access) notFound();
  const loaded = await getWorkspaceChapterForEdit(access, novelId, chapterId);
  if (!loaded) notFound();
  const { latestChapterUnlockAt, previousChapter, nextChapter, chapter: row } = loaded;

  return (
    <PageContainer as="div">
      <ChapterForm
        key={row.id}
        novelId={loaded.novelId}
        latestChapterUnlockAt={latestChapterUnlockAt}
        previousChapter={previousChapter}
        nextChapter={nextChapter}
        initial={{
          chapterId: row.id,
          number: row.number,
          title: row.title,
          content: row.content,
          translatorNote: row.translator_note,
          useGlobalTranslatorNote: row.use_global_translator_note,
          isFree: row.is_free,
          coinCost: row.coin_cost,
          unlockAt: row.unlock_at,
          isPublished: row.is_published,
        }}
      />
    </PageContainer>
  );
}
