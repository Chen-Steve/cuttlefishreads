import { notFound } from "next/navigation";

import { PageContainer } from "@/components/page-container";
import { getAdminAccess, ownsNovel } from "@/lib/access";
import { getServerSupabase } from "@/utils/supabase/auth";
import { WORKSPACE_BASE } from "@/lib/workspace";
import { ChapterList } from "../_components/chapter-list";

type ChapterRow = {
  id: string;
  number: number;
  title: string;
  word_count: number | null;
  is_free: boolean;
  coin_cost: number;
  is_published: boolean;
  unlock_at: string | null;
};

export async function WorkspaceChaptersPage({
  novelId,
}: {
  novelId: string;
}) {
  const base = WORKSPACE_BASE;

  const access = await getAdminAccess();
  const supabase = await getServerSupabase();
  const [{ data: novel }, { data: chapters }] = await Promise.all([
    supabase
      .from("novels")
      .select("id, title, publisher_id")
      .eq("id", novelId)
      .eq("publication_type", "translation")
      .maybeSingle(),
    supabase
      .from("chapters")
      .select(
        "id, number, title, word_count, is_free, coin_cost, is_published, unlock_at",
      )
      .eq("novel_id", novelId)
      .order("number", { ascending: true })
      .returns<ChapterRow[]>(),
  ]);

  if (!novel) notFound();
  if (!access || !ownsNovel(access, novel.publisher_id)) {
    notFound();
  }

  const rows = (chapters ?? []).map((chapter) => ({
    ...chapter,
    word_count: Number(chapter.word_count ?? 0),
  }));
  const draftCount = rows.filter((c) => !c.is_published).length;

  return (
    <PageContainer as="div">
      <ChapterList
        novelId={novelId}
        novelTitle={novel.title}
        chapters={rows}
        backHref={base}
        addHref={`${base}/novels/${novelId}/chapters/new`}
        bulkHref={`${base}/novels/${novelId}/chapters/bulk`}
        draftCount={draftCount}
      />
    </PageContainer>
  );
}
