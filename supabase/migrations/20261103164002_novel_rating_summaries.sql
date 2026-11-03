-- One average and count per novel. Do not download every rated comment.
create or replace function public.novel_rating_summaries()
returns table (
  novel_slug text,
  average numeric,
  rating_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    novel_comments.novel_slug,
    avg(novel_comments.rating) as average,
    count(*)::bigint as rating_count
  from public.novel_comments
  where novel_comments.parent_id is null
    and novel_comments.rating is not null
  group by novel_comments.novel_slug;
$$;

revoke all on function public.novel_rating_summaries() from public, anon, authenticated;
grant execute on function public.novel_rating_summaries() to service_role;
