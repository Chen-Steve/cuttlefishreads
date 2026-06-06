-- =============================================================================
-- Novels & Chapters
--
-- Run this after schema.sql. It adds the content tables that back the admin
-- dashboard (novel creation + chapter uploads) and rewrites unlock_chapter()
-- so the coin price is read authoritatively from the chapter row instead of
-- being trusted from the client.
--
-- Writes to these tables are performed server-side with the service-role key
-- (see src/app/admin/actions.ts), so there are no client insert/update
-- policies. Public reads of chapter *content* are intentionally NOT exposed to
-- the Data API — paid content is served through the server only.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- novels
-- -----------------------------------------------------------------------------
create table if not exists public.novels (
  id              uuid        primary key default gen_random_uuid(),
  slug            text        not null unique,
  title           text        not null,
  original_author text,                              -- original author name
  translator      text,                              -- translator name
  description     text,
  cover_url       text,
  genres          text[]      not null default '{}',
  tags            text[]      not null default '{}',
  status          text        not null default 'ongoing'
                    check (status in ('ongoing', 'completed', 'hiatus')),
  publisher_id    uuid        references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Migration: add publisher_id to existing tables.
alter table public.novels
  add column if not exists publisher_id uuid references auth.users (id) on delete set null;

alter table public.novels enable row level security;

-- Novel metadata is public catalogue data — anyone may read it.
drop policy if exists "Novels are publicly readable" on public.novels;
create policy "Novels are publicly readable"
  on public.novels for select to anon, authenticated
  using ( true );

-- -----------------------------------------------------------------------------
-- chapters
--
-- coin_cost is the authoritative price. A chapter is readable for free when
-- is_free is true OR unlock_at has passed (scheduled auto-unlock).
-- -----------------------------------------------------------------------------
create table if not exists public.chapters (
  id           uuid        primary key default gen_random_uuid(),
  novel_id     uuid        not null references public.novels (id) on delete cascade,
  number       integer     not null check (number > 0),
  title        text        not null,
  content      text        not null,
  is_free      boolean     not null default true,
  coin_cost    integer     not null default 0 check (coin_cost >= 0),
  unlock_at    timestamptz,                          -- auto-unlocks (free) once passed
  published_at timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  unique (novel_id, number)
);

create index if not exists chapters_novel_idx on public.chapters (novel_id, number);

alter table public.chapters enable row level security;

-- No SELECT policy: chapter content (including paid chapters) is never served
-- directly through the Data API. The server reads it with the service-role
-- client, and unlock checks happen in unlock_chapter() below.

-- -----------------------------------------------------------------------------
-- Cover image storage
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('covers', 'covers', true)
on conflict (id) do nothing;

-- Uploads are done server-side with the service-role key (bypasses RLS) and the
-- bucket is public, so covers are world-readable without extra storage policies.

-- -----------------------------------------------------------------------------
-- unlock_chapter(p_novel_slug, p_chapter_number)
--
-- Replaces the old 3-argument version. The coin cost is now looked up from the
-- chapters table so a tampered client cannot dictate the price. Atomically:
--   1. Resolves the chapter and its authoritative price.
--   2. Returns false (no charge) for free / already-auto-unlocked / already
--      purchased chapters.
--   3. Checks the balance, deducts coins, and records a chapter_unlocks row.
-- Returns true when coins were spent.
-- -----------------------------------------------------------------------------
drop function if exists public.unlock_chapter(text, integer, integer);

create or replace function public.unlock_chapter(
  p_novel_slug     text,
  p_chapter_number integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id      uuid := auth.uid();
  v_cost         integer;
  v_is_free      boolean;
  v_unlock_at    timestamptz;
  v_publisher_id uuid;
  v_balance      integer;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select c.coin_cost, c.is_free, c.unlock_at, n.publisher_id
    into v_cost, v_is_free, v_unlock_at, v_publisher_id
    from public.chapters c
    join public.novels   n on n.id = c.novel_id
    where n.slug   = p_novel_slug
      and c.number = p_chapter_number;

  if not found then
    raise exception 'Chapter not found';
  end if;

  -- Free, or scheduled auto-unlock date has passed — no purchase needed.
  if v_is_free or (v_unlock_at is not null and v_unlock_at <= now()) then
    return false;
  end if;

  -- Publisher always reads their own novel's chapters for free.
  if v_publisher_id is not null and v_publisher_id = v_user_id then
    return false;
  end if;

  -- Already unlocked — nothing to do (coins are only spent once).
  if exists (
    select 1 from public.chapter_unlocks
    where user_id        = v_user_id
      and novel_slug     = p_novel_slug
      and chapter_number = p_chapter_number
  ) then
    return false;
  end if;

  -- Lock the profile row and read the balance.
  select coins into v_balance
    from public.profiles
    where id = v_user_id
    for update;

  if v_balance < v_cost then
    raise exception 'Insufficient coins (have %, need %)', v_balance, v_cost;
  end if;

  update public.profiles
    set coins = coins - v_cost
    where id = v_user_id;

  insert into public.chapter_unlocks
    (user_id, novel_slug, chapter_number, coins_spent)
  values
    (v_user_id, p_novel_slug, p_chapter_number, v_cost);

  return true;
end;
$$;

revoke all on function public.unlock_chapter(text, integer)
  from public, anon, authenticated;
grant execute on function public.unlock_chapter(text, integer)
  to authenticated;

-- -----------------------------------------------------------------------------
-- Data API grants
-- -----------------------------------------------------------------------------
grant select on public.novels to anon, authenticated;
-- public.chapters is intentionally not granted to anon/authenticated.
