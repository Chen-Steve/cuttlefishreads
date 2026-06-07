"use server";

import { getAdminAccess } from "@/lib/access";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  dmKey,
  getAccessibleChannel,
  getChannelMessages,
  listConversations,
  validateMessageBody,
  type ChatChannel,
  type ChatMessage,
} from "@/lib/messaging";

const MAX_CHANNEL_NAME_LENGTH = 40;

export type SendMessageState = { error?: string; message?: ChatMessage };

export async function sendMessage(
  channelId: string,
  body: string,
): Promise<SendMessageState> {
  const access = await getAdminAccess();
  if (!access?.hasWorkspace) {
    return { error: "You don't have access to the workspace chat." };
  }

  const bodyError = validateMessageBody(body);
  if (bodyError) return { error: bodyError };

  const channel = await getAccessibleChannel(access, channelId);
  if (!channel) return { error: "Conversation not found." };

  const admin = createAdminClient();
  const { data: inserted, error } = await admin
    .from("chat_messages")
    .insert({
      channel_id: channelId,
      user_id: access.userId,
      body: body.trim(),
    })
    .select("id, channel_id, user_id, body, created_at, updated_at")
    .single();

  if (error || !inserted) {
    return { error: error?.message ?? "Failed to send message." };
  }

  return {
    message: {
      id: inserted.id,
      channelId: inserted.channel_id,
      userId: inserted.user_id,
      username: access.username ?? "You",
      body: inserted.body,
      likeCount: 0,
      likedByCurrentUser: false,
      isOwn: true,
      createdAt: inserted.created_at,
      updatedAt: inserted.updated_at,
    },
  };
}

export type FetchMessagesState = { error?: string; messages?: ChatMessage[] };

// Polling endpoint. With afterCreatedAt set, returns only newer messages;
// otherwise returns the latest page (used when switching conversations).
export async function fetchMessages(
  channelId: string,
  afterCreatedAt?: string,
): Promise<FetchMessagesState> {
  const access = await getAdminAccess();
  if (!access?.hasWorkspace) {
    return { error: "You don't have access to the workspace chat." };
  }

  const channel = await getAccessibleChannel(access, channelId);
  if (!channel) return { error: "Conversation not found." };

  const messages = await getChannelMessages(access, channelId, {
    afterCreatedAt,
  });
  return { messages };
}

export type LikeState = { error?: string; liked?: boolean };

export async function toggleMessageLike(
  messageId: string,
): Promise<LikeState> {
  const access = await getAdminAccess();
  if (!access?.hasWorkspace) {
    return { error: "You don't have access to the workspace chat." };
  }

  const admin = createAdminClient();

  const { data: message } = await admin
    .from("chat_messages")
    .select("id, channel_id")
    .eq("id", messageId)
    .maybeSingle();

  if (!message) return { error: "Message not found." };

  // Confirm the user can actually see the channel this message lives in.
  const channel = await getAccessibleChannel(access, message.channel_id);
  if (!channel) return { error: "Message not found." };

  const { data: existing } = await admin
    .from("chat_message_likes")
    .select("id")
    .eq("message_id", messageId)
    .eq("user_id", access.userId)
    .maybeSingle();

  if (existing) {
    const { error } = await admin
      .from("chat_message_likes")
      .delete()
      .eq("id", existing.id);
    if (error) return { error: error.message };
    return { liked: false };
  }

  const { error } = await admin.from("chat_message_likes").insert({
    message_id: messageId,
    user_id: access.userId,
  });
  if (error) return { error: error.message };
  return { liked: true };
}

export type ChannelListState = { error?: string; channels?: ChatChannel[] };

export async function listConversationsAction(): Promise<ChannelListState> {
  const access = await getAdminAccess();
  if (!access?.hasWorkspace) {
    return { error: "You don't have access to the workspace chat." };
  }
  return { channels: await listConversations(access) };
}

export type CreateChannelState = { error?: string; channel?: ChatChannel };

export async function createChannel(
  name: string,
): Promise<CreateChannelState> {
  const access = await getAdminAccess();
  // Creating shared channels is master-admin only.
  if (!access?.isMasterAdmin) {
    return { error: "Only the admin can create channels." };
  }

  const trimmed = name.trim().replace(/^#+/, "").trim();
  if (!trimmed) return { error: "Channel name cannot be empty." };
  if (trimmed.length > MAX_CHANNEL_NAME_LENGTH) {
    return {
      error: `Channel name must be ${MAX_CHANNEL_NAME_LENGTH} characters or fewer.`,
    };
  }

  const admin = createAdminClient();
  const { data: inserted, error } = await admin
    .from("chat_channels")
    .insert({ kind: "channel", name: trimmed, created_by: access.userId })
    .select("id, kind, name, created_at")
    .single();

  if (error || !inserted) {
    return { error: error?.message ?? "Failed to create channel." };
  }

  // Add the creator as a member so they can subscribe to the channel's Realtime
  // topic immediately; other members self-heal when they open the page.
  await admin
    .from("chat_channel_members")
    .upsert(
      { channel_id: inserted.id, user_id: access.userId },
      { onConflict: "channel_id,user_id", ignoreDuplicates: true },
    );

  return {
    channel: {
      id: inserted.id,
      kind: "channel",
      title: `#${inserted.name}`,
      name: inserted.name,
      createdAt: inserted.created_at,
    },
  };
}

export type StartDmState = { error?: string; channel?: ChatChannel };

// Opens (or reuses) the 1:1 DM channel between the current user and another
// workspace member.
export async function startDirectMessage(
  otherUserId: string,
): Promise<StartDmState> {
  const access = await getAdminAccess();
  if (!access?.hasWorkspace) {
    return { error: "You don't have access to the workspace chat." };
  }
  if (otherUserId === access.userId) {
    return { error: "You can't message yourself." };
  }

  const admin = createAdminClient();

  // The other party must be a real profile (workspace membership is enforced by
  // the directory the UI offers, but re-check the profile exists).
  const { data: otherProfile } = await admin
    .from("profiles")
    .select("id, username")
    .eq("id", otherUserId)
    .maybeSingle();
  if (!otherProfile) return { error: "That person no longer exists." };

  const key = dmKey(access.userId, otherUserId);

  // Reuse an existing DM if there is one.
  const { data: existing } = await admin
    .from("chat_channels")
    .select("id, kind, name, created_at")
    .eq("dm_key", key)
    .maybeSingle();

  if (existing) {
    return {
      channel: {
        id: existing.id,
        kind: "dm",
        title: otherProfile.username ?? "Direct message",
        name: null,
        createdAt: existing.created_at,
      },
    };
  }

  const { data: channel, error: channelError } = await admin
    .from("chat_channels")
    .insert({ kind: "dm", dm_key: key, created_by: access.userId })
    .select("id, kind, name, created_at")
    .single();

  if (channelError || !channel) {
    return { error: channelError?.message ?? "Failed to start conversation." };
  }

  const { error: membersError } = await admin
    .from("chat_channel_members")
    .insert([
      { channel_id: channel.id, user_id: access.userId },
      { channel_id: channel.id, user_id: otherUserId },
    ]);

  if (membersError) {
    // Roll back the orphaned channel so a retry can recreate it cleanly.
    await admin.from("chat_channels").delete().eq("id", channel.id);
    return { error: membersError.message };
  }

  return {
    channel: {
      id: channel.id,
      kind: "dm",
      title: otherProfile.username ?? "Direct message",
      name: null,
      createdAt: channel.created_at,
    },
  };
}
