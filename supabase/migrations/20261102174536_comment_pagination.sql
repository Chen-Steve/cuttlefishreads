-- Support stable timestamp + id cursors without sorting the entire discussion.
create index if not exists novel_comments_top_level_page_idx
  on public.novel_comments (novel_slug, created_at desc, id desc)
  where parent_id is null;
create index if not exists novel_comments_chapter_page_idx
  on public.novel_comments (novel_slug, chapter_number, created_at desc, id desc)
  where parent_id is null;
create index if not exists novel_comments_replies_page_idx
  on public.novel_comments (parent_id, created_at, id)
  where parent_id is not null;

-- PostgREST computed field. The unnamed argument prevents an RPC endpoint.
-- Count in the database; do not send every reply body to get a thread size.
create or replace function public.comment_reply_count(public.novel_comments)
returns bigint
language sql stable
security invoker
set search_path = ''
as $$
  select count(*) from public.novel_comments as reply where reply.parent_id = $1.id;
$$;

revoke all on function public.comment_reply_count(public.novel_comments) from public, anon, authenticated;
grant execute on function public.comment_reply_count(public.novel_comments) to service_role;
