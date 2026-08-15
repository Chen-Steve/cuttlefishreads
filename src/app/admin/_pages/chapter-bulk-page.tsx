import { notFound } from "next/navigation";

import { PageContainer } from "@/components/page-container";
import { createAdminClient } from "@/utils/supabase/admin";
import { getAdminAccess } from "@/lib/access";
import {
  WORKSPACE_BASE,
  type WorkspaceKind,
} from "@/lib/workspace";
import { BulkChapterUpload } from "../_components/bulk-chapter-upload";

export async function WorkspaceChapterBulkPage({
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
    .select("id, publisher_id")
    .eq("id", novelId)
    .eq("publication_type", "translation")
    .maybeSingle();

  if (!novel) notFound();
  if (!access || (!access.isMasterAdmin && novel.publisher_id !== access.userId)) {
    notFound();
  }

  const [
    { data: latestUnlockRow },
    { data: latestPaidRow },
    { data: numberRows },
  ] = await Promise.all([
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
    admin.from("chapters").select("number").eq("novel_id", novelId),
  ]);

  const existingNumbers = (numberRows ?? []).map((row) => row.number as number);
  const nextChapterNumber =
    existingNumbers.reduce((max, number) => Math.max(max, number), 0) + 1;

  return (
    <PageContainer as="div">
      <BulkChapterUpload
        novelId={novel.id}
        backHref={`${base}/novels/${novelId}/chapters`}
        nextChapterNumber={nextChapterNumber}
        existingNumbers={existingNumbers}
        latestChapterUnlockAt={latestUnlockRow?.unlock_at ?? null}
        defaultCoinCost={latestPaidRow?.coin_cost ?? null}
      />
    </PageContainer>
  );
}
