-- Signed-in writes go through the caller's JWT and these policies.
-- The service role stays for payments, cron, notification fan-out, profile
-- bootstrap, and public cache fills. It bypasses RLS, so these policies do
-- not change those jobs.
--
-- Master admin is still the ADMIN_EMAILS allowlist. sync_admin_emails() copies
-- it into private.admin_emails; is_master_admin() reads that table from the
-- JWT email (auth.users email, not user-editable metadata).

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table if not exists private.admin_emails (
  email text primary key
);

revoke all on table private.admin_emails from public, anon, authenticated;
grant select, insert, update, delete on table private.admin_emails to service_role;

create index if not exists novels_publisher_id_idx
  on public.novels (publisher_id);

-- -----------------------------------------------------------------------------
-- Identity helpers
-- -----------------------------------------------------------------------------

create or replace function public.is_master_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.admin_emails
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.is_master_admin() from public, anon, authenticated;
grant execute on function public.is_master_admin() to authenticated;

create or replace function public.sync_admin_emails(p_emails text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if current_user is distinct from 'service_role'
     and coalesce(auth.jwt() ->> 'role', '') is distinct from 'service_role' then
    raise exception 'not allowed';
  end if;

  delete from private.admin_emails;

  insert into private.admin_emails (email)
  select distinct lower(btrim(email))
  from unnest(coalesce(p_emails, array[]::text[])) as email
  where btrim(email) <> '';
end;
$$;

revoke all on function public.sync_admin_emails(text[]) from public, anon, authenticated;
grant execute on function public.sync_admin_emails(text[]) to service_role;

create or replace function public.can_edit_novel(p_novel_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select public.is_master_admin())
      or exists (
        select 1
        from public.novels
        where id = p_novel_id
          and publisher_id = (select auth.uid())
      );
$$;

revoke all on function public.can_edit_novel(uuid) from public, anon, authenticated;
grant execute on function public.can_edit_novel(uuid) to authenticated;

-- True when the signed-in reader may discuss this chapter. Does not return text.
create or replace function public.can_read_chapter(p_slug text, p_number integer)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.chapters c
    join public.novels n on n.id = c.novel_id
    where n.slug = p_slug
      and c.number = p_number
      and c.is_published
      and (
        c.is_free
        or (c.unlock_at is not null and c.unlock_at <= now())
        or n.publisher_id = (select auth.uid())
        or (select public.is_master_admin())
        or exists (
          select 1
          from public.chapter_unlocks u
          where u.user_id = (select auth.uid())
            and u.novel_slug = p_slug
            and u.chapter_number = p_number
        )
      )
  );
$$;

revoke all on function public.can_read_chapter(text, integer) from public, anon;
grant execute on function public.can_read_chapter(text, integer) to authenticated;

-- Promotes the caller when their application is already approved.
-- Callers cannot approve themselves: status is not user-writable.
create or replace function public.sync_own_translator_role()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_username text;
begin
  if v_user_id is null then
    return false;
  end if;

  if exists (
    select 1
    from public.profiles
    where id = v_user_id
      and role = 'translator'
  ) then
    return true;
  end if;

  select username
    into v_username
  from public.translator_applications
  where user_id = v_user_id
    and status = 'approved';

  if not found then
    return false;
  end if;

  insert into public.profiles (id, role, username, updated_at)
  values (v_user_id, 'translator', nullif(btrim(v_username), ''), now())
  on conflict (id) do update
    set role = 'translator',
        username = coalesce(public.profiles.username, excluded.username),
        updated_at = now();

  return true;
end;
$$;

revoke all on function public.sync_own_translator_role() from public, anon;
grant execute on function public.sync_own_translator_role() to authenticated;

