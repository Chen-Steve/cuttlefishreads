import type { Metadata } from "next";
import Link from "next/link";
import { PlusCircle } from "lucide-react";

import { PageContainer } from "@/components/page-container";
import { createAdminClient } from "@/utils/supabase/admin";
import { NovelsGrid, type NovelRow } from "./_components/novels-grid";

export const metadata: Metadata = {
  title: "Admin — Novels",
  robots: { index: false, follow: false },
};

type RawNovel = Omit<NovelRow, "chapter_count"> & {
  chapters: { count: number }[];
};

export default async function AdminPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("novels")
    .select("id, title, slug, status, cover_url, genres, updated_at, chapters(count)")
    .order("updated_at", { ascending: false })
    .returns<RawNovel[]>();

  const novels: NovelRow[] = (data ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    slug: n.slug,
    status: n.status,
    cover_url: n.cover_url,
    genres: n.genres,
    updated_at: n.updated_at,
    chapter_count: n.chapters?.[0]?.count ?? 0,
  }));

  return (
    <PageContainer as="div">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            My Novels
          </h1>
          <p className="mt-0.5 text-sm text-muted">
            {novels.length === 0
              ? "No novels yet"
              : `${novels.length} novel${novels.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        <Link
          href="/admin/novels/new"
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <PlusCircle className="size-4" strokeWidth={1.75} aria-hidden />
          Create novel
        </Link>
      </div>

      <div className="mt-8">
        <NovelsGrid novels={novels} />
      </div>
    </PageContainer>
  );
}
