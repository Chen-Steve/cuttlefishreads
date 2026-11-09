import type { AdminAccess } from "@/lib/access";
import { ownsNovel } from "@/lib/access";
import type { Tables } from "@/lib/database.types";
import type { NovelComment } from "@/types";
import { getServerSupabase } from "@/utils/supabase/auth";

type NovelTable = Tables<"novels">;
type ChapterTable = Tables<"chapters">;
type ProfileTable = Tables<"profiles">;
type ApplicationTable = Tables<"translator_applications">;
type UnlockTable = Tables<"chapter_unlocks">;

export const RECENT_PURCHASES_LIMIT = 100;
export const TOP_COMMENTS_LIMIT = 100;

export type WorkspaceNovelStat = {
  id: string;
  slug: string;
  title: string;
  views: number;
  bookmarks: number;
  purchases: number;
  coinsEarned: number;
};

export type WorkspacePurchase = {
  chapterNumber: number;
  buyer: string;
  earned: number;
  createdAt: string;
};

export type WorkspaceDashboard = {
  stats: WorkspaceNovelStat[];
  totals: { bookmarks: number; purchases: number; coinsEarned: number };
  totalViews: number;
  novels: Pick<NovelTable, "id" | "slug" | "title">[];
  slugs: string[];
  allTimeViewsBySlug: Record<string, number>;
  novelsWithPurchases: Pick<NovelTable, "id" | "slug" | "title">[];
  purchasesByNovel: Map<string, WorkspacePurchase[]>;
  purchasesBySlug: Map<string, number>;
  earnedBySlug: Map<string, number>;
  recentPurchasesTruncated: boolean;
};

export async function getWorkspaceDashboard(
  access: AdminAccess,
): Promise<WorkspaceDashboard> {
  const supabase = await getServerSupabase();
  let novelsQuery = supabase
    .from("novels")
    .select("id, slug, title, library_add_count, view_count")
    .eq("publication_type", "translation")
    .order("updated_at", { ascending: false });
  if (!access.isMasterAdmin) {
    novelsQuery = novelsQuery.eq("publisher_id", access.userId);
  }

  const { data: novels } = await novelsQuery;
  const rows = novels ?? [];
  const slugs = rows.map((novel) => novel.slug);
  const allTimeViewsBySlug: Record<string, number> = {};
  for (const novel of rows) {
    allTimeViewsBySlug[novel.slug] = Number(novel.view_count ?? 0);
  }

  type UnlockStat = {
    novel_slug: string;
    purchase_count: number;
    coins_earned: number;
  };
  let statsRows: UnlockStat[] = [];
  let unlockRows: Pick<
    UnlockTable,
    "novel_slug" | "chapter_number" | "translator_share" | "created_at" | "user_id"
  >[] = [];

  if (rows.length > 0) {
    const [unlockStatsRes, recentUnlocksRes] = await Promise.all([
      supabase.rpc("novel_unlock_stats", { p_slugs: slugs }),
      supabase
        .from("chapter_unlocks")
        .select("novel_slug, chapter_number, translator_share, created_at, user_id")
        .in("novel_slug", slugs)
        .eq("hidden_from_translator", false)
        .order("created_at", { ascending: false })
        .limit(RECENT_PURCHASES_LIMIT),
    ]);
    statsRows = unlockStatsRes.data ?? [];
    unlockRows = recentUnlocksRes.data ?? [];
  }

  const purchasesBySlug = new Map<string, number>();
  const earnedBySlug = new Map<string, number>();
  for (const row of statsRows) {
    purchasesBySlug.set(row.novel_slug, Number(row.purchase_count ?? 0));
    earnedBySlug.set(row.novel_slug, Number(row.coins_earned ?? 0));
  }

  const buyerIds = [...new Set(unlockRows.map((row) => row.user_id))];
  const usernameById = new Map<string, string>();
  if (buyerIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", buyerIds);
    for (const profile of profiles ?? []) {
      usernameById.set(profile.id, profile.username ?? "Unknown");
    }
  }

  const purchasesByNovel = new Map<string, WorkspacePurchase[]>();
  for (const row of unlockRows) {
    const list = purchasesByNovel.get(row.novel_slug) ?? [];
    list.push({
      chapterNumber: row.chapter_number,
      buyer: usernameById.get(row.user_id) ?? "Unknown",
      earned: row.translator_share,
      createdAt: row.created_at,
    });
    purchasesByNovel.set(row.novel_slug, list);
  }

  const catalog = rows.map((novel) => ({
    id: novel.id,
    slug: novel.slug,
    title: novel.title,
  }));
  const stats: WorkspaceNovelStat[] = rows.map((novel) => ({
    id: novel.id,
    slug: novel.slug,
    title: novel.title,
    views: allTimeViewsBySlug[novel.slug] ?? 0,
    bookmarks: Number(novel.library_add_count ?? 0),
    purchases: purchasesBySlug.get(novel.slug) ?? 0,
    coinsEarned: earnedBySlug.get(novel.slug) ?? 0,
  }));
  const totals = stats.reduce(
    (acc, stat) => ({
      bookmarks: acc.bookmarks + stat.bookmarks,
      purchases: acc.purchases + stat.purchases,
      coinsEarned: acc.coinsEarned + stat.coinsEarned,
    }),
    { bookmarks: 0, purchases: 0, coinsEarned: 0 },
  );

  return {
    stats,
    totals,
    totalViews: Object.values(allTimeViewsBySlug).reduce((sum, count) => sum + count, 0),
    novels: catalog,
    slugs,
    allTimeViewsBySlug,
    novelsWithPurchases: catalog.filter(
      (novel) => (purchasesBySlug.get(novel.slug) ?? 0) > 0,
    ),
    purchasesByNovel,
    purchasesBySlug,
    earnedBySlug,
    recentPurchasesTruncated: unlockRows.length >= RECENT_PURCHASES_LIMIT,
  };
}

