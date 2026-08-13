import { notFound } from "next/navigation";

import { PageContainer } from "@/components/page-container";
import { createAdminClient } from "@/utils/supabase/admin";
import { getAdminAccess } from "@/lib/access";
import { WORKSPACE_BASE, type WorkspaceKind } from "@/lib/workspace";
import { NovelForm } from "../_components/novel-form";

export async function WorkspaceNovelEditPage({
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
    .select(
      "id, title, original_author, translator, description, cover_url, genres, tags, status, language, publisher_id, novelupdates_url",
    )
    .eq("id", novelId)
    .eq("publication_type", "translation")
    .maybeSingle();

  if (!novel) notFound();
  if (!access || (!access.isMasterAdmin && novel.publisher_id !== access.userId)) {
    notFound();
  }

  return (
    <PageContainer as="div" width="default">
      <NovelForm novel={novel} backHref={base} />
    </PageContainer>
  );
}
