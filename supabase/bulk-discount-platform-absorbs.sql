-- -----------------------------------------------------------------------------
-- Platform absorbs the bulk-buy discount; record the exact translator share
--
-- Previously a bulk purchase credited the translator 70% of the *discounted*
-- total, so the translator effectively ate part of the 10% discount. The
-- translator should instead earn 70% of the full list price, with the platform
-- absorbing the entire discount:
--
--   reader pays      = 90% of list (unchanged)
--   translator earns = 70% of list
--   platform keeps   = 20% of list  (i.e. it eats the 10% discount)
--
-- To report earnings accurately (coins_spent reflects the discounted amount the
-- reader actually paid), we also persist the credited translator share per
-- unlock in a new column and sum that on the dashboard.
--
-- Assumes profiles.coins is already numeric (see fractional-revenue-split.sql).
-- Safe to run repeatedly. Run this whole file.
-- -----------------------------------------------------------------------------

-- Per-unlock record of what the translator was actually credited.
alter table public.chapter_unlocks
  add column if not exists translator_share numeric(14, 2) not null default 0;

-- Backfill: novels with a publisher historically credited ~70% of coins_spent.
update public.chapter_unlocks cu
  set translator_share = round(cu.coins_spent * 0.7, 2)
  from public.novels n
  where n.slug = cu.novel_slug
    and n.publisher_id is not null
    and cu.translator_share = 0;

-- Single-chapter unlock -------------------------------------------------------
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

  if v_publisher_id is not null and v_publisher_id = v_user_id then
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

  if v_balance < v_cost then
    raise exception 'Insufficient coins (have %, need %)', v_balance, v_cost;
  end if;

  update public.profiles
    set coins = coins - v_cost
    where id = v_user_id;

  -- Exact 70% of the (undiscounted) chapter price goes to the translator.
  if v_publisher_id is not null then
    v_translator_share := v_cost * 0.7;
    if v_translator_share > 0 then
      update public.profiles
        set coins = coins + v_translator_share
        where id = v_publisher_id;
    end if;
  end if;

  insert into public.chapter_unlocks
    (user_id, novel_slug, chapter_number, coins_spent, translator_share)
  values
    (v_user_id, p_novel_slug, p_chapter_number, v_cost, v_translator_share);

  return true;
end;
$$;

revoke all on function public.unlock_chapter(text, integer)
  from public, anon, authenticated;
grant execute on function public.unlock_chapter(text, integer)
  to authenticated;

-- Bulk unlock -----------------------------------------------------------------
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
  v_discounted       integer;
  v_unlocked_count   integer := 0;
  v_spent_so_far     integer := 0;
  v_chapter_spend    integer;
  v_row_share        numeric;
  v_last_number      integer;
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

  if v_publisher_id is not null and v_publisher_id = v_user_id then
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
    v_last_number := r.number;
  end loop;

  if v_unlocked_count = 0 then
    return jsonb_build_object('unlocked_count', 0, 'coins_spent', 0);
  end if;

  v_discounted := floor(v_total_cost * 0.9);

  select coins
    into v_balance
    from public.profiles
    where id = v_user_id
    for update;

  if v_balance < v_discounted then
    raise exception 'Insufficient coins (have %, need %)', v_balance, v_discounted;
  end if;

  -- Reader pays the discounted total.
  update public.profiles
    set coins = coins - v_discounted
    where id = v_user_id;

  -- Translator earns 70% of the FULL list price; the platform absorbs the
  -- entire discount (platform keeps v_discounted - 0.7 * v_total_cost).
  if v_publisher_id is not null then
    v_translator_share := v_total_cost * 0.7;
    if v_translator_share > 0 then
      update public.profiles
        set coins = coins + v_translator_share
        where id = v_publisher_id;
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
    if r.number = v_last_number then
      v_chapter_spend := greatest(v_discounted - v_spent_so_far, 0);
    else
      v_chapter_spend := floor(v_discounted * r.coin_cost::numeric / v_total_cost);
      v_spent_so_far := v_spent_so_far + v_chapter_spend;
    end if;

    -- Per-row share is 70% of that chapter's full price, so the rows sum to the
    -- lump credit above (0.7 * v_total_cost).
    if v_publisher_id is not null then
      v_row_share := r.coin_cost * 0.7;
    else
      v_row_share := 0;
    end if;

    insert into public.chapter_unlocks
      (user_id, novel_slug, chapter_number, coins_spent, translator_share)
    values
      (v_user_id, p_novel_slug, r.number, v_chapter_spend, v_row_share);
  end loop;

  return jsonb_build_object(
    'unlocked_count', v_unlocked_count,
    'coins_spent', v_discounted
  );
end;
$$;

revoke all on function public.bulk_unlock_chapters(text)
  from public, anon, authenticated;
grant execute on function public.bulk_unlock_chapters(text)
  to authenticated;