export type WorkspaceNovelListItem = Pick<
  NovelTable,
  "id" | "title" | "slug" | "status" | "cover_url" | "updated_at" | "publisher_id" | "translator"
> & { translator_username: string | null };

export type WorkspaceTranslatorOption = {
  id: string;
  label: string;
  count: number;
};

export async function getWorkspaceNovels(access: AdminAccess): Promise<{
  novels: WorkspaceNovelListItem[];
  translatorOptions: WorkspaceTranslatorOption[];
}> {
  const supabase = await getServerSupabase();
  let query = supabase
    .from("novels")
    .select("id, title, slug, status, cover_url, updated_at, publisher_id, translator")
    .eq("publication_type", "translation")
    .order("updated_at", { ascending: false });
  if (!access.isMasterAdmin) query = query.eq("publisher_id", access.userId);

  const { data } = await query;
  const publisherIds = access.isMasterAdmin
    ? [...new Set((data ?? []).map((novel) => novel.publisher_id).filter((id) => id != null))]
    : [];
  const { data: profiles } = publisherIds.length === 0
    ? { data: [] as Pick<ProfileTable, "id" | "username">[] }
    : await supabase.from("profiles").select("id, username").in("id", publisherIds);
  const usernameById = new Map((profiles ?? []).map((profile) => [profile.id, profile.username]));

  const novels: WorkspaceNovelListItem[] = (data ?? []).map((novel) => ({
    ...novel,
    translator_username: novel.publisher_id
      ? (usernameById.get(novel.publisher_id) ?? null)
      : null,
  }));

  const translatorOptions = access.isMasterAdmin
    ? buildPublisherOptions(novels)
    : [];
  return { novels, translatorOptions };
}

