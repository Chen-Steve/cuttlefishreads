-- =============================================================================
-- Originals: publication type support
--
-- Adds a required publication_type to novels so original fiction can be
-- filtered separately from translated works.
--   * Existing rows are backfilled as 'translation' (site default).
--   * New original submissions set 'original' from the app; language is
--     forced to English in application code (not a UI choice).
-- Also records the author's ownership confirmation timestamp for originals.
-- =============================================================================

alter table public.novels
  add column if not exists publication_type text
    not null
    default 'translation'
    check (publication_type in ('original', 'translation'));

-- Backfill is implicit via the default; make it explicit for clarity.
update public.novels
  set publication_type = 'translation'
  where publication_type is null;

-- Stored when an author confirms "I own this work or have the legal right to
-- publish it." Null for translations.
alter table public.novels
  add column if not exists ownership_confirmed_at timestamptz;

-- Existing language column is CJK-only; originals store language = 'English'
-- automatically in the app, so the check must allow that value.
alter table public.novels
  drop constraint if exists novels_language_check;
alter table public.novels
  add constraint novels_language_check
    check (language in ('Chinese', 'Japanese', 'Korean', 'English'));

-- Discovery queries filter by type and sort by recency.
create index if not exists novels_publication_type_idx
  on public.novels (publication_type, status, updated_at desc);
