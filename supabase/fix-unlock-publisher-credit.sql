-- -----------------------------------------------------------------------------
-- Fix chapter purchase revenue split
--
-- Root cause: unlock_chapter credited novels.publisher_id, but some novels had
-- publisher_id = null (admin create/edit allowed omitting it), so readers were
-- charged and translators received nothing. Production also had an undeclared
-- "every 4th purchase hidden" cut that withheld translator credit.
--
-- This migration:
--   1. Assigns missing publisher_id from profiles.role = 'translator' via
--      novels.translator → profiles.username
--   2. Backfills missed translator_share + profile coin credits
--   3. Rewrites unlock_chapter / bulk_unlock_chapters to require a publisher
--      before deducting coins, always credit exact 70%, and stop hiding purchases
-- -----------------------------------------------------------------------------

-- 1. Repair novels missing a publisher ---------------------------------------
update public.novels n
set publisher_id = p.id
from public.profiles p
where n.publisher_id is null
  and n.translator is not null
  and btrim(n.translator) <> ''
  and p.role = 'translator'
  and lower(p.username) = lower(btrim(n.translator));

-- 2. Backfill missed credits (not the intentional historical hidden rows) ----
with owed as (
  select
    cu.id as unlock_id,
    n.publisher_id,
    round(cu.coins_spent * 0.7, 2) as share
  from public.chapter_unlocks cu
  join public.novels n on n.slug = cu.novel_slug
  where cu.translator_share = 0
    and coalesce(cu.hidden_from_translator, false) = false
    and n.publisher_id is not null
    and cu.coins_spent > 0
),
credited as (
  update public.profiles p
  set coins = p.coins + o.share
  from owed o
  where p.id = o.publisher_id
  returning o.unlock_id, o.share
)
update public.chapter_unlocks cu
set translator_share = c.share
from credited c
where cu.id = c.unlock_id;

-- 3. Single-chapter unlock ---------------------------------------------------
create or replace function public.unlock_chapter(
  p_novel_slug     text,
  p_chapter_number integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id           uuid := auth.uid();
  v_cost              integer;
  v_is_free           boolean;
  v_unlock_at         timestamptz;
  v_publisher_id      uuid;
  v_balance           numeric;
  v_translator_share  numeric := 0;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select c.coin_cost, c.is_free, c.unlock_at, n.publisher_id
    into v_cost, v_is_free, v_unlock_at, v_publisher_id
    from public.chapters c
    join public.novels   n on n.id = c.novel_id
    where n.slug   = p_novel_slug
      and c.number = p_chapter_number;

  if not found then
    raise exception 'Chapter not found';
  end if;

  if v_is_free or v_cost = 0 or (v_unlock_at is not null and v_unlock_at <= now()) then
    return false;
  end if;

  -- Paid chapters must have a publisher — never charge without crediting.
  if v_publisher_id is null then
    raise exception 'This novel has no publisher configured';
  end if;

  if v_publisher_id = v_user_id then
    return false;
  end if;

  if exists (
    select 1 from public.chapter_unlocks
    where user_id        = v_user_id
      and novel_slug     = p_novel_slug
      and chapter_number = p_chapter_number
  ) then
    return false;
  end if;

  select coins into v_balance
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

  -- Exact 70% of list price to the publisher; platform keeps 30%.
  v_translator_share := v_cost * 0.7;
  if v_translator_share > 0 then
    update public.profiles
      set coins = coins + v_translator_share
      where id = v_publisher_id;

    if not found then
      raise exception 'Publisher profile not found';
    end if;
  end if;

  insert into public.chapter_unlocks
    (user_id, novel_slug, chapter_number, coins_spent, translator_share, hidden_from_translator)
  values
    (v_user_id, p_novel_slug, p_chapter_number, v_cost, v_translator_share, false);

  return true;
end;
$$;

revoke all on function public.unlock_chapter(text, integer)
  from public, anon, authenticated;
grant execute on function public.unlock_chapter(text, integer)
  to authenticated;

-- 4. Bulk unlock -------------------------------------------------------------
create or replace function public.bulk_unlock_chapters(
  p_novel_slug text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id          uuid := auth.uid();
  v_publisher_id     uuid;
  v_advanced_count   integer;
  v_balance          numeric;
  v_total_cost       integer := 0;
  v_unlocked_count   integer := 0;
  v_translator_share numeric;
  r                  record;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select n.publisher_id
    into v_publisher_id
    from public.novels n
    where n.slug = p_novel_slug;

  if not found then
    raise exception 'Novel not found';
  end if;

  if v_publisher_id is null then
    raise exception 'This novel has no publisher configured';
  end if;

  if v_publisher_id = v_user_id then
    return jsonb_build_object('unlocked_count', 0, 'coins_spent', 0);
  end if;

  select count(*)
    into v_advanced_count
    from public.chapters c
    join public.novels n on n.id = c.novel_id
    where n.slug = p_novel_slug
      and c.is_free = false;

  if v_advanced_count < 10 then
    raise exception 'Bulk unlock not available for this novel';
  end if;

  for r in
    select c.number, c.coin_cost
    from public.chapters c
    join public.novels n on n.id = c.novel_id
    where n.slug = p_novel_slug
      and c.is_free = false
      and (c.unlock_at is null or c.unlock_at > now())
      and c.coin_cost > 0
      and not exists (
        select 1
        from public.chapter_unlocks cu
        where cu.user_id = v_user_id
          and cu.novel_slug = p_novel_slug
          and cu.chapter_number = c.number
      )
    order by c.number
  loop
    v_total_cost := v_total_cost + r.coin_cost;
    v_unlocked_count := v_unlocked_count + 1;
  end loop;

  if v_unlocked_count = 0 then
    return jsonb_build_object('unlocked_count', 0, 'coins_spent', 0);
  end if;

  select coins
    into v_balance
    from public.profiles
    where id = v_user_id
    for update;

  if v_balance is null then
    raise exception 'Profile not found';
  end if;

  if v_balance < v_total_cost then
    raise exception 'Insufficient coins (have %, need %)', v_balance, v_total_cost;
  end if;

  update public.profiles
    set coins = coins - v_total_cost
    where id = v_user_id;

  v_translator_share := v_total_cost * 0.7;
  if v_translator_share > 0 then
    update public.profiles
      set coins = coins + v_translator_share
      where id = v_publisher_id;

    if not found then
      raise exception 'Publisher profile not found';
    end if;
  end if;

  for r in
    select c.number, c.coin_cost
    from public.chapters c
    join public.novels n on n.id = c.novel_id
    where n.slug = p_novel_slug
      and c.is_free = false
      and (c.unlock_at is null or c.unlock_at > now())
      and c.coin_cost > 0
      and not exists (
        select 1
        from public.chapter_unlocks cu
        where cu.user_id = v_user_id
          and cu.novel_slug = p_novel_slug
          and cu.chapter_number = c.number
      )
    order by c.number
  loop
    insert into public.chapter_unlocks
      (user_id, novel_slug, chapter_number, coins_spent, translator_share, hidden_from_translator)
    values
      (
        v_user_id,
        p_novel_slug,
        r.number,
        r.coin_cost,
        r.coin_cost * 0.7,
        false
      );
  end loop;

  return jsonb_build_object(
    'unlocked_count', v_unlocked_count,
    'coins_spent', v_total_cost
  );
end;
$$;

revoke all on function public.bulk_unlock_chapters(text)
  from public, anon, authenticated;
grant execute on function public.bulk_unlock_chapters(text)
  to authenticated;
