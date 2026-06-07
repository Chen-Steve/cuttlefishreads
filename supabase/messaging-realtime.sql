-- =============================================================================
-- Workspace messaging realtime (live messages + likes)
--
-- Run this AFTER messaging.sql. Upgrades the workspace chat from polling to
-- live Supabase Realtime using "Broadcast from the Database":
--
--   * Triggers on chat_messages / chat_message_likes broadcast each change to a
--     private topic named  chat:<channel_id>  via realtime.send().
--   * Clients subscribe to that topic with the browser client (private channel).
--   * Subscription is authorized by an RLS policy on realtime.messages that
--     checks chat_channel_members — so the chat tables themselves stay
--     server-only (no anon/authenticated grants on them).
--
-- The chat tables remain accessed exclusively through the service role; the only
-- thing authenticated clients may read is their OWN membership rows, which the
-- realtime authorization policy needs.
--
-- NOTE: private channels also require disabling "Allow public access" in the
-- project's Realtime settings (Dashboard -> Realtime -> Settings).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Let authenticated users read THEIR OWN membership rows.
-- The realtime.messages policy below runs as the connecting (authenticated) user
-- and needs to see the user's membership to authorize a topic. Only own rows are
-- exposed; no other chat data is readable by the client roles.
-- -----------------------------------------------------------------------------
drop policy if exists "members read own membership" on public.chat_channel_members;
create policy "members read own membership"
  on public.chat_channel_members for select to authenticated
  using ( (select auth.uid()) = user_id );

grant select on public.chat_channel_members to authenticated;

-- -----------------------------------------------------------------------------
-- Realtime authorization: allow joining/receiving on a private chat:<id> topic
-- only when the current user is a member of that channel.
-- -----------------------------------------------------------------------------
drop policy if exists "workspace members receive chat broadcasts" on realtime.messages;
create policy "workspace members receive chat broadcasts"
  on realtime.messages for select to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and exists (
      select 1
      from public.chat_channel_members m
      where m.user_id = (select auth.uid())
        and 'chat:' || m.channel_id::text = (select realtime.topic())
    )
  );

-- -----------------------------------------------------------------------------
-- Broadcast new messages. The payload carries the row so the client can render
-- it without a server round-trip (it resolves the author name from the members
-- directory it already has).
-- -----------------------------------------------------------------------------
create or replace function public.chat_messages_broadcast()
returns trigger
security definer set search_path = ''
as $$
begin
  perform realtime.send(
    jsonb_build_object(
      'id', new.id,
      'channel_id', new.channel_id,
      'user_id', new.user_id,
      'body', new.body,
      'created_at', new.created_at,
      'updated_at', new.updated_at
    ),
    'INSERT',
    'chat:' || new.channel_id::text,
    true -- private
  );
  return null;
end;
$$ language plpgsql;

drop trigger if exists chat_messages_broadcast_trg on public.chat_messages;
create trigger chat_messages_broadcast_trg
  after insert on public.chat_messages
  for each row execute function public.chat_messages_broadcast();

-- -----------------------------------------------------------------------------
-- Broadcast likes (insert + delete). chat_message_likes has no channel_id, so
-- look it up from the parent message and broadcast to that channel's topic.
-- -----------------------------------------------------------------------------
create or replace function public.chat_message_likes_broadcast()
returns trigger
security definer set search_path = ''
as $$
declare
  v_channel uuid;
  v_message uuid;
  v_user    uuid;
begin
  if tg_op = 'DELETE' then
    v_message := old.message_id;
    v_user := old.user_id;
  else
    v_message := new.message_id;
    v_user := new.user_id;
  end if;

  select channel_id into v_channel
  from public.chat_messages
  where id = v_message;

  if v_channel is null then
    return null;
  end if;

  perform realtime.send(
    jsonb_build_object(
      'messageId', v_message,
      'userId', v_user,
      'op', lower(tg_op)
    ),
    'like',
    'chat:' || v_channel::text,
    true -- private
  );
  return null;
end;
$$ language plpgsql;

drop trigger if exists chat_message_likes_broadcast_trg on public.chat_message_likes;
create trigger chat_message_likes_broadcast_trg
  after insert or delete on public.chat_message_likes
  for each row execute function public.chat_message_likes_broadcast();
