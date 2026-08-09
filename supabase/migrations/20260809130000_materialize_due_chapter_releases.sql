-- Set-based chapter_released materialization for timed unlocks.
-- Replaces per-request TypeScript bookmark/chapter scans on every page load.
-- Called from inbox load for one reader (p_user_id).

create or replace function public.materialize_due_chapter_releases(
  p_user_id uuid default null
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  inserted integer;
  start_of_today timestamptz := date_trunc('day', timezone('utc', now()));
begin
  with due as (
    select c.novel_id, c.number as chapter_number
    from public.chapters c
    where c.is_published = true
      and c.is_free = false
      and c.unlock_at is not null
      and c.unlock_at >= start_of_today
      and c.unlock_at <= timezone('utc', now())
  ),
  recipients as (
    select distinct b.user_id, d.novel_id, d.chapter_number
    from due d
    join public.bookmarks b on b.novel_id = d.novel_id
    where p_user_id is null or b.user_id = p_user_id
  ),
  inserted_rows as (
    insert into public.notifications (user_id, type, novel_id, chapter_number)
    select r.user_id, 'chapter_released', r.novel_id, r.chapter_number
    from recipients r
    where not exists (
      select 1
      from public.notifications n
      where n.user_id = r.user_id
        and n.type = 'chapter_released'
        and n.novel_id = r.novel_id
        and n.chapter_number = r.chapter_number
        and n.actor_id is null
        and n.comment_id is null
        and n.reply_id is null
    )
    returning 1
  )
  select count(*)::integer into inserted from inserted_rows;

  return coalesce(inserted, 0);
end;
$$;

comment on function public.materialize_due_chapter_releases(uuid) is
  'Insert chapter_released rows for timed unlocks due today. '
  'Pass p_user_id to scope to one reader; null for all bookmarkers.';

revoke all on function public.materialize_due_chapter_releases(uuid) from public;
grant execute on function public.materialize_due_chapter_releases(uuid) to service_role;
