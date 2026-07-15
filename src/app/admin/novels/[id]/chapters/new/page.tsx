import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/page-container";
import { createAdminClient } from "@/utils/supabase/admin";
import { getAdminAccess } from "@/lib/access";
import { ChapterForm } from "../../../../_components/chapter-form";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AddChapterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const access = await getAdminAccess();
  const admin = createAdminClient();
  const { data: novel } = await admin
    .from("novels")
    .select("id, title, publisher_id")
    .eq("id", id)
    .maybeSingle();

  if (!novel) notFound();
  if (!access || (!access.isMasterAdmin && novel.publisher_id !== access.userId)) {
    notFound();
  }

  const [{ data: latestUnlockRow }, { data: latestPaidRow }, { data: lastNumberRow }] =
    await Promise.all([
      admin
        .from("chapters")
        .select("unlock_at")
        .eq("novel_id", id)
        .not("unlock_at", "is", null)
        .order("unlock_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from("chapters")
        .select("coin_cost")
        .eq("novel_id", id)
        .eq("is_free", false)
        .order("number", { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from("chapters")
        .select("number")
        .eq("novel_id", id)
        .order("number", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  return (
    <PageContainer as="div">
      <Link
        href={`/admin/novels/${id}/chapters`}
        className="inline-flex h-9 items-center gap-1 rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <ChevronLeft className="size-4" strokeWidth={1.75} aria-hidden />
        Back to chapters
      </Link>

      <div className="mt-4">
        <ChapterForm
          novelId={novel.id}
          latestChapterUnlockAt={latestUnlockRow?.unlock_at ?? null}
          defaultCoinCost={latestPaidRow?.coin_cost ?? null}
          nextChapterNumber={(lastNumberRow?.number ?? 0) + 1}
        />
      </div>
    </PageContainer>
  );
}
