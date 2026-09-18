import { notFound } from "next/navigation";

import { PageContainer } from "@/components/page-container";
import { createAdminClient } from "@/utils/supabase/admin";
import { getAdminAccess } from "@/lib/access";
import {
  WORKSPACE_BASE,
  type WorkspaceKind,
} from "@/lib/workspace";
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
  workspace,
  novelId,
}: {
  workspace: WorkspaceKind;
  novelId: string;
}) {
  const base = WORKSPACE_BASE[workspace];

  const access = await getAdminAccess();
  const admin = createAdminClient();
  const { data: novel } = await admin
    .from("novels")
    .select("id, title, publisher_id")
    .eq("id", novelId)
    .eq("publication_type", "translation")
    .maybeSingle();

  if (!novel) notFound();
  if (!access || (!access.isMasterAdmin && novel.publisher_id !== access.userId)) {
    notFound();
  }

  const { data: chapters } = await admin
    .from("chapters")
    .select(
      "id, number, title, word_count, is_free, coin_cost, is_published, unlock_at",
    )
    .eq("novel_id", novelId)
    .order("number", { ascending: true })
    .returns<ChapterRow[]>();

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
