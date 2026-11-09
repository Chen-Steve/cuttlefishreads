import { notFound } from "next/navigation";

import { PageContainer } from "@/components/page-container";
import { getAdminAccess, ownsNovel } from "@/lib/access";
import { getServerSupabase } from "@/utils/supabase/auth";
import { WORKSPACE_BASE } from "@/lib/workspace";
import { NovelForm } from "../_components/novel-form";

export async function WorkspaceNovelEditPage({
  novelId,
}: {
  novelId: string;
}) {
  const base = WORKSPACE_BASE;

  const access = await getAdminAccess();
  const supabase = await getServerSupabase();
  const { data: novel } = await supabase
    .from("novels")
    .select(
      "id, title, original_author, translator, description, cover_url, genres, tags, status, language, publisher_id, novelupdates_url",
    )
    .eq("id", novelId)
    .eq("publication_type", "translation")
    .maybeSingle();

  if (!novel) notFound();
  if (!access || !ownsNovel(access, novel.publisher_id)) {
    notFound();
  }

  return (
    <PageContainer as="div" width="default">
      <NovelForm novel={novel} backHref={base} />
    </PageContainer>
  );
}