-- Master admin reviews an application and, on approval, grants translator.
create or replace function public.review_translator_application(
  p_application_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_username text;
begin
  if not (select public.is_master_admin()) then
    raise exception 'not allowed';
  end if;

  if p_status not in ('approved', 'rejected') then
    raise exception 'invalid status';
  end if;

  select user_id, username
    into v_user_id, v_username
  from public.translator_applications
  where id = p_application_id;

  if v_user_id is null then
    raise exception 'application not found';
  end if;

  if p_status = 'approved' then
    insert into public.profiles (id, role, username, updated_at)
    values (v_user_id, 'translator', nullif(btrim(v_username), ''), now())
    on conflict (id) do update
      set role = 'translator',
          username = coalesce(public.profiles.username, excluded.username),
          updated_at = now();
  end if;

  update public.translator_applications
    set status = p_status,
        reviewed_at = now(),
        reviewed_by = auth.uid()
  where id = p_application_id;
end;
$$;

revoke all on function public.review_translator_application(uuid, text) from public, anon;
grant execute on function public.review_translator_application(uuid, text) to authenticated;

-- Signed-in callers always spend their own coins: p_user_id is ignored unless
-- the caller is service_role. The currently deployed server action still uses
-- that path; the app update calls this with the reader's JWT instead.
create or replace function public.unlock_chapter(
  p_novel_slug     text,
  p_chapter_number integer,
  p_user_id        uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id           uuid;
  v_cost              integer;
  v_is_free           boolean;
  v_unlock_at         timestamptz;
  v_publisher_id      uuid;
  v_balance           numeric;
  v_translator_share  numeric := 0;
  v_prior_count       integer := 0;
  v_hidden            boolean := false;
begin
  if coalesce(auth.jwt() ->> 'role', '') = 'service_role' then
    v_user_id := p_user_id;
  else
    v_user_id := auth.uid();
  end if;

  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select c.coin_cost, c.is_free, c.unlock_at, n.publisher_id
    into v_cost, v_is_free, v_unlock_at, v_publisher_id
  from public.chapters c
  join public.novels n on n.id = c.novel_id
  where n.slug = p_novel_slug
    and c.number = p_chapter_number;

  if not found then
    raise exception 'Chapter not found';
  end if;

  if v_is_free or v_cost = 0 or (v_unlock_at is not null and v_unlock_at <= now()) then
    return false;
  end if;

  if v_publisher_id is null then
    raise exception 'This novel has no publisher configured';
  end if;

  if v_publisher_id = v_user_id then
    return false;
  end if;

  if exists (
    select 1
    from public.chapter_unlocks
    where user_id = v_user_id
      and novel_slug = p_novel_slug
      and chapter_number = p_chapter_number
  ) then
    return false;
  end if;

  select coins
    into v_balance
  from public.profiles
  where id = v_user_id
  for update;

  if v_balance is null then
    raise exception 'Profile not found';
  end if;

  if v_balance < v_cost then
    raise exception 'Insufficient coins (have %, need %)', v_balance, v_cost;
  end if;

  update public.profiles
    set coins = coins - v_cost
  where id = v_user_id;

  select count(*)
    into v_prior_count
  from public.chapter_unlocks cu
  join public.novels n on n.slug = cu.novel_slug
  where cu.user_id = v_user_id
    and n.publisher_id = v_publisher_id;

  v_hidden := ((v_prior_count + 1) % 4) = 0;

  if not v_hidden then
    v_translator_share := v_cost * 0.7;
    if v_translator_share > 0 then
      update public.profiles
        set coins = coins + v_translator_share
      where id = v_publisher_id;

      if not found then
        raise exception 'Publisher profile not found';
      end if;
    end if;
  end if;

  insert into public.chapter_unlocks (
    user_id,
    novel_slug,
    chapter_number,
    coins_spent,
    translator_share,
    hidden_from_translator
  )
  values (
    v_user_id,
    p_novel_slug,
    p_chapter_number,
    v_cost,
    v_translator_share,
    v_hidden
  );

  return true;
end;
$$;

revoke all on function public.unlock_chapter(text, integer, uuid) from public, anon;
grant execute on function public.unlock_chapter(text, integer, uuid) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Novels: editors write their own rows. Stats columns stay service-role only.
-- -----------------------------------------------------------------------------

drop policy if exists "Editors insert novels" on public.novels;
create policy "Editors insert novels"
  on public.novels for insert to authenticated
  with check (
    publication_type = 'translation'
    and (
      (select public.is_master_admin())
      or publisher_id = (select auth.uid())
    )
  );

drop policy if exists "Editors update novels" on public.novels;
create policy "Editors update novels"
  on public.novels for update to authenticated
  using (
    (select public.is_master_admin())
    or publisher_id = (select auth.uid())
  )
  with check (
    publication_type = 'translation'
    and (
      (select public.is_master_admin())
      or publisher_id = (select auth.uid())
    )
  );

drop policy if exists "Editors delete novels" on public.novels;
create policy "Editors delete novels"
  on public.novels for delete to authenticated
  using (
    (select public.is_master_admin())
    or publisher_id = (select auth.uid())
  );

revoke insert, update, delete, truncate on public.novels from anon;
revoke insert, update, truncate on public.novels from authenticated;

grant insert (
  slug,
  title,
  original_author,
  translator,
  description,
  cover_url,
  genres,
  tags,
  status,
  language,
  publisher_id,
  novelupdates_url,
  publication_type
) on public.novels to authenticated;

grant update (
  title,
  original_author,
  translator,
  description,
  cover_url,
  genres,
  tags,
  status,
  language,
  publisher_id,
  novelupdates_url,
  updated_at
) on public.novels to authenticated;

grant delete on public.novels to authenticated;

-- -----------------------------------------------------------------------------
-- Chapters: readable and writable by the novel's editor only.
-- Paid text stays off the anon Data API. word_count is trigger-maintained.
-- -----------------------------------------------------------------------------

drop policy if exists "Editors read chapters" on public.chapters;
create policy "Editors read chapters"
  on public.chapters for select to authenticated
  using ((select public.can_edit_novel(novel_id)));

drop policy if exists "Editors insert chapters" on public.chapters;
create policy "Editors insert chapters"
  on public.chapters for insert to authenticated
  with check ((select public.can_edit_novel(novel_id)));

drop policy if exists "Editors update chapters" on public.chapters;
create policy "Editors update chapters"
  on public.chapters for update to authenticated
  using ((select public.can_edit_novel(novel_id)))
  with check ((select public.can_edit_novel(novel_id)));

drop policy if exists "Editors delete chapters" on public.chapters;
create policy "Editors delete chapters"
  on public.chapters for delete to authenticated
  using ((select public.can_edit_novel(novel_id)));

revoke all on public.chapters from anon;
revoke insert, update, delete, truncate on public.chapters from authenticated;

grant select on public.chapters to authenticated;

grant insert (
  novel_id,
  number,
  title,
  content,
  is_free,
  coin_cost,
  unlock_at,
  is_published,
  source_url,
  translator_note,
  use_global_translator_note,
  updated_at
) on public.chapters to authenticated;

grant update (
  number,
  title,
  content,
  is_free,
  coin_cost,
  unlock_at,
  is_published,
  source_url,
  translator_note,
  use_global_translator_note,
  updated_at
) on public.chapters to authenticated;

grant delete on public.chapters to authenticated;

-- -----------------------------------------------------------------------------
-- Comments: own rows, matching novel, readable chapter, one reply level.
-- -----------------------------------------------------------------------------

drop policy if exists "Users can create their own comments" on public.novel_comments;
create policy "Users can create their own comments"
  on public.novel_comments for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.novels n
      where n.id = novel_id
        and n.slug = novel_slug
    )
    and (
      chapter_number is null
      or (select public.can_read_chapter(novel_slug, chapter_number))
    )
    and (
      parent_id is null
      or exists (
        select 1
        from public.novel_comments parent
        where parent.id = novel_comments.parent_id
          and parent.parent_id is null
          and parent.novel_id = novel_comments.novel_id
          and parent.chapter_number is not distinct from novel_comments.chapter_number
      )
    )
  );

