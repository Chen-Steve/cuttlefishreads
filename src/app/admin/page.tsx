import type { Metadata } from "next";
import Link from "next/link";
import { PlusCircle } from "lucide-react";

import { PageContainer } from "@/components/page-container";
import { createAdminClient } from "@/utils/supabase/admin";
import { getAdminAccess } from "@/lib/access";
import { NovelsGrid, type NovelRow, type TranslatorOption } from "./_components/novels-grid";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type RawNovel = Omit<
  NovelRow,
  "chapter_count" | "translator_username"
> & {
  chapters: { count: number }[];
};

function buildTranslatorOptions(novels: NovelRow[]): TranslatorOption[] {
  const byPublisher = new Map<string, { label: string; count: number }>();

  for (const novel of novels) {
    const id = novel.publisher_id ?? "__unassigned__";
    const label =
      novel.translator_username ??
      novel.translator?.trim() ??
      "Unassigned";
    const existing = byPublisher.get(id);
    if (existing) {
      existing.count += 1;
    } else {
      byPublisher.set(id, { label, count: 1 });
    }
  }

  return Array.from(byPublisher.entries())
    .map(([id, { label, count }]) => ({ id, label, count }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export default async function AdminPage() {
  const access = await getAdminAccess();
  const admin = createAdminClient();

  let query = admin
    .from("novels")
    .select(
      "id, title, slug, status, cover_url, genres, updated_at, publisher_id, translator, chapters(count)",
    )
    .order("updated_at", { ascending: false });

  // Translators only see novels they own; master admins see everything.
  if (access && !access.isMasterAdmin) {
    query = query.eq("publisher_id", access.userId);
  }

  const { data } = await query.returns<RawNovel[]>();

  const publisherIds = [
    ...new Set(
      (data ?? [])
        .map((n) => n.publisher_id)
        .filter((id): id is string => id != null),
    ),
  ];

  const { data: profiles } =
    publisherIds.length === 0
      ? { data: [] as { id: string; username: string | null }[] }
      : await admin
          .from("profiles")
          .select("id, username")
          .in("id", publisherIds);

  const usernameById = new Map(
    (profiles ?? []).map((p) => [p.id, p.username]),
  );

  const novels: NovelRow[] = (data ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    slug: n.slug,
    status: n.status,
    cover_url: n.cover_url,
    genres: n.genres,
    updated_at: n.updated_at,
    publisher_id: n.publisher_id,
    translator: n.translator,
    translator_username: n.publisher_id
      ? (usernameById.get(n.publisher_id) ?? null)
      : null,
    chapter_count: n.chapters?.[0]?.count ?? 0,
  }));

  const translatorOptions =
    access?.isMasterAdmin ? buildTranslatorOptions(novels) : [];

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
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <PlusCircle className="size-4" strokeWidth={1.75} aria-hidden />
          Create novel
        </Link>
      </div>

      <div className="mt-8">
        <NovelsGrid novels={novels} translatorOptions={translatorOptions} />
      </div>

      <p className="mt-8 text-center text-xs text-muted sm:hidden">
        This workspace is best viewed on a desktop screen.
      </p>
    </PageContainer>
  );
}
