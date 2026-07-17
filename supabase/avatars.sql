-- =============================================================================
-- Profile avatars
--
-- Run this after schema.sql. It adds:
--   * profiles.avatar_url -> public URL for the user's profile picture
--   * storage.buckets.avatars -> public bucket for avatar images
--
-- Uploads are done server-side with the service-role key (bypasses RLS) and the
-- bucket is public, so avatars are world-readable without extra storage policies.
-- =============================================================================

alter table public.profiles
  add column if not exists avatar_url text;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;
