-- Recently-updated homepage helper: top N published chapters per novel.
-- Invoker-safe metadata only; callable by service_role from the app server.

create index if not exists chapters_published_at_idx
  on public.chapters (published_at desc)
  where is_published = true;

create or replace function public.recently_updated_chapters(per_novel integer default 3)
returns table (
  novel_slug text,
  novel_title text,
  cover_url text,
  chapter_number integer,
  chapter_title text,
  is_free boolean,
  published_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    n.slug,
    n.title,
    n.cover_url,
    c.number,
    c.title,
    c.is_free,
    c.published_at
  from (
    select
      novel_id,
      number,
      title,
      is_free,
      published_at,
      row_number() over (
        partition by novel_id
        order by published_at desc
      ) as rn
    from public.chapters
    where is_published = true
  ) c
  join public.novels n on n.id = c.novel_id
  where c.rn <= greatest(per_novel, 1)
  order by c.published_at desc;
$$;

revoke all on function public.recently_updated_chapters(integer) from public;
grant execute on function public.recently_updated_chapters(integer) to service_role;