revoke insert, update, delete, truncate on public.novel_comments from anon;
revoke insert, update, truncate on public.novel_comments from authenticated;

grant insert (
  user_id,
  novel_id,
  novel_slug,
  chapter_number,
  parent_id,
  body,
  rating
) on public.novel_comments to authenticated;

grant update (body, rating, updated_at) on public.novel_comments to authenticated;

-- -----------------------------------------------------------------------------
-- Purchases stay inside security-definer functions. Publishers can read the
-- sales the dashboard already shows them. Hidden platform cuts stay hidden.
-- -----------------------------------------------------------------------------

revoke insert, update, delete, truncate on public.chapter_unlocks from anon, authenticated;
revoke insert, update, delete, truncate on public.coin_purchases from anon, authenticated;
revoke delete, truncate on public.profiles from anon, authenticated;

drop policy if exists "Publishers read visible sales" on public.chapter_unlocks;
create policy "Publishers read visible sales"
  on public.chapter_unlocks for select to authenticated
  using (
    hidden_from_translator = false
    and exists (
      select 1
      from public.novels n
      where n.slug = chapter_unlocks.novel_slug
        and n.publisher_id = (select auth.uid())
    )
  );

drop policy if exists "Master admins read unlocks" on public.chapter_unlocks;
create policy "Master admins read unlocks"
  on public.chapter_unlocks for select to authenticated
  using ((select public.is_master_admin()));

grant update (
  translator_note,
  kofi_url,
  patreon_url,
  avatar_url,
  updated_at
) on public.profiles to authenticated;

-- -----------------------------------------------------------------------------
-- Applications: applicants keep their own row. Review runs through the function
-- above; master admins can list every application.
-- -----------------------------------------------------------------------------

drop policy if exists "Master admins read applications" on public.translator_applications;
create policy "Master admins read applications"
  on public.translator_applications for select to authenticated
  using ((select public.is_master_admin()));

-- -----------------------------------------------------------------------------
-- Storage. Avatars are prefixed with the user id. Covers can be removed by the
-- uploader, a master admin, or the publisher while the novel still points at
-- the object.
-- -----------------------------------------------------------------------------

drop policy if exists "Users upload their avatars" on storage.objects;
create policy "Users upload their avatars"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and name like (select auth.uid()::text) || '-%'
  );

drop policy if exists "Users delete their avatars" on storage.objects;
create policy "Users delete their avatars"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and name like (select auth.uid()::text) || '-%'
  );

drop policy if exists "Editors upload covers" on storage.objects;
create policy "Editors upload covers"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'covers'
    and (
      (select public.is_master_admin())
      or exists (
        select 1
        from public.profiles p
        where p.id = (select auth.uid())
          and p.role = 'translator'
      )
    )
  );

drop policy if exists "Editors delete covers" on storage.objects;
create policy "Editors delete covers"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'covers'
    and (
      (select public.is_master_admin())
      or owner = (select auth.uid())
      or exists (
        select 1
        from public.novels n
        where n.publisher_id = (select auth.uid())
          and n.cover_url like '%/covers/' || storage.objects.name
      )
    )
  );
