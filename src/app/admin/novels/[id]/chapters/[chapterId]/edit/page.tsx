import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/page-container";
import { createAdminClient } from "@/utils/supabase/admin";
import { getAdminAccess } from "@/lib/access";
import { ChapterForm } from "../../../../../_components/chapter-form";

export const metadata: Metadata = {
  title: "Admin — Edit Chapter",
  robots: { index: false, follow: false },
};

type ChapterRow = {
  id: string;
  number: number;
  title: string;
  content: string;
  is_free: boolean;
  coin_cost: number;
  unlock_at: string | null;
};

export default async function EditChapterPage({
  params,
}: {
  params: Promise<{ id: string; chapterId: string }>;
}) {
  const { id, chapterId } = await params;

  const access = await getAdminAccess();
  const admin = createAdminClient();

  const [{ data: novel }, { data: chapter }] = await Promise.all([
    admin.from("novels").select("id, title, publisher_id").eq("id", id).maybeSingle(),
    admin
      .from("chapters")
      .select("id, number, title, content, is_free, coin_cost, unlock_at")
      .eq("id", chapterId)
      .eq("novel_id", id)
      .maybeSingle(),
  ]);

  if (!novel || !chapter) notFound();
  if (!access || (!access.isMasterAdmin && novel.publisher_id !== access.userId)) {
    notFound();
  }

  const row = chapter as ChapterRow;

  return (
    <PageContainer as="div" width="prose">
      <Link
        href={`/admin/novels/${id}/chapters`}
        className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" strokeWidth={1.75} aria-hidden />
        Back to chapters
      </Link>

      <h1 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
        Edit chapter {row.number}
      </h1>

      <div className="mt-5 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <ChapterForm
          novelId={novel.id}
          initial={{
            chapterId: row.id,
            number: row.number,
            title: row.title,
            content: row.content,
            isFree: row.is_free,
            coinCost: row.coin_cost,
            unlockAt: row.unlock_at,
          }}
        />
      </div>
    </PageContainer>
  );
}
