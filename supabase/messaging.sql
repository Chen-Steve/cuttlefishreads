-- =============================================================================
-- Workspace messaging (channels + direct messages)
--
-- Run this after schema.sql, novels.sql and translators.sql. Adds an internal
-- chat for the /admin workspace so the master admin and approved translators
-- can talk in shared channels and in 1:1 direct messages, and like each
-- other's messages.
--
-- Access model:
--   * Group channels (kind = 'channel') are visible to EVERY workspace member.
--   * Direct messages (kind = 'dm') are visible only to their two members.
--   * Master admin is an env allowlist (ADMIN_EMAILS), not a DB column, so
--     workspace membership can't be expressed cleanly in RLS. Every read and
--     write therefore happens server-side via the service role, behind
--     getAdminAccess() checks — exactly like translator_applications and
--     novel_views. These tables expose NO client (anon/authenticated) policies.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- chat_channels
-- A group channel (name set, dm_key null) or a direct message (name null,
-- dm_key set). dm_key is the two member ids sorted and joined with ':' so a
-- pair of people can only ever have one DM channel between them.
-- -----------------------------------------------------------------------------
create table if not exists public.chat_channels (
  id         uuid        primary key default gen_random_uuid(),
  kind       text        not null check (kind in ('channel', 'dm')),
  name       text        check (name is null or char_length(trim(name)) > 0),
  dm_key     text        unique,
  created_by uuid        references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),

  -- A group channel must have a name and no dm_key; a DM is the reverse.
  constraint chat_channels_shape check (
    (kind = 'channel' and name is not null and dm_key is null) or
    (kind = 'dm'      and name is null     and dm_key is not null)
  )
);

create index if not exists chat_channels_kind_idx
  on public.chat_channels (kind);

alter table public.chat_channels enable row level security;
-- No client policies: all access is server-side via the service role.

-- -----------------------------------------------------------------------------
-- chat_channel_members
-- Membership rows for direct messages (the two participants). Group channels
-- are open to all workspace members and don't need rows here.
-- -----------------------------------------------------------------------------
create table if not exists public.chat_channel_members (
  channel_id uuid        not null references public.chat_channels (id) on delete cascade,
  user_id    uuid        not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),

  primary key (channel_id, user_id)
);

create index if not exists chat_channel_members_user_idx
  on public.chat_channel_members (user_id);

alter table public.chat_channel_members enable row level security;

-- -----------------------------------------------------------------------------
-- chat_messages
-- One row per message in a channel or DM.
-- -----------------------------------------------------------------------------
create table if not exists public.chat_messages (
  id         uuid        primary key default gen_random_uuid(),
  channel_id uuid        not null references public.chat_channels (id) on delete cascade,
  user_id    uuid        not null references public.profiles (id) on delete cascade,
  body       text        not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chat_messages_channel_idx
  on public.chat_messages (channel_id, created_at);

alter table public.chat_messages enable row level security;

-- -----------------------------------------------------------------------------
-- chat_message_likes
-- One like per (user, message).
-- -----------------------------------------------------------------------------
create table if not exists public.chat_message_likes (
  id         uuid        primary key default gen_random_uuid(),
  message_id uuid        not null references public.chat_messages (id) on delete cascade,
  user_id    uuid        not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),

  unique (message_id, user_id)
);

create index if not exists chat_message_likes_message_idx
  on public.chat_message_likes (message_id);

alter table public.chat_message_likes enable row level security;

-- -----------------------------------------------------------------------------
-- Seed a default "general" channel everyone in the workspace shares.
-- -----------------------------------------------------------------------------
insert into public.chat_channels (kind, name)
select 'channel', 'general'
where not exists (
  select 1 from public.chat_channels where kind = 'channel' and name = 'general'
);

-- -----------------------------------------------------------------------------
-- Privileges
-- These tables are server-only. The service role (Supabase secret key) reads
-- and writes them behind getAdminAccess() checks; no grants to anon/authenticated.
-- -----------------------------------------------------------------------------
grant all on public.chat_channels        to service_role;
grant all on public.chat_channel_members to service_role;
grant all on public.chat_messages        to service_role;
grant all on public.chat_message_likes   to service_role;
