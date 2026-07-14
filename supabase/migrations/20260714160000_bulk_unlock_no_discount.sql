-- Remove bulk-buy discount: charge full list price.
-- Translator earns 70% of list; platform keeps 30%.

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
  end loop;

  if v_unlocked_count = 0 then
    return jsonb_build_object('unlocked_count', 0, 'coins_spent', 0);
  end if;

  select coins
    into v_balance
    from public.profiles
    where id = v_user_id
    for update;

  if v_balance < v_total_cost then
    raise exception 'Insufficient coins (have %, need %)', v_balance, v_total_cost;
  end if;

  update public.profiles
    set coins = coins - v_total_cost
    where id = v_user_id;

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
    insert into public.chapter_unlocks
      (user_id, novel_slug, chapter_number, coins_spent, translator_share)
    values
      (
        v_user_id,
        p_novel_slug,
        r.number,
        r.coin_cost,
        case when v_publisher_id is not null then r.coin_cost * 0.7 else 0 end
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
