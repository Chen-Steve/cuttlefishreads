create table if not exists public.profiles (
  id         uuid        primary key references auth.users (id) on delete cascade,
  username   text        unique,
  coins      integer     not null default 0 check (coins >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- coin_purchases
-- Simple receipt table. One row per completed PayPal purchase.
-- Written server-side only (via the PayPal capture route) so the client never
-- touches it directly.
-- -----------------------------------------------------------------------------
create table if not exists public.coin_purchases (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        not null references auth.users (id) on delete cascade,
  package_id          text        not null,   -- e.g. 'pack_enthusiast' or 'pack_custom'
  coins               integer     not null check (coins > 0),  -- total coins credited incl. bonus
  amount_cents        integer     not null check (amount_cents > 0),
  paypal_order_id     text        not null unique,
  paypal_capture_id   text        not null unique,
  created_at          timestamptz not null default now()
);

create index if not exists coin_purchases_user_id_idx on public.coin_purchases (user_id);

alter table public.coin_purchases enable row level security;

-- Users can read their own purchase history (e.g. for a receipts page).
drop policy if exists "Users can view their own purchases" on public.coin_purchases;
create policy "Users can view their own purchases"
  on public.coin_purchases for select to authenticated
  using ( (select auth.uid()) = user_id );

-- No insert/update policy — rows are created exclusively by the server via
-- credit_coins(), which runs as SECURITY DEFINER.


-- -----------------------------------------------------------------------------
-- chapter_unlocks
-- Audit trail of every chapter a user has unlocked with coins.
-- Also used to gate chapter access — if a row exists for (user_id, novel_slug,
-- chapter_number) the user may read that chapter.
-- Rows are created exclusively by unlock_chapter() so coins and the unlock
-- record are always updated atomically.
-- -----------------------------------------------------------------------------
create table if not exists public.chapter_unlocks (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references auth.users (id) on delete cascade,
  novel_slug     text        not null,
  chapter_number integer     not null check (chapter_number > 0),
  coins_spent    integer     not null check (coins_spent > 0),
  created_at     timestamptz not null default now(),

  unique (user_id, novel_slug, chapter_number)  -- prevents duplicate unlocks
);

create index if not exists chapter_unlocks_user_id_idx
  on public.chapter_unlocks (user_id);
create index if not exists chapter_unlocks_novel_idx
  on public.chapter_unlocks (novel_slug, chapter_number);

alter table public.chapter_unlocks enable row level security;

-- Users can read their own unlocks (to check access and show unlock history).
drop policy if exists "Users can view their own unlocks" on public.chapter_unlocks;
create policy "Users can view their own unlocks"
  on public.chapter_unlocks for select to authenticated
  using ( (select auth.uid()) = user_id );

-- No insert/update policy — rows are created exclusively by unlock_chapter().


-- -----------------------------------------------------------------------------
-- credit_coins(p_user_id, p_package_id, p_coins, p_amount_cents,
--              p_paypal_order_id, p_paypal_capture_id)
--
-- Called server-side after PayPal capture succeeds. Atomically:
--   1. Credits coins to the user's profile.
--   2. Inserts a coin_purchases receipt.
-- ON CONFLICT on paypal_capture_id makes the function idempotent — safe if a
-- PayPal webhook fires more than once.
-- -----------------------------------------------------------------------------
create or replace function public.credit_coins(
  p_user_id           uuid,
  p_package_id        text,
  p_coins             integer,
  p_amount_cents      integer,
  p_paypal_order_id   text,
  p_paypal_capture_id text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Idempotent: if this capture was already processed, do nothing.
  if exists (
    select 1 from public.coin_purchases
    where paypal_capture_id = p_paypal_capture_id
  ) then
    return;
  end if;

  update public.profiles
    set coins = coins + p_coins
    where id = p_user_id;

  insert into public.coin_purchases
    (user_id, package_id, coins, amount_cents, paypal_order_id, paypal_capture_id)
  values
    (p_user_id, p_package_id, p_coins, p_amount_cents, p_paypal_order_id, p_paypal_capture_id);
end;
$$;

revoke all on function public.credit_coins(uuid, text, integer, integer, text, text)
  from public, anon, authenticated;
-- The server (PayPal capture route) calls this via the Supabase secret key,
-- which authenticates as service_role. Grant it execute explicitly.
grant execute on function public.credit_coins(uuid, text, integer, integer, text, text)
  to service_role;


-- -----------------------------------------------------------------------------
-- unlock_chapter(p_novel_slug, p_chapter_number, p_coins_cost)
--
-- Called server-side when a user spends coins to unlock a chapter. Atomically:
--   1. Checks the user has enough coins (raises an error if not).
--   2. Deducts coins from profiles.
--   3. Inserts a chapter_unlocks row.
-- ON CONFLICT on (user_id, novel_slug, chapter_number) means unlocking an
-- already-unlocked chapter is a no-op — coins are only deducted once.
-- Returns true if coins were spent, false if the chapter was already unlocked.
-- -----------------------------------------------------------------------------
create or replace function public.unlock_chapter(
  p_novel_slug     text,
  p_chapter_number integer,
  p_coins_cost     integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_balance integer;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Already unlocked — nothing to do.
  if exists (
    select 1 from public.chapter_unlocks
    where user_id       = v_user_id
      and novel_slug    = p_novel_slug
      and chapter_number = p_chapter_number
  ) then
    return false;
  end if;

  -- Lock the profile row and read the balance.
  select coins into v_balance
    from public.profiles
    where id = v_user_id
    for update;

  if v_balance < p_coins_cost then
    raise exception 'Insufficient coins (have %, need %)', v_balance, p_coins_cost;
  end if;

  update public.profiles
    set coins = coins - p_coins_cost
    where id = v_user_id;

  insert into public.chapter_unlocks
    (user_id, novel_slug, chapter_number, coins_spent)
  values
    (v_user_id, p_novel_slug, p_chapter_number, p_coins_cost);

  return true;
end;
$$;

revoke all on function public.unlock_chapter(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.unlock_chapter(text, integer, integer)
  to authenticated;


-- -----------------------------------------------------------------------------
-- Data API grants
-- -----------------------------------------------------------------------------
grant usage  on schema public to anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant select on public.coin_purchases to authenticated;
grant select on public.chapter_unlocks to authenticated;
