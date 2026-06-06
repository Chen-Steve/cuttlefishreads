-- =============================================================================
-- Novel comments and likes
--
-- Run this after schema.sql, novels.sql, and bookmarks.sql. Adds per-novel
-- comments (optionally scoped to a chapter) and a like table.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- novel_comments
-- chapter_number NULL = general novel comment; integer = chapter-specific.
-- -----------------------------------------------------------------------------
create table if not exists public.novel_comments (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references public.profiles (id) on delete cascade,
  novel_id       uuid        not null references public.novels (id) on delete cascade,
  novel_slug     text        not null,
  chapter_number integer     check (chapter_number is null or chapter_number > 0),
  body           text        not null check (char_length(trim(body)) > 0),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists novel_comments_novel_slug_idx
  on public.novel_comments (novel_slug);
create index if not exists novel_comments_novel_slug_chapter_idx
  on public.novel_comments (novel_slug, chapter_number);
create index if not exists novel_comments_user_id_idx
  on public.novel_comments (user_id);
create index if not exists novel_comments_created_at_idx
  on public.novel_comments (created_at desc);

alter table public.novel_comments enable row level security;

drop policy if exists "Comments are publicly readable" on public.novel_comments;
create policy "Comments are publicly readable"
  on public.novel_comments for select to anon, authenticated
  using ( true );

drop policy if exists "Users can create their own comments" on public.novel_comments;
create policy "Users can create their own comments"
  on public.novel_comments for insert to authenticated
  with check ( (select auth.uid()) = user_id );

drop policy if exists "Users can update their own comments" on public.novel_comments;
create policy "Users can update their own comments"
  on public.novel_comments for update to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

drop policy if exists "Users can delete their own comments" on public.novel_comments;
create policy "Users can delete their own comments"
  on public.novel_comments for delete to authenticated
  using ( (select auth.uid()) = user_id );

-- -----------------------------------------------------------------------------
-- novel_comment_likes
-- One like per (user, comment).
-- -----------------------------------------------------------------------------
create table if not exists public.novel_comment_likes (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles (id) on delete cascade,
  comment_id uuid        not null references public.novel_comments (id) on delete cascade,
  created_at timestamptz not null default now(),

  unique (user_id, comment_id)
);

create index if not exists novel_comment_likes_comment_id_idx
  on public.novel_comment_likes (comment_id);

alter table public.novel_comment_likes enable row level security;

drop policy if exists "Comment likes are publicly readable" on public.novel_comment_likes;
create policy "Comment likes are publicly readable"
  on public.novel_comment_likes for select to anon, authenticated
  using ( true );

drop policy if exists "Users can like others comments" on public.novel_comment_likes;
drop policy if exists "Users can like comments" on public.novel_comment_likes;
create policy "Users can like comments"
  on public.novel_comment_likes for insert to authenticated
  with check ( (select auth.uid()) = user_id );

drop policy if exists "Users can remove their own likes" on public.novel_comment_likes;
create policy "Users can remove their own likes"
  on public.novel_comment_likes for delete to authenticated
  using ( (select auth.uid()) = user_id );

-- -----------------------------------------------------------------------------
-- Data API grants
-- -----------------------------------------------------------------------------
grant select on public.novel_comments to anon, authenticated;
grant insert, update, delete on public.novel_comments to authenticated;

grant select on public.novel_comment_likes to anon, authenticated;
grant insert, delete on public.novel_comment_likes to authenticated;
