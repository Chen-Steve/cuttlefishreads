import { notFound } from "next/navigation";

import { PageContainer } from "@/components/page-container";
import { createAdminClient } from "@/utils/supabase/admin";
import { getAdminAccess } from "@/lib/access";
import {
  WORKSPACE_PUBLICATION_TYPE,
  type WorkspaceKind,
} from "@/lib/workspace";
import { ChapterForm } from "../_components/chapter-form";

type ChapterRow = {
  id: string;
  number: number;
  title: string;
  content: string;
  translator_note: string | null;
  use_global_translator_note: boolean;
  is_free: boolean;
  coin_cost: number;
  unlock_at: string | null;
};

export async function WorkspaceChapterEditPage({
  workspace,
  novelId,
  chapterId,
}: {
  workspace: WorkspaceKind;
  novelId: string;
  chapterId: string;
}) {
  const access = await getAdminAccess();
  const admin = createAdminClient();

  const [{ data: novel }, { data: chapter }, { data: latestUnlockRow }] =
    await Promise.all([
      admin
        .from("novels")
        .select("id, title, publisher_id, publication_type")
        .eq("id", novelId)
        .maybeSingle(),
      admin
        .from("chapters")
        .select(
          "id, number, title, content, translator_note, use_global_translator_note, is_free, coin_cost, unlock_at",
        )
        .eq("id", chapterId)
        .eq("novel_id", novelId)
        .maybeSingle(),
      admin
        .from("chapters")
        .select("unlock_at")
        .eq("novel_id", novelId)
        .neq("id", chapterId)
        .not("unlock_at", "is", null)
        .order("unlock_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (!novel || !chapter) notFound();
  if (!access || (!access.isMasterAdmin && novel.publisher_id !== access.userId)) {
    notFound();
  }
  if (novel.publication_type !== WORKSPACE_PUBLICATION_TYPE[workspace]) {
    notFound();
  }

  const row = chapter as ChapterRow;

  return (
    <PageContainer as="div">
      <ChapterForm
        novelId={novel.id}
        latestChapterUnlockAt={latestUnlockRow?.unlock_at ?? null}
        isOriginal={novel.publication_type === "original"}
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
        }}
      />
    </PageContainer>
  );
}
