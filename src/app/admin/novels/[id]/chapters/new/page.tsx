import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/page-container";
import { createAdminClient } from "@/utils/supabase/admin";
import { getAdminAccess } from "@/lib/access";
import { ChapterForm } from "../../../../_components/chapter-form";

export const metadata: Metadata = {
  title: "Admin",
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

  const { data: latestUnlockRow } = await admin
    .from("chapters")
    .select("unlock_at")
    .eq("novel_id", id)
    .not("unlock_at", "is", null)
    .order("unlock_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <PageContainer as="div" width="prose">
      <Link
        href={`/admin/novels/${id}/chapters`}
        className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" strokeWidth={1.75} aria-hidden />
        Back to chapters
      </Link>

      <div className="mt-4 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <ChapterForm
          novelId={novel.id}
          latestChapterUnlockAt={latestUnlockRow?.unlock_at ?? null}
        />
      </div>
    </PageContainer>
  );
}
