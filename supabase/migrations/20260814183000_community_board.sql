-- =============================================================================
-- Community board: novel requests and site ideas
--
-- Readers can submit requests/ideas and upvote them. Status is moderated by
-- the service role (master admin). Vote counts are maintained by trigger.
-- =============================================================================

create table if not exists public.community_posts (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles (id) on delete cascade,
  kind        text        not null check (kind in ('novel_request', 'idea')),
  title       text        not null,
  body        text        not null default '',
  status      text        not null default 'open'
                check (status in ('open', 'planned', 'done', 'declined')),
  vote_count  integer     not null default 0 check (vote_count >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint community_posts_title_len
    check (char_length(trim(title)) between 2 and 120),
  constraint community_posts_body_len
    check (char_length(body) <= 2000)
);

create unique index if not exists community_posts_novel_request_title_key
  on public.community_posts (lower(trim(title)))
  where kind = 'novel_request';

create index if not exists community_posts_kind_votes_idx
  on public.community_posts (kind, vote_count desc, created_at desc);

create index if not exists community_posts_user_id_idx
  on public.community_posts (user_id);

create table if not exists public.community_post_votes (
  post_id     uuid        not null references public.community_posts (id) on delete cascade,
  user_id     uuid        not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists community_post_votes_user_id_idx
  on public.community_post_votes (user_id);

alter table public.community_posts enable row level security;
alter table public.community_post_votes enable row level security;

drop policy if exists "Community posts are publicly readable" on public.community_posts;
create policy "Community posts are publicly readable"
  on public.community_posts for select to anon, authenticated
  using ( true );

drop policy if exists "Members can create community posts" on public.community_posts;
create policy "Members can create community posts"
  on public.community_posts for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and vote_count = 0
    and status = 'open'
  );

drop policy if exists "Authors can delete their community posts" on public.community_posts;
create policy "Authors can delete their community posts"
  on public.community_posts for delete to authenticated
  using ( (select auth.uid()) = user_id );

drop policy if exists "Community votes are publicly readable" on public.community_post_votes;
create policy "Community votes are publicly readable"
  on public.community_post_votes for select to anon, authenticated
  using ( true );

drop policy if exists "Members can vote on community posts" on public.community_post_votes;
create policy "Members can vote on community posts"
  on public.community_post_votes for insert to authenticated
  with check ( (select auth.uid()) = user_id );

drop policy if exists "Members can remove their community votes" on public.community_post_votes;
create policy "Members can remove their community votes"
  on public.community_post_votes for delete to authenticated
  using ( (select auth.uid()) = user_id );

-- Vote count is not updatable by members; the trigger runs as the owner.
create or replace function public.sync_community_post_vote_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.community_posts
      set vote_count = vote_count + 1
      where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.community_posts
      set vote_count = greatest(vote_count - 1, 0)
      where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists community_post_votes_sync on public.community_post_votes;
create trigger community_post_votes_sync
  after insert or delete on public.community_post_votes
  for each row
  execute function public.sync_community_post_vote_count();

-- Author's own post starts with one vote.
create or replace function public.community_posts_auto_vote()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.community_post_votes (post_id, user_id)
  values (new.id, new.user_id)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists community_posts_auto_vote on public.community_posts;
create trigger community_posts_auto_vote
  after insert on public.community_posts
  for each row
  execute function public.community_posts_auto_vote();

revoke all on function public.sync_community_post_vote_count() from public;
revoke all on function public.sync_community_post_vote_count() from anon, authenticated;
revoke all on function public.community_posts_auto_vote() from public;
revoke all on function public.community_posts_auto_vote() from anon, authenticated;

grant select on public.community_posts to anon, authenticated;
grant insert, delete on public.community_posts to authenticated;

grant select on public.community_post_votes to anon, authenticated;
grant insert, delete on public.community_post_votes to authenticated;
