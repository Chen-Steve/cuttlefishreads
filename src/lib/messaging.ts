import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/utils/supabase/admin";
import { getAdminAccess, type AdminAccess } from "@/lib/access";
import { isAdminEmail } from "@/lib/admin";

// All messaging data flows through the service-role client behind
// getAdminAccess() checks. Workspace membership (master admin via env allowlist
// + approved translators) can't be expressed in RLS, so the tables are
// server-only and these helpers are the single gate in front of them.

export type WorkspaceMemberRole = "admin" | "translator";

export type ChatMember = {
  id: string;
  username: string;
  role: WorkspaceMemberRole;
  isSelf: boolean;
};

export type ChatChannel = {
  id: string;
  kind: "channel" | "dm";
  // Display title: "#general" for channels, the other person's name for DMs.
  title: string;
  // Raw channel name (group channels only).
  name: string | null;
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  channelId: string;
  userId: string;
  username: string;
  body: string;
  likeCount: number;
  likedByCurrentUser: boolean;
  isOwn: boolean;
  createdAt: string;
  updatedAt: string;
};

const MAX_MESSAGE_LENGTH = 4000;

export function validateMessageBody(body: string): string | null {
  const trimmed = body.trim();
  if (!trimmed) return "Message cannot be empty.";
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`;
  }
  return null;
}

// A stable, order-independent key for the DM between two users so a pair can
// only ever have one DM channel.
export function dmKey(a: string, b: string): string {
  return [a, b].sort().join(":");
}

function displayName(username: string | null, email?: string | null): string {
  if (username && username.trim()) return username;
  if (email) return email.split("@")[0];
  return "Unknown";
}

// Everyone allowed in the workspace: master admins (env allowlist) plus approved
// translators. Used to populate the "start a DM" directory.
export async function getWorkspaceMembers(
  access: AdminAccess,
): Promise<ChatMember[]> {
  const admin = createAdminClient();

  const [{ data: translatorProfiles }, usersList] = await Promise.all([
    admin.from("profiles").select("id, username").eq("role", "translator"),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const members = new Map<string, ChatMember>();

  // Master admins, resolved by matching the env allowlist against auth emails.
  const adminUsers = (usersList.data?.users ?? []).filter((u) =>
    isAdminEmail(u.email),
  );
  if (adminUsers.length > 0) {
    const adminIds = adminUsers.map((u) => u.id);
    const { data: adminProfiles } = await admin
      .from("profiles")
      .select("id, username")
      .in("id", adminIds);
    const usernameById = new Map(
      (adminProfiles ?? []).map((p) => [p.id, p.username as string | null]),
    );
    for (const u of adminUsers) {
      members.set(u.id, {
        id: u.id,
        username: displayName(usernameById.get(u.id) ?? null, u.email),
        role: "admin",
        isSelf: u.id === access.userId,
      });
    }
  }

  // Translators (admins who also happen to be translators keep the admin role).
  for (const p of (translatorProfiles ?? []) as {
    id: string;
    username: string | null;
  }[]) {
    if (members.has(p.id)) continue;
    members.set(p.id, {
      id: p.id,
      username: displayName(p.username),
      role: "translator",
      isSelf: p.id === access.userId,
    });
  }

  return [...members.values()].sort((a, b) => {
    if (a.isSelf !== b.isSelf) return a.isSelf ? -1 : 1;
    return a.username.localeCompare(b.username);
  });
}

// Group channels are open to every workspace member at the app layer, but
// Realtime topic authorization is membership-based (the realtime.messages RLS
// policy checks chat_channel_members). So each member needs a membership row to
// subscribe to a group channel's broadcast topic. This self-heals on page load
// for both master admins (env-only, not a DB role) and translators.
export async function ensureGroupChannelMembership(
  access: AdminAccess,
): Promise<void> {
  const admin = createAdminClient();

  const { data: groupChannels } = await admin
    .from("chat_channels")
    .select("id")
    .eq("kind", "channel");

  if (!groupChannels || groupChannels.length === 0) return;

  const rows = groupChannels.map((c) => ({
    channel_id: c.id as string,
    user_id: access.userId,
  }));

  await admin
    .from("chat_channel_members")
    .upsert(rows, { onConflict: "channel_id,user_id", ignoreDuplicates: true });
}

type ChannelRow = {
  id: string;
  kind: "channel" | "dm";
  name: string | null;
  created_at: string;
};

async function resolveUsernames(
  admin: SupabaseClient,
  ids: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(ids)].filter(Boolean);
  if (unique.length === 0) return new Map();
  const { data } = await admin
    .from("profiles")
    .select("id, username")
    .in("id", unique);
  return new Map(
    (data ?? []).map((p) => [p.id, displayName(p.username as string | null)]),
  );
}

// Channels visible to the current user: all group channels plus the DMs they
// are a member of. DM titles resolve to the other participant's name.
export async function listConversations(
  access: AdminAccess,
): Promise<ChatChannel[]> {
  const admin = createAdminClient();

  const [{ data: groupChannels }, { data: memberships }] = await Promise.all([
    admin
      .from("chat_channels")
      .select("id, kind, name, created_at")
      .eq("kind", "channel")
      .order("created_at", { ascending: true }),
    admin
      .from("chat_channel_members")
      .select("channel_id")
      .eq("user_id", access.userId),
  ]);

  const groups: ChatChannel[] = ((groupChannels ?? []) as ChannelRow[]).map(
    (c) => ({
      id: c.id,
      kind: "channel",
      title: `#${c.name ?? "channel"}`,
      name: c.name,
      createdAt: c.created_at,
    }),
  );

  const dmChannelIds = (memberships ?? []).map((m) => m.channel_id as string);
  let dms: ChatChannel[] = [];

  if (dmChannelIds.length > 0) {
    const [{ data: dmChannels }, { data: otherMembers }] = await Promise.all([
      admin
        .from("chat_channels")
        .select("id, kind, name, created_at")
        .in("id", dmChannelIds),
      admin
        .from("chat_channel_members")
        .select("channel_id, user_id")
        .in("channel_id", dmChannelIds)
        .neq("user_id", access.userId),
    ]);

    const otherByChannel = new Map<string, string>();
    for (const m of otherMembers ?? []) {
      otherByChannel.set(m.channel_id as string, m.user_id as string);
    }
    const usernames = await resolveUsernames(admin, [
      ...otherByChannel.values(),
    ]);

    dms = ((dmChannels ?? []) as ChannelRow[])
      .map((c) => {
        const otherId = otherByChannel.get(c.id);
        return {
          id: c.id,
          kind: "dm" as const,
          title: otherId ? (usernames.get(otherId) ?? "Unknown") : "Direct message",
          name: null,
          createdAt: c.created_at,
        };
      })
      .sort((a, b) => a.title.localeCompare(b.title));
  }

  return [...groups, ...dms];
}

