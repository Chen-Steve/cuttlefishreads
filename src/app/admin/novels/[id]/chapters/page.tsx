import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, PlusCircle } from "lucide-react";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/page-container";
import { countWords } from "@/lib/utils";
import { createAdminClient } from "@/utils/supabase/admin";
import { getAdminAccess } from "@/lib/access";
import {
  ChapterList,
  ChapterOrderToggle,
} from "../../../_components/chapter-list";
import { PublishAllButton } from "../../../_components/chapter-admin-actions";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type ChapterRow = {
  id: string;
  number: number;
  title: string;
  content: string;
  is_free: boolean;
  coin_cost: number;
  is_published: boolean;
  unlock_at: string | null;
};

export default async function ChaptersListPage({
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

  const { data: chapters } = await admin
    .from("chapters")
    .select(
      "id, number, title, content, is_free, coin_cost, is_published, unlock_at",
    )
    .eq("novel_id", id)
    .order("number", { ascending: true })
    .returns<ChapterRow[]>();

  const rows = (chapters ?? []).map(
    ({ content, ...chapter }) => ({
      ...chapter,
      word_count: countWords(content),
    }),
  );
  const draftCount = rows.filter((c) => !c.is_published).length;

  return (
    <PageContainer as="div">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
          >
            <ChevronLeft className="size-4" strokeWidth={1.75} aria-hidden />
            Back to novels
          </Link>
          <h1 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
            {novel.title}
          </h1>
          <p className="mt-0.5 text-sm text-muted">
            {rows.length === 0
              ? "No chapters yet"
              : `${rows.length} chapter${rows.length !== 1 ? "s" : ""}`}
            {draftCount > 0 && (
              <span className="text-amber-600 dark:text-amber-400">
                {" · "}
                {draftCount} draft{draftCount !== 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <PublishAllButton novelId={id} draftCount={draftCount} />
          <ChapterOrderToggle />
          <Link
            href={`/admin/novels/${id}/chapters/new`}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <PlusCircle className="size-4" strokeWidth={1.75} aria-hidden />
            Add chapter
          </Link>
        </div>
      </div>

      <div className="mt-8">
        <ChapterList novelId={id} chapters={rows} />
      </div>
    </PageContainer>
  );
}
