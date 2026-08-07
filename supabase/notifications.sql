-- =============================================================================
-- Notifications
--
-- Run this after schema.sql, novels.sql, bookmarks.sql, and comments.sql.
-- In-app inbox for comment replies/likes and library chapter alerts.
-- user_id is the recipient. Rows are written by server actions with the service
-- role; members may only read, mark read, and dismiss their own rows.
--
-- Types:
--   reply | like              — comment activity (comment_id / reply_id)
--   chapter_published         — new paid/locked chapter on a bookmarked novel
--   chapter_released          — chapter is free to read (now or via unlock_at)
-- =============================================================================

create table if not exists public.notifications (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references public.profiles (id) on delete cascade,
  actor_id       uuid        references public.profiles (id) on delete cascade,
  type           text        not null
                 check (type in ('reply', 'like', 'chapter_published', 'chapter_released')),
  comment_id     uuid        references public.novel_comments (id) on delete cascade,
  reply_id       uuid        references public.novel_comments (id) on delete cascade,
  novel_id       uuid        references public.novels (id) on delete cascade,
  chapter_number integer     check (chapter_number is null or chapter_number > 0),
  read_at        timestamptz,
  dismissed_at   timestamptz,
  created_at     timestamptz not null default now()
);

create index if not exists notifications_recipient_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_unread_idx
  on public.notifications (user_id)
  where read_at is null and dismissed_at is null;

create index if not exists notifications_novel_idx
  on public.notifications (novel_id, chapter_number)
  where novel_id is not null;

create unique index if not exists notifications_dedupe_idx
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

drop policy if exists "Members read their own notifications" on public.notifications;
create policy "Members read their own notifications"
  on public.notifications for select to authenticated
  using ( (select auth.uid()) = user_id );

drop policy if exists "Members mark their own notifications read" on public.notifications;
create policy "Members mark their own notifications read"
  on public.notifications for update to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

drop policy if exists "Members delete their own notifications" on public.notifications;
create policy "Members delete their own notifications"
  on public.notifications for delete to authenticated
  using ( (select auth.uid()) = user_id );

revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at, dismissed_at) on public.notifications to authenticated;
grant delete on public.notifications to authenticated;
