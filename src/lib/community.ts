import "server-only";

import { isAdminEmail } from "@/lib/admin";
import type {
  CommunityPost,
  CommunityPostKind,
  CommunityPostStatus,
} from "@/types";
import { getAuthClaims, getServerSupabase } from "@/utils/supabase/auth";

export {
  COMMUNITY_BODY_MAX,
  COMMUNITY_DAILY_LIMIT,
  COMMUNITY_PAGE_LIMIT,
  COMMUNITY_TITLE_MAX,
} from "@/lib/community-constants";

const POST_COLUMNS =
  "id, user_id, kind, title, body, status, vote_count, created_at";

type DbCommunityPost = {
  id: string;
  user_id: string;
  kind: CommunityPostKind;
  title: string;
  body: string;
  status: CommunityPostStatus;
  vote_count: number;
  created_at: string;
};

function isKind(value: string): value is CommunityPostKind {
  return value === "novel_request" || value === "idea";
}

function isStatus(value: string): value is CommunityPostStatus {
  return (
    value === "open" ||
    value === "planned" ||
    value === "done" ||
    value === "declined"
  );
}

async function fetchUsernames(userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username")
    .in("id", userIds);

  if (error) {
    console.error("fetchCommunityUsernames:", error);
    return new Map();
  }

  return new Map(
    (data ?? []).map((profile) => [
      profile.id as string,
      (profile.username as string | null) ?? "Unknown",
    ]),
  );
}

async function fetchVotedPostIds(
  userId: string | null,
  postIds: string[],
): Promise<Set<string>> {
  if (!userId || postIds.length === 0) return new Set();

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("community_post_votes")
    .select("post_id")
    .eq("user_id", userId)
    .in("post_id", postIds);

  if (error) {
    console.error("fetchCommunityVotes:", error);
    return new Set();
  }

  return new Set((data ?? []).map((row) => row.post_id as string));
}

function mapPosts(
  rows: DbCommunityPost[],
  usernames: Map<string, string>,
  votedIds: Set<string>,
  currentUserId: string | null,
): CommunityPost[] {
  return rows.map((row) => ({
    id: row.id,
    kind: isKind(row.kind) ? row.kind : "idea",
    title: row.title,
    body: row.body,
    status: isStatus(row.status) ? row.status : "open",
    voteCount: row.vote_count,
    votedByCurrentUser: votedIds.has(row.id),
    userId: row.user_id,
    username: usernames.get(row.user_id) ?? "Unknown",
    isOwn: currentUserId === row.user_id,
    createdAt: row.created_at,
  }));
}

async function fetchPosts(limit: number): Promise<DbCommunityPost[]> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("community_posts")
    .select(POST_COLUMNS)
    .order("vote_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("fetchCommunityPosts:", error);
    return [];
  }

  return (data ?? []) as DbCommunityPost[];
}

export async function getCommunityViewer(): Promise<{
  userId: string | null;
  isLoggedIn: boolean;
  isMasterAdmin: boolean;
}> {
  const claims = await getAuthClaims();
  if (!claims) {
    return { userId: null, isLoggedIn: false, isMasterAdmin: false };
  }

  return {
    userId: claims.sub as string,
    isLoggedIn: true,
    isMasterAdmin: isAdminEmail(claims.email as string | undefined),
  };
}

export async function getCommunityBoard(limit: number): Promise<{
  posts: CommunityPost[];
  isLoggedIn: boolean;
  isMasterAdmin: boolean;
}> {
  const [viewer, rows] = await Promise.all([
    getCommunityViewer(),
    fetchPosts(limit),
  ]);

  const userIds = [...new Set(rows.map((row) => row.user_id))];
  const postIds = rows.map((row) => row.id);
  const [usernames, votedIds] = await Promise.all([
    fetchUsernames(userIds),
    fetchVotedPostIds(viewer.userId, postIds),
  ]);

  return {
    posts: mapPosts(rows, usernames, votedIds, viewer.userId),
    isLoggedIn: viewer.isLoggedIn,
    isMasterAdmin: viewer.isMasterAdmin,
  };
}
