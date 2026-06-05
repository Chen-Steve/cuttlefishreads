-- =============================================================================
-- Bookmarks (user library)
--
-- Run this after schema.sql and novels.sql. It adds a per-user bookmark table
-- that backs the "My library" page — each row marks a novel the user is
-- following.
--
-- Unlike coin_purchases / chapter_unlocks (which are written server-side only),
-- bookmarks are owned and managed directly by the user, so RLS exposes
-- select / insert / delete to the row owner.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- bookmarks
-- One row per (user, novel). novel_slug mirrors the convention used by
-- chapter_unlocks so lookups stay consistent across the app.
-- -----------------------------------------------------------------------------
create table if not exists public.bookmarks (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users (id) on delete cascade,
  novel_id   uuid        not null references public.novels (id) on delete cascade,
  novel_slug text        not null,
  created_at timestamptz not null default now(),

  unique (user_id, novel_id)  -- a novel can only be bookmarked once per user
);

create index if not exists bookmarks_user_id_idx on public.bookmarks (user_id);
create index if not exists bookmarks_novel_id_idx on public.bookmarks (novel_id);

alter table public.bookmarks enable row level security;

-- Users can read their own bookmarks.
drop policy if exists "Users can view their own bookmarks" on public.bookmarks;
create policy "Users can view their own bookmarks"
  on public.bookmarks for select to authenticated
  using ( (select auth.uid()) = user_id );

-- Users can add bookmarks for themselves.
drop policy if exists "Users can create their own bookmarks" on public.bookmarks;
create policy "Users can create their own bookmarks"
  on public.bookmarks for insert to authenticated
  with check ( (select auth.uid()) = user_id );

-- Users can remove their own bookmarks.
drop policy if exists "Users can delete their own bookmarks" on public.bookmarks;
create policy "Users can delete their own bookmarks"
  on public.bookmarks for delete to authenticated
  using ( (select auth.uid()) = user_id );


-- -----------------------------------------------------------------------------
-- Data API grants
-- -----------------------------------------------------------------------------
grant select, insert, delete on public.bookmarks to authenticated;
