-- =============================================================================
-- Public profiles
--
-- Run this after schema.sql, novels.sql and bookmarks.sql. It opens up the
-- pieces of a user's account that are meant to be public — their username and
-- the novels they have bookmarked — so anyone can view another reader's
-- profile at /u/<username>.
--
-- Privacy boundary:
--   * profiles.username  -> public (already select-granted to anon/authenticated)
--   * bookmarks          -> public (this file)
--   * coin_purchases     -> PRIVATE. Purchase history stays owner-only (its
--                           select policy in schema.sql is intentionally left
--                           untouched), so it is never exposed on a profile.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- bookmarks: allow anyone to read any user's bookmarks.
-- Replaces the owner-only select policy from bookmarks.sql. Insert/delete stay
-- owner-only so users can still only modify their own library.
-- -----------------------------------------------------------------------------
drop policy if exists "Users can view their own bookmarks" on public.bookmarks;
drop policy if exists "Bookmarks are publicly readable" on public.bookmarks;
create policy "Bookmarks are publicly readable"
  on public.bookmarks for select to anon, authenticated
  using ( true );

-- Anonymous (logged-out) visitors can also browse public profiles.
grant select on public.bookmarks to anon;
