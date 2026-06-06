-- =============================================================================
-- Translators: roles, applications, and view tracking
--
-- Run this after schema.sql, novels.sql, bookmarks.sql, comments.sql,
-- public-profiles.sql and chapter-publishing.sql. It adds:
--   * profiles.role           -> 'user' | 'translator' (master admin stays in
--                                the ADMIN_EMAILS env allowlist, handled in code)
--   * translator_applications -> onboarding requests reviewed by the admin
--   * novel_views             -> unique-visitor view tracking for stats
--
-- Application reviews and view writes happen server-side via the Supabase
-- secret key (service_role), so those tables expose no client write policies.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profiles.role
-- A coarse application role. Master admin is NOT stored here — it remains an
-- env allowlist (ADMIN_EMAILS) and is treated as a super-admin in code. This
-- column only distinguishes regular readers from approved translators.
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists role text not null default 'user'
  check (role in ('user', 'translator'));


-- -----------------------------------------------------------------------------
-- translator_applications
-- One pending/approved/rejected application per user. Applicants must be
-- logged in (user_id references auth.users), and the email / username columns
-- snapshot their account details at submission time for the review screen.
-- -----------------------------------------------------------------------------
create table if not exists public.translator_applications (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null unique references auth.users (id) on delete cascade,
  username    text        not null,
  email       text        not null,
  discord     text        not null,
  message     text        not null,
  status      text        not null default 'pending'
                check (status in ('pending', 'approved', 'rejected')),
  created_at  timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid        references auth.users (id) on delete set null
);

create index if not exists translator_applications_status_idx
  on public.translator_applications (status, created_at);

alter table public.translator_applications enable row level security;

-- Users can read their own application (to see its status on /apply).
drop policy if exists "Users can view their own application"
  on public.translator_applications;
create policy "Users can view their own application"
  on public.translator_applications for select to authenticated
  using ( (select auth.uid()) = user_id );

-- Users can submit a single application for themselves. The unique constraint
-- on user_id prevents duplicates.
drop policy if exists "Users can submit their own application"
  on public.translator_applications;
create policy "Users can submit their own application"
  on public.translator_applications for insert to authenticated
  with check ( (select auth.uid()) = user_id );

-- No update/delete policy — reviews (approve/reject) run server-side via the
-- service role.


-- -----------------------------------------------------------------------------
-- novel_views
-- Unique-visitor view tracking. visitor_key is the auth user id for logged-in
-- readers, or an anonymous cookie id (cf_vid) otherwise. The unique constraint
-- dedupes repeat views from the same visitor, so a count of rows per novel is
-- the unique view total. Written server-side only via the service role.
-- -----------------------------------------------------------------------------
create table if not exists public.novel_views (
  id          uuid        primary key default gen_random_uuid(),
  novel_id    uuid        not null references public.novels (id) on delete cascade,
  novel_slug  text        not null,
  visitor_key text        not null,
  created_at  timestamptz not null default now(),

  unique (novel_id, visitor_key)  -- one view per unique visitor per novel
);

create index if not exists novel_views_novel_id_idx
  on public.novel_views (novel_id);

alter table public.novel_views enable row level security;

-- No client policies — inserts and stat reads happen server-side via the
-- service role (which bypasses RLS).


-- -----------------------------------------------------------------------------
-- Data API grants
-- -----------------------------------------------------------------------------
grant select, insert on public.translator_applications to authenticated;
