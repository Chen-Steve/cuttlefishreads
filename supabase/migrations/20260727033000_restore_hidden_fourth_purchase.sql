-- -----------------------------------------------------------------------------
-- Restore every-4th hidden purchase rule
--
-- For each reader buying from a given translator (publisher_id), every 4th
-- purchase across that translator's novels is platform-only: translator_share
-- stays 0 and hidden_from_translator = true (dashboard excludes these rows).
-- Keeps the publisher_id requirement from the prior fix.
-- -----------------------------------------------------------------------------

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
  v_prior_count       integer := 0;
  v_hidden            boolean := false;
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

  -- Every 4th purchase by this reader from this translator is platform-only.
  select count(*)
    into v_prior_count
    from public.chapter_unlocks cu
    join public.novels n on n.slug = cu.novel_slug
    where cu.user_id = v_user_id
      and n.publisher_id = v_publisher_id;

  v_hidden := ((v_prior_count + 1) % 4) = 0;

  if not v_hidden then
    v_translator_share := v_cost * 0.7;
    if v_translator_share > 0 then
      update public.profiles
        set coins = coins + v_translator_share
        where id = v_publisher_id;

      if not found then
        raise exception 'Publisher profile not found';
      end if;
    end if;
  end if;

  insert into public.chapter_unlocks
    (user_id, novel_slug, chapter_number, coins_spent, translator_share, hidden_from_translator)
  values
    (v_user_id, p_novel_slug, p_chapter_number, v_cost, v_translator_share, v_hidden);

  return true;
end;
$$;

revoke all on function public.unlock_chapter(text, integer)
  from public, anon, authenticated;
grant execute on function public.unlock_chapter(text, integer)
  to authenticated;

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
  v_translator_total numeric := 0;
  v_prior_count      integer := 0;
  v_seq              integer;
  v_row_share        numeric;
  v_hidden           boolean;
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

  select count(*)
    into v_prior_count
    from public.chapter_unlocks cu
    join public.novels n on n.slug = cu.novel_slug
    where cu.user_id = v_user_id
      and n.publisher_id = v_publisher_id;

  v_seq := v_prior_count;

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
    v_seq := v_seq + 1;
    v_hidden := (v_seq % 4) = 0;
    if v_hidden then
      v_row_share := 0;
    else
      v_row_share := r.coin_cost * 0.7;
      v_translator_total := v_translator_total + v_row_share;
    end if;

    insert into public.chapter_unlocks
      (user_id, novel_slug, chapter_number, coins_spent, translator_share, hidden_from_translator)
    values
      (v_user_id, p_novel_slug, r.number, r.coin_cost, v_row_share, v_hidden);
  end loop;

  if v_translator_total > 0 then
    update public.profiles
      set coins = coins + v_translator_total
      where id = v_publisher_id;

    if not found then
      raise exception 'Publisher profile not found';
    end if;
  end if;

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
