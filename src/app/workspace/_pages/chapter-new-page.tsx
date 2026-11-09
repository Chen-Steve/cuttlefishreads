import { notFound } from "next/navigation";

import { PageContainer } from "@/components/page-container";
import { getAdminAccess, ownsNovel } from "@/lib/access";
import { getServerSupabase } from "@/utils/supabase/auth";
import { ChapterForm } from "../_components/chapter-form";

export async function WorkspaceChapterNewPage({
  novelId,
}: {
  novelId: string;
}) {
  const access = await getAdminAccess();
  const supabase = await getServerSupabase();
  const { data: novel } = await supabase
    .from("novels")
    .select("id, title, publisher_id")
    .eq("id", novelId)
    .eq("publication_type", "translation")
    .maybeSingle();

  if (!novel) notFound();
  if (!access || !ownsNovel(access, novel.publisher_id)) {
    notFound();
  }

  const [{ data: latestUnlockRow }, { data: latestPaidRow }, { data: lastNumberRow }] =
    await Promise.all([
      supabase
        .from("chapters")
        .select("unlock_at")
        .eq("novel_id", novelId)
        .not("unlock_at", "is", null)
        .order("unlock_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("chapters")
        .select("coin_cost")
        .eq("novel_id", novelId)
        .eq("is_free", false)
        .order("number", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("chapters")
        .select("number")
        .eq("novel_id", novelId)
        .order("number", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  return (
    <PageContainer as="div">
      <ChapterForm
        novelId={novel.id}
        latestChapterUnlockAt={latestUnlockRow?.unlock_at ?? null}
        defaultCoinCost={latestPaidRow?.coin_cost ?? null}
        nextChapterNumber={(lastNumberRow?.number ?? 0) + 1}
      />
    </PageContainer>
  );
}
