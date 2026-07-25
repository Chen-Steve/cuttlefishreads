-- =============================================================================
-- Originals forum
--
-- Run this after schema.sql (profiles). Adds a traditional discussion board for
-- the Originals surface:
--   * forum_sections      headings that group categories on the board index
--   * forum_categories    curated by master admins (ADMIN_EMAILS)
--   * forum_threads       started by any signed-in member
--   * forum_posts         the opening post plus every reply
--   * forum_reactions     one emoji per member per post
--   * forum_notifications inbox rows for replies and reactions
--
-- Master admin is an env allowlist rather than a database role, so moderation
-- writes (pin, lock, remove, category CRUD) run through server actions with the
-- service role. Client-facing policies below only cover member-owned rows.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- forum_sections
-- -----------------------------------------------------------------------------
create table if not exists public.forum_sections (
  id         uuid        primary key default gen_random_uuid(),
  slug       text        not null unique,
  name       text        not null check (char_length(trim(name)) > 0),
  sort_order integer     not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists forum_sections_sort_order_idx
  on public.forum_sections (sort_order, name);

alter table public.forum_sections enable row level security;

drop policy if exists "Forum sections are publicly readable" on public.forum_sections;
create policy "Forum sections are publicly readable"
  on public.forum_sections for select to anon, authenticated
  using ( true );

-- -----------------------------------------------------------------------------
-- forum_categories
-- admin_only_threads = true restricts new threads to master admins (e.g. news).
-- section_id is nullable so removing a section leaves its categories on the
-- board, ungrouped, rather than taking their threads down with it.
-- -----------------------------------------------------------------------------
create table if not exists public.forum_categories (
  id                 uuid        primary key default gen_random_uuid(),
  slug               text        not null unique,
  name               text        not null check (char_length(trim(name)) > 0),
  description        text        not null default '',
  sort_order         integer     not null default 0,
  admin_only_threads boolean     not null default false,
  section_id         uuid        references public.forum_sections (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists forum_categories_sort_order_idx
  on public.forum_categories (sort_order, name);
create index if not exists forum_categories_section_idx
  on public.forum_categories (section_id, sort_order, name);

alter table public.forum_categories enable row level security;

drop policy if exists "Forum categories are publicly readable" on public.forum_categories;
create policy "Forum categories are publicly readable"
  on public.forum_categories for select to anon, authenticated
  using ( true );

-- -----------------------------------------------------------------------------
-- forum_threads
-- reply_count and last_post_at are denormalized so category and thread lists
-- stay a single query; both are maintained by forum_sync_thread_activity().
-- deleted_at soft-hides a thread without losing its history.
-- -----------------------------------------------------------------------------
create table if not exists public.forum_threads (
  id           uuid        primary key default gen_random_uuid(),
  category_id  uuid        not null references public.forum_categories (id) on delete cascade,
  author_id    uuid        not null references public.profiles (id) on delete cascade,
  title        text        not null check (char_length(trim(title)) between 1 and 160),
  is_pinned    boolean     not null default false,
  is_locked    boolean     not null default false,
  reply_count  integer     not null default 0,
  last_post_at timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

create index if not exists forum_threads_category_activity_idx
  on public.forum_threads (category_id, is_pinned desc, last_post_at desc);
create index if not exists forum_threads_author_idx
  on public.forum_threads (author_id, created_at desc);
create index if not exists forum_threads_activity_idx
  on public.forum_threads (last_post_at desc);

alter table public.forum_threads enable row level security;

drop policy if exists "Threads are publicly readable" on public.forum_threads;
create policy "Threads are publicly readable"
  on public.forum_threads for select to anon, authenticated
  using ( deleted_at is null );

-- Members may open threads anywhere except admin-only categories.
drop policy if exists "Members can start threads" on public.forum_threads;
create policy "Members can start threads"
  on public.forum_threads for insert to authenticated
  with check (
    (select auth.uid()) = author_id
    and exists (
      select 1
        from public.forum_categories c
       where c.id = category_id
         and c.admin_only_threads = false
    )
  );

-- Column grants below limit this to title/updated_at/deleted_at, so authors can
-- rename or withdraw their own thread but never pin or unlock it. Locking a
-- thread (moderator action) also freezes it for its author.
drop policy if exists "Authors can edit their own threads" on public.forum_threads;
create policy "Authors can edit their own threads"
  on public.forum_threads for update to authenticated
  using ( (select auth.uid()) = author_id and is_locked = false )
  with check ( (select auth.uid()) = author_id );

-- -----------------------------------------------------------------------------
-- forum_posts
-- The oldest post in a thread is the opening post; the rest are replies.
-- -----------------------------------------------------------------------------
create table if not exists public.forum_posts (
  id         uuid        primary key default gen_random_uuid(),
  thread_id  uuid        not null references public.forum_threads (id) on delete cascade,
  author_id  uuid        not null references public.profiles (id) on delete cascade,
  body       text        not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists forum_posts_thread_idx
  on public.forum_posts (thread_id, created_at);
create index if not exists forum_posts_author_idx
  on public.forum_posts (author_id, created_at desc);

alter table public.forum_posts enable row level security;

drop policy if exists "Posts are publicly readable" on public.forum_posts;
create policy "Posts are publicly readable"
  on public.forum_posts for select to anon, authenticated
  using ( deleted_at is null );

drop policy if exists "Members can post in open threads" on public.forum_posts;
create policy "Members can post in open threads"
  on public.forum_posts for insert to authenticated
  with check (
    (select auth.uid()) = author_id
    and exists (
      select 1
        from public.forum_threads t
       where t.id = thread_id
         and t.is_locked = false
         and t.deleted_at is null
    )
  );

drop policy if exists "Authors can edit their own posts" on public.forum_posts;
create policy "Authors can edit their own posts"
  on public.forum_posts for update to authenticated
  using (
    (select auth.uid()) = author_id
    and exists (
      select 1
        from public.forum_threads t
       where t.id = thread_id
         and t.is_locked = false
    )
  )
  with check ( (select auth.uid()) = author_id );

-- -----------------------------------------------------------------------------
-- forum_reactions
-- One row per (post, member); changing an emoji upserts the same row.
-- -----------------------------------------------------------------------------
create table if not exists public.forum_reactions (
  id         uuid        primary key default gen_random_uuid(),
  post_id    uuid        not null references public.forum_posts (id) on delete cascade,
  user_id    uuid        not null references public.profiles (id) on delete cascade,
  emoji      text        not null check (emoji in ('like', 'love', 'laugh', 'insightful')),
  created_at timestamptz not null default now(),

  unique (post_id, user_id)
);

create index if not exists forum_reactions_post_idx
  on public.forum_reactions (post_id);

alter table public.forum_reactions enable row level security;

drop policy if exists "Reactions are publicly readable" on public.forum_reactions;
create policy "Reactions are publicly readable"
  on public.forum_reactions for select to anon, authenticated
  using ( true );

drop policy if exists "Members can react to posts" on public.forum_reactions;
create policy "Members can react to posts"
  on public.forum_reactions for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
        from public.forum_posts p
       where p.id = post_id
         and p.deleted_at is null
    )
  );

drop policy if exists "Members can change their own reaction" on public.forum_reactions;
create policy "Members can change their own reaction"
  on public.forum_reactions for update to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

drop policy if exists "Members can remove their own reaction" on public.forum_reactions;
create policy "Members can remove their own reaction"
  on public.forum_reactions for delete to authenticated
  using ( (select auth.uid()) = user_id );

-- -----------------------------------------------------------------------------
-- forum_notifications
-- user_id is the recipient. Rows are written by server actions with the service
-- role; members may only read their own and mark them read.
-- -----------------------------------------------------------------------------
create table if not exists public.forum_notifications (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles (id) on delete cascade,
  actor_id   uuid        not null references public.profiles (id) on delete cascade,
  type       text        not null check (type in ('reply', 'reaction')),
  thread_id  uuid        not null references public.forum_threads (id) on delete cascade,
  post_id    uuid        not null references public.forum_posts (id) on delete cascade,
  emoji      text        check (emoji is null or emoji in ('like', 'love', 'laugh', 'insightful')),
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists forum_notifications_recipient_idx
  on public.forum_notifications (user_id, created_at desc);
create index if not exists forum_notifications_unread_idx
  on public.forum_notifications (user_id)
  where read_at is null;

-- Re-reacting with an emoji the author was already told about must not create a
-- second inbox row; inserts use "on conflict do nothing" against this index.
create unique index if not exists forum_notifications_dedupe_idx
  on public.forum_notifications (user_id, actor_id, type, post_id, coalesce(emoji, ''));

alter table public.forum_notifications enable row level security;

drop policy if exists "Members read their own notifications" on public.forum_notifications;
create policy "Members read their own notifications"
  on public.forum_notifications for select to authenticated
  using ( (select auth.uid()) = user_id );

-- Column grants limit this to read_at.
drop policy if exists "Members mark their own notifications read" on public.forum_notifications;
create policy "Members mark their own notifications read"
  on public.forum_notifications for update to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

-- -----------------------------------------------------------------------------
-- Thread activity counters
--
-- SECURITY DEFINER because the member writing a reply has no update rights on
-- someone else's thread row. EXECUTE is revoked from the API roles so it is not
-- exposed as an RPC endpoint; a trigger still fires it, because Postgres checks
-- that privilege when the trigger is created rather than when it runs.
-- -----------------------------------------------------------------------------
create or replace function public.forum_sync_thread_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_thread uuid;
begin
  if (tg_op = 'DELETE') then
    target_thread := old.thread_id;
  else
    target_thread := new.thread_id;
  end if;

  update public.forum_threads t
     set reply_count  = greatest(stats.post_count - 1, 0),
         last_post_at = coalesce(stats.last_created_at, t.created_at)
    from (
      select count(*) as post_count, max(created_at) as last_created_at
        from public.forum_posts
       where thread_id = target_thread
         and deleted_at is null
    ) as stats
   where t.id = target_thread;

  return null;
end;
$$;

revoke all on function public.forum_sync_thread_activity() from public, anon, authenticated;

drop trigger if exists forum_posts_sync_thread on public.forum_posts;
create trigger forum_posts_sync_thread
  after insert or update or delete on public.forum_posts
  for each row execute function public.forum_sync_thread_activity();

-- -----------------------------------------------------------------------------
-- forum_category_overview
-- Board index needs per-category totals and the latest thread in one round
-- trip. security_invoker keeps the base tables' RLS in force.
-- -----------------------------------------------------------------------------
drop view if exists public.forum_category_overview;

create view public.forum_category_overview
with (security_invoker = true) as
  select
    c.id,
    c.slug,
    c.name,
    c.description,
    c.sort_order,
    c.admin_only_threads,
    c.section_id,
    s.slug                          as section_slug,
    s.name                          as section_name,
    s.sort_order                    as section_order,
    coalesce(stats.thread_count, 0) as thread_count,
    coalesce(stats.reply_count, 0)  as reply_count,
    stats.last_post_at,
    latest.id                       as latest_thread_id,
    latest.title                    as latest_thread_title
  from public.forum_categories c
  left join public.forum_sections s on s.id = c.section_id
  left join lateral (
    select
      count(*)             as thread_count,
      sum(t.reply_count)   as reply_count,
      max(t.last_post_at)  as last_post_at
    from public.forum_threads t
    where t.category_id = c.id
      and t.deleted_at is null
  ) stats on true
  left join lateral (
    select t.id, t.title
    from public.forum_threads t
    where t.category_id = c.id
      and t.deleted_at is null
    order by t.last_post_at desc
    limit 1
  ) latest on true;

-- -----------------------------------------------------------------------------
-- Data API grants
--
-- Supabase's default privileges hand the API roles full table access, which
-- would make the column-scoped UPDATE grants below meaningless. Revoke first,
-- then grant back only what members need: without this a member could flip
-- is_pinned or is_locked on their own thread.
-- -----------------------------------------------------------------------------
revoke all on public.forum_sections from anon, authenticated;
revoke all on public.forum_categories from anon, authenticated;
revoke all on public.forum_category_overview from anon, authenticated;
revoke all on public.forum_threads from anon, authenticated;
revoke all on public.forum_posts from anon, authenticated;
revoke all on public.forum_reactions from anon, authenticated;
revoke all on public.forum_notifications from anon, authenticated;

grant select on public.forum_sections to anon, authenticated;
grant select on public.forum_categories to anon, authenticated;
grant select on public.forum_category_overview to anon, authenticated;

grant select on public.forum_threads to anon, authenticated;
grant insert on public.forum_threads to authenticated;
grant update (title, updated_at, deleted_at) on public.forum_threads to authenticated;

grant select on public.forum_posts to anon, authenticated;
grant insert on public.forum_posts to authenticated;
grant update (body, updated_at, deleted_at) on public.forum_posts to authenticated;

grant select on public.forum_reactions to anon, authenticated;
grant insert, delete on public.forum_reactions to authenticated;
grant update (emoji, created_at) on public.forum_reactions to authenticated;

grant select on public.forum_notifications to authenticated;
grant update (read_at) on public.forum_notifications to authenticated;

-- -----------------------------------------------------------------------------
-- Seed sections and categories
-- Editable afterwards from /forum/manage.
-- -----------------------------------------------------------------------------
insert into public.forum_sections (slug, name, sort_order)
values
  ('site',    'Forum',                10),
  ('authors', 'Authors',              20),
  ('artists', 'Artists',              30),
  ('readers', 'Readers',              40),
  ('general', 'General',              50)
on conflict (slug) do nothing;

insert into public.forum_categories
  (slug, name, description, sort_order, admin_only_threads, section_id)
select v.slug, v.name, v.description, v.sort_order, v.admin_only, s.id
  from (values
    ('announcements', 'Announcements',
     'News and updates from the Cuttlefish Originals team.', 10, true, 'site'),
    ('originals-discussion', 'Originals Discussion',
     'Talk about the site itself, and how you are using it.', 20, false, 'site'),
    ('forum-rules', 'Forum Rules',
     'How we expect members to treat each other here.', 30, true, 'site'),
    ('feature-requests', 'Feature Requests',
     'Ideas for things you would like the site to do.', 40, false, 'site'),
    ('bug-reports', 'Bug Reports',
     'Something broken? Tell us what happened and where.', 50, false, 'site'),

    ('author-general', 'Author General',
     'A common room for the people writing the stories.', 10, false, 'authors'),
    ('writing-tips', 'Discussions & Writing Tips',
     'Craft, process, and the habits that keep a serial moving.', 20, false, 'authors'),
    ('story-feedback', 'Story Feedback',
     'Share a chapter or a draft and ask for honest reader notes.', 30, false, 'authors'),
    ('writing-prompts', 'Writing Prompts',
     'Post a prompt, answer one, and see where it goes.', 40, false, 'authors'),

    ('artist-general', 'Artist General',
     'For cover artists, illustrators, and everyone drawing for stories.', 10, false, 'artists'),
    ('creations', 'Creations',
     'Show off the work you have finished.', 20, false, 'artists'),
    ('art-requests', 'Requests',
     'Looking for a cover or some character art? Ask here.', 30, false, 'artists'),

    ('reader-general', 'Reader General',
     'For everyone on the other side of the page.', 10, false, 'readers'),
    ('latest-chapter-discussion', 'Latest Chapter Discussion',
     'React to the chapter that just went up. Expect spoilers.', 20, false, 'readers'),
    ('looking-for', 'I''m Looking For...',
     'Describe the story you want and let the shelf-diggers help.', 30, false, 'readers'),

    ('general-chat', 'General Chat',
     'Anything that does not belong in one of the rooms above.', 10, false, 'general'),
    ('gaming-discussion', 'Gaming Discussion',
     'What you are playing when you should be reading.', 20, false, 'general'),
    ('community-games', 'Community Games',
     'Forum games, round robins, and other group nonsense.', 30, false, 'general')
  ) as v (slug, name, description, sort_order, admin_only, section_slug)
  join public.forum_sections s on s.slug = v.section_slug
on conflict (slug) do nothing;
