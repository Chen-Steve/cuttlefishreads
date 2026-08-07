-- Chapter word counts for admin chapter lists (avoid selecting full content).
-- Unlock stats RPC so translator dashboards can aggregate without loading
-- every chapter_unlocks row.

-- -----------------------------------------------------------------------------
-- chapters.word_count
-- -----------------------------------------------------------------------------
alter table public.chapters
  add column if not exists word_count integer not null default 0;

comment on column public.chapters.word_count is
  'Whitespace-delimited word count; maintained on insert/update.';

create or replace function public.chapters_set_word_count()
returns trigger
language plpgsql
as $$
begin
  new.word_count := case
    when length(trim(new.content)) = 0 then 0
    else cardinality(regexp_split_to_array(trim(new.content), '\s+'))
  end;
  return new;
end;
$$;

drop trigger if exists chapters_set_word_count on public.chapters;
create trigger chapters_set_word_count
  before insert or update of content on public.chapters
  for each row
  execute function public.chapters_set_word_count();

update public.chapters
set word_count = case
  when length(trim(content)) = 0 then 0
  else cardinality(regexp_split_to_array(trim(content), '\s+'))
end
where word_count = 0 and length(trim(content)) > 0;

-- -----------------------------------------------------------------------------
-- novel_unlock_stats — aggregate translator-visible unlocks by slug
-- Called only from the service-role server (admin dashboard).
-- -----------------------------------------------------------------------------
create or replace function public.novel_unlock_stats(p_slugs text[])
returns table (
  novel_slug text,
  purchase_count bigint,
  coins_earned double precision
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    cu.novel_slug,
    count(*)::bigint as purchase_count,
    coalesce(sum(cu.translator_share), 0)::double precision as coins_earned
  from public.chapter_unlocks cu
  where cu.novel_slug = any (p_slugs)
    and cu.hidden_from_translator = false
  group by cu.novel_slug;
$$;

revoke all on function public.novel_unlock_stats(text[]) from public;
grant execute on function public.novel_unlock_stats(text[]) to service_role;
