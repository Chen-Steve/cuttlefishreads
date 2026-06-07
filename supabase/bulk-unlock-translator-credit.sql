-- -----------------------------------------------------------------------------
-- Fix: bulk_unlock_chapters did not credit the translator.
--
-- The earlier bulk-unlock.sql already contained the 70/30 revenue split, but if
-- only the coins_spent constraint migration was applied (and not the full
-- function body), the live function still deducted coins from the reader without
-- crediting the translator. This file redeploys the function so the translator
-- (publisher_id) reliably receives 70% of the discounted total; the platform
-- keeps the remaining 30%.
--
-- Safe to run repeatedly. Run this whole file (not just parts of it).
-- -----------------------------------------------------------------------------

-- Ensure the relaxed constraint is in place (proportional/discounted per-chapter
-- shares may legitimately round down to 0).
alter table public.chapter_unlocks
  drop constraint if exists chapter_unlocks_coins_spent_check;
alter table public.chapter_unlocks
  add constraint chapter_unlocks_coins_spent_check check (coins_spent >= 0);

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

  -- Deduct full discounted cost from reader.
  update public.profiles
    set coins = coins - v_discounted
    where id = v_user_id;

  -- Credit 70% of the discounted total to the translator; platform keeps 30%.
  if v_publisher_id is not null then
    v_translator_share := floor(v_discounted * 0.7)::integer;
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
