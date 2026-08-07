-- =============================================================================
-- Notifications
--
-- In-app inbox for comment replies/likes and library chapter alerts.
-- user_id is the recipient. Rows are written by server actions with the service
-- role; members may only read their own and mark them read.
--
-- Types:
--   reply | like              — comment activity (comment_id / reply_id)
--   chapter_published         — new paid/locked chapter on a bookmarked novel
--   chapter_released          — chapter is free to read (now or via unlock_at)
-- =============================================================================

-- Upgrade path if an earlier comment_notifications table is still present.
do $$
begin
  if to_regclass('public.comment_notifications') is not null
     and to_regclass('public.notifications') is null then
    alter table public.comment_notifications rename to notifications;
  end if;
end $$;

create table if not exists public.notifications (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references public.profiles (id) on delete cascade,
  actor_id       uuid        references public.profiles (id) on delete cascade,
  type           text        not null,
  comment_id     uuid        references public.novel_comments (id) on delete cascade,
  reply_id       uuid        references public.novel_comments (id) on delete cascade,
  novel_id       uuid        references public.novels (id) on delete cascade,
  chapter_number integer     check (chapter_number is null or chapter_number > 0),
  read_at        timestamptz,
  created_at     timestamptz not null default now()
);

-- Align columns when upgrading from the comment-only shape.
alter table public.notifications
  alter column comment_id drop not null;
alter table public.notifications
  alter column actor_id drop not null;
alter table public.notifications
  add column if not exists novel_id uuid references public.novels (id) on delete cascade;
alter table public.notifications
  add column if not exists chapter_number integer
    check (chapter_number is null or chapter_number > 0);
alter table public.notifications
  add column if not exists dismissed_at timestamptz;

alter table public.notifications
  drop constraint if exists comment_notifications_type_check;
alter table public.notifications
  drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in ('reply', 'like', 'chapter_published', 'chapter_released'));

-- Prefer notifications_* names for FKs (PostgREST join hints).
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'comment_notifications_actor_id_fkey'
  ) then
    alter table public.notifications
      rename constraint comment_notifications_actor_id_fkey
      to notifications_actor_id_fkey;
  end if;
  if exists (
    select 1 from pg_constraint
    where conname = 'comment_notifications_comment_id_fkey'
  ) then
    alter table public.notifications
      rename constraint comment_notifications_comment_id_fkey
      to notifications_comment_id_fkey;
  end if;
  if exists (
    select 1 from pg_constraint
    where conname = 'comment_notifications_reply_id_fkey'
  ) then
    alter table public.notifications
      rename constraint comment_notifications_reply_id_fkey
      to notifications_reply_id_fkey;
  end if;
  if exists (
    select 1 from pg_constraint
    where conname = 'comment_notifications_user_id_fkey'
  ) then
    alter table public.notifications
      rename constraint comment_notifications_user_id_fkey
      to notifications_user_id_fkey;
  end if;
  if exists (
    select 1 from pg_constraint
    where conname = 'comment_notifications_pkey'
  ) then
    alter table public.notifications
      rename constraint comment_notifications_pkey
      to notifications_pkey;
  end if;
end $$;

drop index if exists public.comment_notifications_recipient_idx;
drop index if exists public.comment_notifications_unread_idx;
drop index if exists public.comment_notifications_dedupe_idx;
drop index if exists public.notifications_recipient_idx;
drop index if exists public.notifications_unread_idx;
drop index if exists public.notifications_novel_idx;
drop index if exists public.notifications_dedupe_idx;

create index notifications_recipient_idx
  on public.notifications (user_id, created_at desc);

create index notifications_unread_idx
  on public.notifications (user_id)
  where read_at is null and dismissed_at is null;

create index notifications_novel_idx
  on public.notifications (novel_id, chapter_number)
  where novel_id is not null;

create unique index notifications_dedupe_idx
  on public.notifications (
    user_id,
    coalesce(actor_id::text, ''),
    type,
    coalesce(comment_id::text, ''),
    coalesce(reply_id::text, ''),
    coalesce(novel_id::text, ''),
    coalesce(chapter_number, 0)
  );

alter table public.notifications enable row level security;

drop policy if exists "Members read their own comment notifications"
  on public.notifications;
drop policy if exists "Members mark their own comment notifications read"
  on public.notifications;
drop policy if exists "Members read their own notifications"
  on public.notifications;
drop policy if exists "Members mark their own notifications read"
  on public.notifications;

create policy "Members read their own notifications"
  on public.notifications for select to authenticated
  using ( (select auth.uid()) = user_id );

create policy "Members mark their own notifications read"
  on public.notifications for update to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

drop policy if exists "Members delete their own notifications"
  on public.notifications;
create policy "Members delete their own notifications"
  on public.notifications for delete to authenticated
  using ( (select auth.uid()) = user_id );

revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at, dismissed_at) on public.notifications to authenticated;
grant delete on public.notifications to authenticated;