// Confirms the user may read/post in a channel and returns the channel row.
// Group channels are open to all workspace members; DMs require membership.
export async function getAccessibleChannel(
  access: AdminAccess,
  channelId: string,
): Promise<ChannelRow | null> {
  const admin = createAdminClient();

  const { data: channel } = await admin
    .from("chat_channels")
    .select("id, kind, name, created_at")
    .eq("id", channelId)
    .maybeSingle<ChannelRow>();

  if (!channel) return null;

  if (channel.kind === "channel") {
    return access.hasWorkspace ? channel : null;
  }

  const { data: membership } = await admin
    .from("chat_channel_members")
    .select("user_id")
    .eq("channel_id", channelId)
    .eq("user_id", access.userId)
    .maybeSingle();

  return membership ? channel : null;
}

type MessageRow = {
  id: string;
  channel_id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
};

async function mapMessages(
  admin: SupabaseClient,
  rows: MessageRow[],
  currentUserId: string,
): Promise<ChatMessage[]> {
  if (rows.length === 0) return [];

  const messageIds = rows.map((r) => r.id);
  const [{ data: likes }, usernames] = await Promise.all([
    admin
      .from("chat_message_likes")
      .select("message_id, user_id")
      .in("message_id", messageIds),
    resolveUsernames(
      admin,
      rows.map((r) => r.user_id),
    ),
  ]);

  const likeCount = new Map<string, number>();
  const likedByMe = new Set<string>();
  for (const like of likes ?? []) {
    const mid = like.message_id as string;
    likeCount.set(mid, (likeCount.get(mid) ?? 0) + 1);
    if ((like.user_id as string) === currentUserId) likedByMe.add(mid);
  }

  return rows.map((r) => ({
    id: r.id,
    channelId: r.channel_id,
    userId: r.user_id,
    username: usernames.get(r.user_id) ?? "Unknown",
    body: r.body,
    likeCount: likeCount.get(r.id) ?? 0,
    likedByCurrentUser: likedByMe.has(r.id),
    isOwn: r.user_id === currentUserId,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

// Most recent messages for a channel, returned oldest-first for display.
export async function getChannelMessages(
  access: AdminAccess,
  channelId: string,
  options: { limit?: number; afterCreatedAt?: string } = {},
): Promise<ChatMessage[]> {
  const admin = createAdminClient();
  const limit = options.limit ?? 100;

  if (options.afterCreatedAt) {
    // Polling path: only messages newer than the latest one the client has.
    const { data } = await admin
      .from("chat_messages")
      .select("id, channel_id, user_id, body, created_at, updated_at")
      .eq("channel_id", channelId)
      .gt("created_at", options.afterCreatedAt)
      .order("created_at", { ascending: true })
      .limit(limit);
    return mapMessages(admin, (data ?? []) as MessageRow[], access.userId);
  }

  const { data } = await admin
    .from("chat_messages")
    .select("id, channel_id, user_id, body, created_at, updated_at")
    .eq("channel_id", channelId)
    .order("created_at", { ascending: false })
    .limit(limit);

  const rows = ((data ?? []) as MessageRow[]).reverse();
  return mapMessages(admin, rows, access.userId);
}

// Loads everything the messaging page needs for its first render.
export async function getMessagingBootstrap(): Promise<{
  access: AdminAccess;
  members: ChatMember[];
  channels: ChatChannel[];
  activeChannelId: string | null;
  messages: ChatMessage[];
} | null> {
  const access = await getAdminAccess();
  if (!access?.hasWorkspace) return null;

  // Ensure the current user can subscribe to every group channel's Realtime
  // topic before we list conversations.
  await ensureGroupChannelMembership(access);

  const [members, channels] = await Promise.all([
    getWorkspaceMembers(access),
    listConversations(access),
  ]);

  const activeChannelId = channels[0]?.id ?? null;
  const messages = activeChannelId
    ? await getChannelMessages(access, activeChannelId)
    : [];

  return { access, members, channels, activeChannelId, messages };
}
