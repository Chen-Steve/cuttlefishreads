-- Per-series launch kit assets for Originals authors (workspace marketing pack).
-- Writes go through the service-role admin client; no client write policies.

create table if not exists public.novel_launch_kits (
  novel_id              uuid        primary key references public.novels (id) on delete cascade,
  short_announcement    text,
  long_announcement     text,
  square_graphic_url    text,
  vertical_graphic_url  text,
  referral_url          text,
  launch_date           date,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.novel_launch_kits enable row level security;

-- No SELECT/INSERT/UPDATE/DELETE policies: launch kits are workspace-only and
-- are read/written with the service-role key (bypasses RLS).

grant select, insert, update, delete on table public.novel_launch_kits to service_role;
