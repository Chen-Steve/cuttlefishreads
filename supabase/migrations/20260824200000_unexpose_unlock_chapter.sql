-- Stop exposing unlock_chapter as a SECURITY DEFINER RPC to signed-in users
-- (lint 0029_authenticated_security_definer_function_executable).
-- The Next.js server action is the only caller: it verifies the session, then
-- invokes this function as service_role with that user's id.
--
-- p_user_id is trusted only from service_role. If a user JWT somehow reaches
-- this function, identity comes from auth.uid() and p_user_id is ignored.

drop function if exists public.unlock_chapter(text, integer);
drop function if exists public.unlock_chapter(text, integer, uuid);

create or replace function public.unlock_chapter(
  p_novel_slug     text,
  p_chapter_number integer,
  p_user_id        uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id           uuid;
  v_cost              integer;
  v_is_free           boolean;
  v_unlock_at         timestamptz;
  v_publisher_id      uuid;
  v_balance           numeric;
  v_translator_share  numeric := 0;
  v_prior_count       integer := 0;
  v_hidden            boolean := false;
begin
  if auth.role() = 'service_role' then
    v_user_id := p_user_id;
  else
    v_user_id := auth.uid();
  end if;

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

revoke all on function public.unlock_chapter(text, integer, uuid)
  from public, anon, authenticated;
grant execute on function public.unlock_chapter(text, integer, uuid)
  to service_role;
