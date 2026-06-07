-- -----------------------------------------------------------------------------
-- Exact 70/30 revenue split (round to nearest, not floor)
--
-- Previously the translator's 70% share was computed with floor(), which always
-- rounded down and quietly handed the fractional remainder to the platform.
-- This redefines both unlock paths to use round() so the translator receives the
-- exact 70% when it divides evenly, and the nearest whole coin otherwise.
-- (profiles.coins is an integer column, so a non-divisible share must still land
-- on a whole number — round() is the closest possible to an exact split.)
--
-- Safe to run repeatedly. Run this whole file.
-- -----------------------------------------------------------------------------

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
  v_balance           integer;
  v_translator_share  integer;
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

  -- Credit 70% (rounded to nearest coin) to the translator.
  if v_publisher_id is not null then
    v_translator_share := round(v_cost * 0.7)::integer;
    if v_translator_share > 0 then
      update public.profiles
        set coins = coins + v_translator_share
        where id = v_publisher_id;
    end if;
  end if;

  insert into public.chapter_unlocks
    (user_id, novel_slug, chapter_number, coins_spent)
  values
    (v_user_id, p_novel_slug, p_chapter_number, v_cost);

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
  v_balance          integer;
  v_total_cost       integer := 0;
  v_discounted       integer;
  v_unlocked_count   integer := 0;
  v_spent_so_far     integer := 0;
  v_chapter_spend    integer;
  v_last_number      integer;
  v_translator_share integer;
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

  update public.profiles
    set coins = coins - v_discounted
    where id = v_user_id;

  -- Credit 70% (rounded to nearest coin) of the discounted total to the translator.
  if v_publisher_id is not null then
    v_translator_share := round(v_discounted * 0.7)::integer;
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

    insert into public.chapter_unlocks
      (user_id, novel_slug, chapter_number, coins_spent)
    values
      (v_user_id, p_novel_slug, r.number, v_chapter_spend);
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
