-- One inbox row per bookmarker per publish, instead of one row per chapter.
-- A bulk publish used to insert bookmarks × chapters rows and could stall the
-- workspace action. Free and locked chapters stay separate types. The link
-- points at the earliest chapter in that group, and chapter_count is the size.

alter table public.notifications
  add column if not exists chapter_count integer not null default 1;

alter table public.notifications
  drop constraint if exists notifications_chapter_count_check;

alter table public.notifications
  add constraint notifications_chapter_count_check
  check (chapter_count >= 1);

comment on column public.notifications.chapter_count is
  'Chapters covered by this alert. 1 for a single chapter; higher for a bulk publish.';

drop index if exists public.notifications_dedupe_idx;

create unique index notifications_dedupe_idx
  on public.notifications (
    user_id,
    coalesce(actor_id::text, ''),
    type,
    coalesce(comment_id::text, ''),
    coalesce(reply_id::text, ''),
    coalesce(novel_id::text, ''),
    coalesce(chapter_number, 0),
    chapter_count
  );

create or replace function public.notify_bookmarkers_of_chapters(
  p_novel_id uuid,
  p_chapters jsonb,
  p_exclude_user_id uuid default null
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  inserted integer;
begin
  if p_novel_id is null then
    raise exception 'novel id is required' using errcode = '22023';
  end if;
  if p_chapters is null
     or jsonb_typeof(p_chapters) <> 'array'
     or jsonb_array_length(p_chapters) = 0 then
    return 0;
  end if;
  if jsonb_array_length(p_chapters) > 20000 then
    raise exception 'At most 20000 chapters per notification' using errcode = '22023';
  end if;

  with chapters as (
    select distinct
      (item->>'number')::integer as chapter_number,
      coalesce((item->>'released')::boolean, false) as released
    from jsonb_array_elements(p_chapters) as item
    where coalesce(item->>'number', '') ~ '^[0-9]{1,9}$'
      and (item->>'number')::integer > 0
  ),
  grouped as (
    select
      case when released then 'chapter_released' else 'chapter_published' end as type,
      min(chapter_number) as chapter_number,
      count(*)::integer as chapter_count
    from chapters
    group by released
  ),
  inserted_rows as (
    insert into public.notifications (
      user_id, type, novel_id, chapter_number, chapter_count
    )
    select b.user_id, g.type, p_novel_id, g.chapter_number, g.chapter_count
    from public.bookmarks b
    cross join grouped g
    where b.novel_id = p_novel_id
      and (p_exclude_user_id is null or b.user_id <> p_exclude_user_id)
      and exists (
        select 1 from public.profiles p where p.id = b.user_id
      )
    on conflict do nothing
    returning 1
  )
  select count(*)::integer into inserted from inserted_rows;

  return coalesce(inserted, 0);
end;
$$;

revoke all on function public.notify_bookmarkers_of_chapters(uuid, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.notify_bookmarkers_of_chapters(uuid, jsonb, uuid) to service_role;

comment on function public.notify_bookmarkers_of_chapters(uuid, jsonb, uuid) is
  'Insert one chapter alert per bookmarker. Groups free and locked chapters, and skips duplicates.';
