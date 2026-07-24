-- Daily view rollups for in-house time-series charts (day / week / month / year).

create table if not exists public.novel_view_daily (
  novel_id   uuid not null references public.novels (id) on delete cascade,
  day        date not null,
  view_count bigint not null default 0 check (view_count >= 0),
  primary key (novel_id, day)
);

create index if not exists novel_view_daily_day_idx
  on public.novel_view_daily (day);

alter table public.novel_view_daily enable row level security;

-- No client policies — reads/writes via service role only.

create or replace function public.record_novel_view(p_novel_slug text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_novel_id uuid;
  v_day      date := (timezone('utc', now()))::date;
begin
  update public.novels
    set view_count = view_count + 1
    where slug = p_novel_slug
    returning id into v_novel_id;

  if v_novel_id is null then
    return;
  end if;

  insert into public.novel_view_daily (novel_id, day, view_count)
  values (v_novel_id, v_day, 1)
  on conflict (novel_id, day) do update
    set view_count = public.novel_view_daily.view_count + 1;
end;
$$;

revoke all on function public.record_novel_view(text) from public;
revoke all on function public.record_novel_view(text) from anon, authenticated;
grant execute on function public.record_novel_view(text) to service_role;
