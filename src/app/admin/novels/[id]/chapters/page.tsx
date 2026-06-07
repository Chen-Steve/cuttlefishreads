import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, PlusCircle, Pencil, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/page-container";
import { createAdminClient } from "@/utils/supabase/admin";
import { getAdminAccess } from "@/lib/access";
import {
  ChapterRowActions,
  PublishAllButton,
} from "../../../_components/chapter-admin-actions";

export const metadata: Metadata = {
  title: "Admin — Chapters",
  robots: { index: false, follow: false },
};

type ChapterRow = {
  id: string;
  number: number;
  title: string;
  is_free: boolean;
  coin_cost: number;
  is_published: boolean;
  unlock_at: string | null;
};

function formatUnlockDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function unlockLabel(chapter: Pick<ChapterRow, "is_free" | "unlock_at">) {
  if (chapter.unlock_at) {
    const date = formatUnlockDate(chapter.unlock_at);
    const released = new Date(chapter.unlock_at) <= new Date();
    return released ? `Released on ${date}` : `Releases on ${date}`;
  }
  if (chapter.is_free) return "Available now";
  return "No release date";
}

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
    .select("id, number, title, is_free, coin_cost, is_published, unlock_at")
    .eq("novel_id", id)
    .order("number", { ascending: true })
    .returns<ChapterRow[]>();

  const rows = chapters ?? [];
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
              <span className="text-amber-600">
                {" · "}
                {draftCount} draft{draftCount !== 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <PublishAllButton novelId={id} draftCount={draftCount} />
          {access.isMasterAdmin ? (
            <Link
              href={`/admin/novels/${id}/import`}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <Sparkles className="size-4" strokeWidth={1.75} aria-hidden />
              Import &amp; translate
            </Link>
          ) : null}
          <Link
            href={`/admin/novels/${id}/chapters/new`}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <PlusCircle className="size-4" strokeWidth={1.75} aria-hidden />
            Add chapter
          </Link>
        </div>
      </div>

      <div className="mt-8">
        {rows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted">
            No chapters yet — click &quot;Add chapter&quot; to get started.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {rows.map((chapter) => (
              <div
                key={chapter.id}
                className="flex items-center gap-4 px-4 py-3.5"
              >
                <span className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums text-muted">
                  {chapter.number}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-sm font-semibold text-foreground">
                    <span className="truncate">{chapter.title || `Chapter ${chapter.number}`}</span>
                    {chapter.is_published ? (
                      <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                        Published
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600">
                        Draft
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                    <span>{unlockLabel(chapter)}</span>
                    <span aria-hidden>·</span>
                    {chapter.is_free ? (
                      <span className="text-emerald-600">Free</span>
                    ) : (
                      <span>{chapter.coin_cost} coins</span>
                    )}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/admin/novels/${id}/chapters/${chapter.id}/edit`}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    <Pencil className="size-3.5" strokeWidth={1.75} aria-hidden />
                    <span className="hidden sm:inline">Edit</span>
                  </Link>
                  <ChapterRowActions
                    chapterId={chapter.id}
                    isPublished={chapter.is_published}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
