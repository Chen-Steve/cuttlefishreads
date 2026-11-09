import { PageContainer } from "@/components/page-container";
import { getAdminAccess } from "@/lib/access";
import { getServerSupabase } from "@/utils/supabase/auth";
import { WORKSPACE_BASE, WORKSPACE_LABELS } from "@/lib/workspace";
import {
  NovelsGrid,
  type NovelRow,
  type TranslatorOption,
} from "../_components/novels-grid";

type RawNovel = Omit<NovelRow, "translator_username">;

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

export async function WorkspaceNovelsPage() {
  const access = await getAdminAccess();
  const supabase = await getServerSupabase();
  const base = WORKSPACE_BASE;
  const labels = WORKSPACE_LABELS;

  let query = supabase
    .from("novels")
    .select(
      "id, title, slug, status, cover_url, updated_at, publisher_id, translator",
    )
    // Catalog novels only (legacy original rows stay out of this workspace).
    .eq("publication_type", "translation")
    .order("updated_at", { ascending: false });

  // Non-masters only see novels they own; master admins see everything.
  if (access && !access.isMasterAdmin) {
    query = query.eq("publisher_id", access.userId);
  }

  const { data } = await query.returns<RawNovel[]>();

  const publisherIds = access?.isMasterAdmin
    ? [
        ...new Set(
          (data ?? [])
            .map((n) => n.publisher_id)
            .filter((id): id is string => id != null),
        ),
      ]
    : [];

  const { data: profiles } =
    publisherIds.length === 0
      ? { data: [] as { id: string; username: string | null }[] }
      : await supabase
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
    updated_at: n.updated_at,
    publisher_id: n.publisher_id,
    translator: n.translator,
    translator_username: n.publisher_id
      ? (usernameById.get(n.publisher_id) ?? null)
      : null,
  }));

  const translatorOptions = access?.isMasterAdmin
    ? buildPublisherOptions(novels)
    : [];

  return (
    <PageContainer as="div">
      <p className="mb-4 text-center text-xs text-muted sm:hidden">
        This workspace is best viewed on a desktop screen.
      </p>

      <NovelsGrid
        novels={novels}
        translatorOptions={translatorOptions}
        title={labels.novels}
        createHref={`${base}/novels/new`}
        createLabel={`Create ${labels.noun}`}
      />
    </PageContainer>
  );
}
