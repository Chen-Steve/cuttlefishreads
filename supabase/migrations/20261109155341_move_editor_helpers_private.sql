-- Policy helpers are not part of the Data API. Move them out of public so
-- PostgREST does not expose them. Callers that the app invokes stay in public:
-- sync_admin_emails, sync_own_translator_role, review_translator_application,
-- unlock_chapter.

create or replace function private.is_master_admin()
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

create or replace function private.can_edit_novel(p_novel_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.is_master_admin())
      or exists (
        select 1
        from public.novels
        where id = p_novel_id
          and publisher_id = (select auth.uid())
      );
$$;

create or replace function private.can_read_chapter(p_slug text, p_number integer)
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
      and (
        n.publisher_id = (select auth.uid())
        or (select private.is_master_admin())
        or (
          c.is_published
          and (
            c.is_free
            or (c.unlock_at is not null and c.unlock_at <= now())
            or exists (
              select 1
              from public.chapter_unlocks u
              where u.user_id = (select auth.uid())
                and u.novel_slug = p_slug
                and u.chapter_number = p_number
            )
          )
        )
      )
  );
$$;

revoke all on function private.is_master_admin() from public, anon, authenticated;
revoke all on function private.can_edit_novel(uuid) from public, anon, authenticated;
revoke all on function private.can_read_chapter(text, integer) from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_master_admin() to authenticated;
grant execute on function private.can_edit_novel(uuid) to authenticated;
grant execute on function private.can_read_chapter(text, integer) to authenticated;

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
  if not (select private.is_master_admin()) then
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

drop policy if exists "Editors insert novels" on public.novels;
create policy "Editors insert novels"
  on public.novels for insert to authenticated
  with check (
    publication_type = 'translation'
    and (
      (select private.is_master_admin())
      or publisher_id = (select auth.uid())
    )
  );

drop policy if exists "Editors update novels" on public.novels;
create policy "Editors update novels"
  on public.novels for update to authenticated
  using (
    (select private.is_master_admin())
    or publisher_id = (select auth.uid())
  )
  with check (
    publication_type = 'translation'
    and (
      (select private.is_master_admin())
      or publisher_id = (select auth.uid())
    )
  );

drop policy if exists "Editors delete novels" on public.novels;
create policy "Editors delete novels"
  on public.novels for delete to authenticated
  using (
    (select private.is_master_admin())
    or publisher_id = (select auth.uid())
  );

drop policy if exists "Editors read chapters" on public.chapters;
create policy "Editors read chapters"
  on public.chapters for select to authenticated
  using ((select private.can_edit_novel(novel_id)));

drop policy if exists "Editors insert chapters" on public.chapters;
create policy "Editors insert chapters"
  on public.chapters for insert to authenticated
  with check ((select private.can_edit_novel(novel_id)));

drop policy if exists "Editors update chapters" on public.chapters;
create policy "Editors update chapters"
  on public.chapters for update to authenticated
  using ((select private.can_edit_novel(novel_id)))
  with check ((select private.can_edit_novel(novel_id)));

drop policy if exists "Editors delete chapters" on public.chapters;
create policy "Editors delete chapters"
  on public.chapters for delete to authenticated
  using ((select private.can_edit_novel(novel_id)));

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
      or (select private.can_read_chapter(novel_slug, chapter_number))
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
  using ((select private.is_master_admin()));

drop policy if exists "Master admins read applications" on public.translator_applications;
create policy "Master admins read applications"
  on public.translator_applications for select to authenticated
  using ((select private.is_master_admin()));

drop policy if exists "Editors upload covers" on storage.objects;
create policy "Editors upload covers"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'covers'
    and (
      (select private.is_master_admin())
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
      (select private.is_master_admin())
      or owner = (select auth.uid())
      or exists (
        select 1
        from public.novels n
        where n.publisher_id = (select auth.uid())
          and n.cover_url like '%/covers/' || storage.objects.name
      )
    )
  );

drop function if exists public.can_read_chapter(text, integer);
drop function if exists public.can_edit_novel(uuid);
drop function if exists public.is_master_admin();
