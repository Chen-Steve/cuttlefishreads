-- =============================================================================
-- Reading engagement (in-house metrics)
--
-- Source of truth for unique readers, chapter progress, library adds, and
-- page views used on public novel pages and author dashboards.
-- Google Analytics remains for traffic sources / demographics / campaigns.
--
-- Reader = unique logged-in account that spends >= 30s actively reading a
-- chapter OR reaches >= 50% scroll depth. Counted once per novel.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Denormalized counters on novels (fast public reads / rankings)
-- -----------------------------------------------------------------------------
alter table public.novels
  add column if not exists view_count bigint not null default 0;

alter table public.novels
  add column if not exists reader_count bigint not null default 0;

alter table public.novels
  add column if not exists library_add_count bigint not null default 0;

comment on column public.novels.view_count is
  'Total in-house chapter page views (not unique).';
comment on column public.novels.reader_count is
  'Unique logged-in readers who qualified (30s active or 50% scroll).';
comment on column public.novels.library_add_count is
  'Current bookmark count; maintained by bookmarks trigger.';

-- Backfill library adds from existing bookmarks.
update public.novels n
set library_add_count = coalesce(b.cnt, 0)
from (
  select novel_id, count(*)::bigint as cnt
  from public.bookmarks
  group by novel_id
) b
where n.id = b.novel_id;

-- -----------------------------------------------------------------------------
-- novel_readers — one row per (user, novel) once they qualify
-- -----------------------------------------------------------------------------
create table if not exists public.novel_readers (
  id                    uuid        primary key default gen_random_uuid(),
  user_id               uuid        not null references auth.users (id) on delete cascade,
  novel_id              uuid        not null references public.novels (id) on delete cascade,
  novel_slug            text        not null,
  first_chapter_number  integer     not null check (first_chapter_number > 0),
  qualify_reason        text        not null check (qualify_reason in ('time', 'scroll')),
  qualified_at          timestamptz not null default now(),

  unique (user_id, novel_id)
);

create index if not exists novel_readers_novel_id_idx
  on public.novel_readers (novel_id);

create index if not exists novel_readers_novel_slug_idx
  on public.novel_readers (novel_slug);

alter table public.novel_readers enable row level security;

-- Readers can see their own qualification rows (optional / future UI).
drop policy if exists "Users can view their own novel_readers" on public.novel_readers;
create policy "Users can view their own novel_readers"
  on public.novel_readers for select to authenticated
  using ( (select auth.uid()) = user_id );

-- No direct client inserts — use qualify_novel_reader().

grant select on public.novel_readers to authenticated;

-- -----------------------------------------------------------------------------
-- chapter_reading_progress — per-chapter progress / completions
-- -----------------------------------------------------------------------------
create table if not exists public.chapter_reading_progress (
  id              uuid           primary key default gen_random_uuid(),
  user_id         uuid           not null references auth.users (id) on delete cascade,
  novel_id        uuid           not null references public.novels (id) on delete cascade,
  novel_slug      text           not null,
  chapter_number  integer        not null check (chapter_number > 0),
  active_seconds  integer        not null default 0 check (active_seconds >= 0),
  max_scroll_pct  numeric(5, 2)  not null default 0
                    check (max_scroll_pct >= 0 and max_scroll_pct <= 100),
  completed_at    timestamptz,
  updated_at      timestamptz    not null default now(),

  unique (user_id, novel_id, chapter_number)
);

create index if not exists chapter_reading_progress_novel_id_idx
  on public.chapter_reading_progress (novel_id);

create index if not exists chapter_reading_progress_user_id_idx
  on public.chapter_reading_progress (user_id);

alter table public.chapter_reading_progress enable row level security;

drop policy if exists "Users can view their own chapter progress"
  on public.chapter_reading_progress;
create policy "Users can view their own chapter progress"
  on public.chapter_reading_progress for select to authenticated
  using ( (select auth.uid()) = user_id );

grant select on public.chapter_reading_progress to authenticated;

