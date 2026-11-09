import { notFound } from "next/navigation";

import { PageContainer } from "@/components/page-container";
import { getAdminAccess, ownsNovel } from "@/lib/access";
import { getServerSupabase } from "@/utils/supabase/auth";
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
  is_published: boolean;
};

export async function WorkspaceChapterEditPage({
  novelId,
  chapterId,
}: {
  novelId: string;
  chapterId: string;
}) {
  const access = await getAdminAccess();
  const supabase = await getServerSupabase();

  const [{ data: novel }, { data: chapter }, { data: latestUnlockRow }, { data: siblings }] =
    await Promise.all([
      supabase
        .from("novels")
        .select("id, publisher_id")
        .eq("id", novelId)
        .eq("publication_type", "translation")
        .maybeSingle(),
      supabase
        .from("chapters")
        .select(
          "id, number, title, content, translator_note, use_global_translator_note, is_free, coin_cost, unlock_at, is_published",
        )
        .eq("id", chapterId)
        .eq("novel_id", novelId)
        .maybeSingle(),
      supabase
        .from("chapters")
        .select("unlock_at")
        .eq("novel_id", novelId)
        .neq("id", chapterId)
        .not("unlock_at", "is", null)
        .order("unlock_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("chapters")
        .select("id, number")
        .eq("novel_id", novelId)
        .order("number", { ascending: true }),
    ]);

  if (!novel || !chapter) notFound();
  if (!access || !ownsNovel(access, novel.publisher_id)) {
    notFound();
  }

  const row = chapter as ChapterRow;
  const ordered = siblings ?? [];
  const currentIndex = ordered.findIndex((sibling) => sibling.id === chapterId);
  const previousChapter =
    currentIndex > 0 ? ordered[currentIndex - 1] : null;
  const nextChapter =
    currentIndex >= 0 && currentIndex < ordered.length - 1
      ? ordered[currentIndex + 1]
      : null;

  return (
    <PageContainer as="div">
      <ChapterForm
        key={row.id}
        novelId={novel.id}
        latestChapterUnlockAt={latestUnlockRow?.unlock_at ?? null}
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