function buildPublisherOptions(
  novels: WorkspaceNovelListItem[],
): WorkspaceTranslatorOption[] {
  const byPublisher = new Map<string, { label: string; count: number }>();
  for (const novel of novels) {
    const id = novel.publisher_id ?? "__unassigned__";
    const label = novel.translator_username ?? novel.translator?.trim() ?? "Unassigned";
    const existing = byPublisher.get(id);
    if (existing) existing.count += 1;
    else byPublisher.set(id, { label, count: 1 });
  }
  return Array.from(byPublisher.entries())
    .map(([id, { label, count }]) => ({ id, label, count }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export type WorkspaceCommentGroup = {
  novelSlug: string;
  novelTitle: string;
  comments: NovelComment[];
};

export async function getWorkspaceComments(access: AdminAccess): Promise<{
  groups: WorkspaceCommentGroup[];
  truncated: boolean;
}> {
  const supabase = await getServerSupabase();
  let novelsQuery = supabase
    .from("novels")
    .select("id, slug, title, publisher_id")
    .eq("publication_type", "translation")
    .order("updated_at", { ascending: false });
  if (!access.isMasterAdmin) novelsQuery = novelsQuery.eq("publisher_id", access.userId);

  const { data: novels } = await novelsQuery;
  const novelRows = novels ?? [];
  const slugs = novelRows.map((novel) => novel.slug);
  const publisherBySlug = new Map(novelRows.map((novel) => [novel.slug, novel.publisher_id]));
  const columns =
    "id, novel_slug, chapter_number, parent_id, body, rating, user_id, created_at, updated_at, author:profiles(username)";

  const { data: topData, error: commentsError } = slugs.length === 0
    ? { data: [], error: null }
    : await supabase
        .from("novel_comments")
        .select(columns)
        .in("novel_slug", slugs)
        .is("parent_id", null)
        .order("created_at", { ascending: false })
        .limit(TOP_COMMENTS_LIMIT);
  if (commentsError) {
    throw new Error("Could not load workspace comments", { cause: commentsError });
  }

  const topRows = topData ?? [];
  const parentIds = topRows.map((row) => row.id);
  const { data: replyData, error: repliesError } = parentIds.length === 0
    ? { data: [], error: null }
    : await supabase
        .from("novel_comments")
        .select(columns)
        .in("parent_id", parentIds)
        .order("created_at", { ascending: true });
  if (repliesError) {
    throw new Error("Could not load workspace comment replies", { cause: repliesError });
  }

  function usernameOf(author: { username: string | null } | { username: string | null }[] | null) {
    const row = Array.isArray(author) ? author[0] : author;
    return row?.username ?? "Unknown";
  }

  function toComment(
    row: (typeof topRows)[number],
    replies: NovelComment[] = [],
  ): NovelComment {
    const publisherId = publisherBySlug.get(row.novel_slug) ?? null;
    return {
      id: row.id,
      novelSlug: row.novel_slug,
      chapterNumber: row.chapter_number,
      parentId: row.parent_id,
      body: row.body,
      rating: row.rating ?? null,
      userId: row.user_id,
      username: usernameOf(row.author),
      likeCount: 0,
      likedByCurrentUser: false,
      isOwn: row.user_id === access.userId,
      isTranslatorReply:
        row.parent_id != null && publisherId != null && row.user_id === publisherId,
      replies,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  const repliesByParent = new Map<string, NovelComment[]>();
  for (const row of replyData ?? []) {
    if (!row.parent_id) continue;
    const list = repliesByParent.get(row.parent_id) ?? [];
    list.push(toComment(row));
    repliesByParent.set(row.parent_id, list);
  }

  const groupsBySlug = new Map<string, NovelComment[]>();
  for (const row of topRows) {
    const list = groupsBySlug.get(row.novel_slug) ?? [];
    list.push(toComment(row, repliesByParent.get(row.id) ?? []));
    groupsBySlug.set(row.novel_slug, list);
  }

  return {
    truncated: topRows.length >= TOP_COMMENTS_LIMIT,
    groups: novelRows
      .filter((novel) => groupsBySlug.has(novel.slug))
      .map((novel) => ({
        novelSlug: novel.slug,
        novelTitle: novel.title,
        comments: groupsBySlug.get(novel.slug) ?? [],
      })),
  };
}

export type WorkspaceChapterListItem = Pick<
  ChapterTable,
  "id" | "number" | "title" | "word_count" | "is_free" | "coin_cost" | "is_published" | "unlock_at"
>;

export async function getWorkspaceChapters(
  access: AdminAccess,
  novelId: string,
): Promise<{ title: string; chapters: WorkspaceChapterListItem[]; draftCount: number } | null> {
  const supabase = await getServerSupabase();
  const [{ data: novel }, { data: chapters }] = await Promise.all([
    supabase
      .from("novels")
      .select("id, title, publisher_id")
      .eq("id", novelId)
      .eq("publication_type", "translation")
      .maybeSingle(),
    supabase
      .from("chapters")
      .select("id, number, title, word_count, is_free, coin_cost, is_published, unlock_at")
      .eq("novel_id", novelId)
      .order("number", { ascending: true }),
  ]);
  if (!novel || !access || !ownsNovel(access, novel.publisher_id)) return null;
  const rows = (chapters ?? []).map((chapter) => ({
    ...chapter,
    word_count: Number(chapter.word_count ?? 0),
  }));
  return {
    title: novel.title,
    chapters: rows,
    draftCount: rows.filter((chapter) => !chapter.is_published).length,
  };
}

export async function getWorkspaceNovelForEdit(access: AdminAccess, novelId: string) {
  const supabase = await getServerSupabase();
  const { data: novel } = await supabase
    .from("novels")
    .select(
      "id, title, original_author, translator, description, cover_url, genres, tags, status, language, publisher_id, novelupdates_url",
    )
    .eq("id", novelId)
    .eq("publication_type", "translation")
    .maybeSingle();
  if (!novel || !ownsNovel(access, novel.publisher_id)) return null;
  return novel;
}

async function chapterDraftDefaults(novelId: string) {
  const supabase = await getServerSupabase();
  const [{ data: latestUnlockRow }, { data: latestPaidRow }, { data: numberRows }] =
    await Promise.all([
      supabase
        .from("chapters")
        .select("unlock_at")
        .eq("novel_id", novelId)
        .not("unlock_at", "is", null)
        .order("unlock_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("chapters")
        .select("coin_cost")
        .eq("novel_id", novelId)
        .eq("is_free", false)
        .order("number", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("chapters").select("number").eq("novel_id", novelId),
    ]);
  const existingNumbers = (numberRows ?? []).map((row) => row.number);
  return {
    latestChapterUnlockAt: latestUnlockRow?.unlock_at ?? null,
    defaultCoinCost: latestPaidRow?.coin_cost ?? null,
    existingNumbers,
    nextChapterNumber: existingNumbers.reduce((max, number) => Math.max(max, number), 0) + 1,
  };
}

export async function getWorkspaceChapterDraft(access: AdminAccess, novelId: string) {
  const supabase = await getServerSupabase();
  const { data: novel } = await supabase
    .from("novels")
    .select("id, title, publisher_id")
    .eq("id", novelId)
    .eq("publication_type", "translation")
    .maybeSingle();
  if (!novel || !ownsNovel(access, novel.publisher_id)) return null;
  return { novel, ...(await chapterDraftDefaults(novelId)) };
}

export async function getWorkspaceChapterForEdit(
  access: AdminAccess,
  novelId: string,
  chapterId: string,
) {
  const supabase = await getServerSupabase();
  const [{ data: novel }, { data: chapter }, { data: latestUnlockRow }, { data: siblings }] =
    await Promise.all([
      supabase
        .from("novels")
        .select("id, publisher_id")
        .eq("id", novelId)
        .eq("publication_type", "translation")
        .maybeSingle(),
      supabase
        .from("chapters")
        .select(
          "id, number, title, content, translator_note, use_global_translator_note, is_free, coin_cost, unlock_at, is_published",
        )
        .eq("id", chapterId)
        .eq("novel_id", novelId)
        .maybeSingle(),
      supabase
        .from("chapters")
        .select("unlock_at")
        .eq("novel_id", novelId)
        .neq("id", chapterId)
        .not("unlock_at", "is", null)
        .order("unlock_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("chapters")
        .select("id, number")
        .eq("novel_id", novelId)
        .order("number", { ascending: true }),
    ]);
  if (!novel || !chapter || !ownsNovel(access, novel.publisher_id)) return null;
  const ordered = siblings ?? [];
  const currentIndex = ordered.findIndex((sibling) => sibling.id === chapterId);
  return {
    novelId: novel.id,
    latestChapterUnlockAt: latestUnlockRow?.unlock_at ?? null,
    previousChapter: currentIndex > 0 ? ordered[currentIndex - 1] : null,
    nextChapter:
      currentIndex >= 0 && currentIndex < ordered.length - 1
        ? ordered[currentIndex + 1]
        : null,
    chapter,
  };
}

export async function getWorkspaceSettings(access: AdminAccess) {
  const supabase = await getServerSupabase();
  const { data: profile } = await supabase
    .from("profiles")
    .select("translator_note, kofi_url, patreon_url")
    .eq("id", access.userId)
    .maybeSingle();
  return {
    globalNote: profile?.translator_note ?? null,
    kofiUrl: profile?.kofi_url ?? null,
    patreonUrl: profile?.patreon_url ?? null,
  };
}

export async function getTranslatorApplications(): Promise<
  Pick<
    ApplicationTable,
    "id" | "username" | "email" | "discord" | "message" | "status" | "created_at"
  >[]
> {
  const supabase = await getServerSupabase();
  const { data } = await supabase
    .from("translator_applications")
    .select("id, username, email, discord, message, status, created_at")
    .order("created_at", { ascending: false });
  return data ?? [];
}
