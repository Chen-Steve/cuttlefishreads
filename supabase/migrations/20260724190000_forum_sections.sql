-- =============================================================================
-- Forum sections
--
-- Groups categories under headings on the board index (Authors, Readers, ...),
-- and reseeds the category set to match. Categories keep their own sort_order
-- within a section.
-- =============================================================================

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

-- Nullable: removing a section leaves its categories on the board, ungrouped,
-- rather than taking their threads down with it.
alter table public.forum_categories
  add column if not exists section_id uuid
  references public.forum_sections (id) on delete set null;

create index if not exists forum_categories_section_idx
  on public.forum_categories (section_id, sort_order, name);

-- -----------------------------------------------------------------------------
-- forum_category_overview gains the section columns. Dropped and recreated
-- because create or replace cannot insert columns before existing ones.
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

revoke all on public.forum_sections from anon, authenticated;
revoke all on public.forum_category_overview from anon, authenticated;

grant select on public.forum_sections to anon, authenticated;
grant select on public.forum_category_overview to anon, authenticated;

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
on conflict (slug) do update
  set name       = excluded.name,
      sort_order = excluded.sort_order,
      updated_at = now();

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
on conflict (slug) do update
  set name               = excluded.name,
      description        = excluded.description,
      sort_order         = excluded.sort_order,
      admin_only_threads = excluded.admin_only_threads,
      section_id         = excluded.section_id,
      updated_at         = now();

-- Retire categories from the first seed that this one replaces, but only while
-- they are empty: a category holding threads stays put and is filed under
-- General for an admin to sort out.
delete from public.forum_categories c
 where c.slug in ('general', 'writing-craft', 'feedback', 'series-talk', 'off-topic')
   and not exists (
     select 1 from public.forum_threads t where t.category_id = c.id
   );

update public.forum_categories
   set section_id = (select id from public.forum_sections where slug = 'general'),
       updated_at = now()
 where section_id is null;
