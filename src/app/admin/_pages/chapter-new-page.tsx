import { notFound } from "next/navigation";

import { PageContainer } from "@/components/page-container";
import { createAdminClient } from "@/utils/supabase/admin";
import { getAdminAccess } from "@/lib/access";
import {
  WORKSPACE_PUBLICATION_TYPE,
  type WorkspaceKind,
} from "@/lib/workspace";
import { ChapterForm } from "../_components/chapter-form";

export async function WorkspaceChapterNewPage({
  workspace,
  novelId,
}: {
  workspace: WorkspaceKind;
  novelId: string;
}) {
  const access = await getAdminAccess();
  const admin = createAdminClient();
  const { data: novel } = await admin
    .from("novels")
    .select("id, title, publisher_id, publication_type")
    .eq("id", novelId)
    .maybeSingle();

  if (!novel) notFound();
  if (!access || (!access.isMasterAdmin && novel.publisher_id !== access.userId)) {
    notFound();
  }
  if (novel.publication_type !== WORKSPACE_PUBLICATION_TYPE[workspace]) {
    notFound();
  }

  const [{ data: latestUnlockRow }, { data: latestPaidRow }, { data: lastNumberRow }] =
    await Promise.all([
      admin
        .from("chapters")
        .select("unlock_at")
        .eq("novel_id", novelId)
        .not("unlock_at", "is", null)
        .order("unlock_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from("chapters")
        .select("coin_cost")
        .eq("novel_id", novelId)
        .eq("is_free", false)
        .order("number", { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
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
        isOriginal={novel.publication_type === "original"}
      />
    </PageContainer>
  );
}
