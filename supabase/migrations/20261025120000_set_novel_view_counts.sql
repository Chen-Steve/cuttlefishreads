-- Mirror GA4 view totals onto novels.view_count in one statement.
-- Public pages read the column; only the hourly Analytics refresh writes it.

create or replace function public.set_novel_view_counts(p_counts jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.novels as n
  set view_count = (p_counts ->> n.slug)::bigint
  where p_counts ? n.slug
    and (p_counts ->> n.slug) ~ '^[0-9]+$'
    and n.view_count is distinct from (p_counts ->> n.slug)::bigint;
$$;

revoke all on function public.set_novel_view_counts(jsonb) from public;
revoke all on function public.set_novel_view_counts(jsonb) from anon, authenticated;
grant execute on function public.set_novel_view_counts(jsonb) to service_role;

comment on column public.novels.view_count is
  'All-time novel and chapter page views. Mirrored from GA4 about once an hour so public pages can read the column instead of calling the Analytics API.';