-- -----------------------------------------------------------------------------
-- Keep library_add_count in sync with bookmarks
-- -----------------------------------------------------------------------------
create or replace function public.sync_novel_library_add_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.novels
      set library_add_count = library_add_count + 1
      where id = new.novel_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.novels
      set library_add_count = greatest(library_add_count - 1, 0)
      where id = old.novel_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists bookmarks_sync_library_add_count on public.bookmarks;
create trigger bookmarks_sync_library_add_count
  after insert or delete on public.bookmarks
  for each row
  execute function public.sync_novel_library_add_count();

-- -----------------------------------------------------------------------------
-- record_novel_view(p_novel_slug) — increments total Views (any visitor)
-- Called from a server action; service role or authenticated/anon via grant.
-- -----------------------------------------------------------------------------
create or replace function public.record_novel_view(p_novel_slug text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.novels
    set view_count = view_count + 1
    where slug = p_novel_slug;
end;
$$;

revoke all on function public.record_novel_view(text) from public;
grant execute on function public.record_novel_view(text) to service_role;

revoke all on function public.sync_novel_library_add_count() from public;
revoke all on function public.sync_novel_library_add_count() from anon, authenticated;

-- -----------------------------------------------------------------------------
-- report_chapter_engagement(...) — progress upsert + optional reader qualify
-- Returns whether this call newly qualified the user as a novel reader.
-- -----------------------------------------------------------------------------
create or replace function public.report_chapter_engagement(
  p_novel_slug     text,
  p_chapter_number integer,
  p_active_seconds integer,
  p_scroll_pct     numeric
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id         uuid := auth.uid();
  v_novel_id        uuid;
  v_active          integer := greatest(coalesce(p_active_seconds, 0), 0);
  v_scroll          numeric := least(greatest(coalesce(p_scroll_pct, 0), 0), 100);
  v_completed_at    timestamptz;
  v_reason          text;
  v_new_reader_id   uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_chapter_number is null or p_chapter_number < 1 then
    raise exception 'Invalid chapter number';
  end if;

  select id into v_novel_id
    from public.novels
    where slug = p_novel_slug;

  if v_novel_id is null then
    raise exception 'Novel not found';
  end if;

  if v_scroll >= 90 then
    v_completed_at := now();
  end if;

  insert into public.chapter_reading_progress as p (
    user_id,
    novel_id,
    novel_slug,
    chapter_number,
    active_seconds,
    max_scroll_pct,
    completed_at,
    updated_at
  )
  values (
    v_user_id,
    v_novel_id,
    p_novel_slug,
    p_chapter_number,
    v_active,
    v_scroll,
    v_completed_at,
    now()
  )
  on conflict (user_id, novel_id, chapter_number) do update
    set active_seconds = greatest(p.active_seconds, excluded.active_seconds),
        max_scroll_pct = greatest(p.max_scroll_pct, excluded.max_scroll_pct),
        completed_at   = coalesce(p.completed_at, excluded.completed_at),
        updated_at     = now();

  -- Qualify as a unique reader once per novel (30s active or 50% scroll).
  if v_active >= 30 then
    v_reason := 'time';
  elsif v_scroll >= 50 then
    v_reason := 'scroll';
  else
    return false;
  end if;

  insert into public.novel_readers (
    user_id,
    novel_id,
    novel_slug,
    first_chapter_number,
    qualify_reason
  )
  values (
    v_user_id,
    v_novel_id,
    p_novel_slug,
    p_chapter_number,
    v_reason
  )
  on conflict (user_id, novel_id) do nothing
  returning id into v_new_reader_id;

  if v_new_reader_id is not null then
    update public.novels
      set reader_count = reader_count + 1
      where id = v_novel_id;
    return true;
  end if;

  return false;
end;
$$;

revoke all on function public.report_chapter_engagement(text, integer, integer, numeric)
  from public;
revoke all on function public.report_chapter_engagement(text, integer, integer, numeric)
  from anon;
grant execute on function public.report_chapter_engagement(text, integer, integer, numeric)
  to authenticated;
