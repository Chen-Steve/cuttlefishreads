import Link from "next/link";
import { PlusCircle } from "lucide-react";

import { PageContainer } from "@/components/page-container";
import { createAdminClient } from "@/utils/supabase/admin";
import { getAdminAccess } from "@/lib/access";
import {
  WORKSPACE_BASE,
  WORKSPACE_LABELS,
  WORKSPACE_PUBLICATION_TYPE,
  type WorkspaceKind,
} from "@/lib/workspace";
import {
  NovelsGrid,
  type NovelRow,
  type TranslatorOption,
} from "../_components/novels-grid";

type RawNovel = Omit<NovelRow, "chapter_count" | "translator_username"> & {
  chapters: { count: number }[];
};

function buildPublisherOptions(novels: NovelRow[]): TranslatorOption[] {
  const byPublisher = new Map<string, { label: string; count: number }>();

  for (const novel of novels) {
    const id = novel.publisher_id ?? "__unassigned__";
    const label =
      novel.translator_username ?? novel.translator?.trim() ?? "Unassigned";
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

export async function WorkspaceNovelsPage({
  workspace,
}: {
  workspace: WorkspaceKind;
}) {
  const access = await getAdminAccess();
  const admin = createAdminClient();
  const base = WORKSPACE_BASE[workspace];
  const labels = WORKSPACE_LABELS[workspace];

  let query = admin
    .from("novels")
    .select(
      "id, title, slug, status, cover_url, genres, updated_at, publisher_id, translator, chapters(count)",
    )
    // Each workspace only manages its own publication type.
    .eq("publication_type", WORKSPACE_PUBLICATION_TYPE[workspace])
    .order("updated_at", { ascending: false });

  // Non-masters only see novels they own; master admins see everything.
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

  const translatorOptions = access?.isMasterAdmin
    ? buildPublisherOptions(novels)
    : [];

  const countLabel =
    novels.length === 0
      ? `No ${labels.noun === "series" ? "series" : "novels"} yet`
      : `${novels.length} ${labels.noun === "series" ? "series" : `novel${novels.length !== 1 ? "s" : ""}`}`;

  return (
    <PageContainer as="div">
      <p className="mb-4 text-center text-xs text-muted sm:hidden">
        This workspace is best viewed on a desktop screen.
      </p>

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {labels.novels}
          </h1>
          <p className="mt-0.5 text-sm text-muted">{countLabel}</p>
        </div>

        <Link
          href={`${base}/novels/new`}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <PlusCircle className="size-4" strokeWidth={1.75} aria-hidden />
          Create {labels.noun}
        </Link>
      </div>

      <div className="mt-8">
        <NovelsGrid novels={novels} translatorOptions={translatorOptions} />
      </div>
    </PageContainer>
  );
}
