import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, PlusCircle, Pencil, Trash2 } from "lucide-react";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/page-container";
import { createAdminClient } from "@/utils/supabase/admin";

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
  published_at: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function ChaptersListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const admin = createAdminClient();
  const { data: novel } = await admin
    .from("novels")
    .select("id, title")
    .eq("id", id)
    .maybeSingle();

  if (!novel) notFound();

  const { data: chapters } = await admin
    .from("chapters")
    .select("id, number, title, is_free, coin_cost, published_at")
    .eq("novel_id", id)
    .order("number", { ascending: true })
    .returns<ChapterRow[]>();

  const rows = chapters ?? [];

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
          </p>
        </div>

        <Link
          href={`/admin/novels/${id}/chapters/new`}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <PlusCircle className="size-4" strokeWidth={1.75} aria-hidden />
          Add chapter
        </Link>
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
                  <p className="truncate text-sm font-semibold text-foreground">
                    {chapter.title}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                    <span>{formatDate(chapter.published_at)}</span>
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
                  <Link
                    href={`/admin/novels/${id}/chapters/${chapter.id}/delete`}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-200 bg-background px-3 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.75} aria-hidden />
                    <span className="hidden sm:inline">Delete</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
