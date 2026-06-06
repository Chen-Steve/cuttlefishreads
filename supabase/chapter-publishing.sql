-- =============================================================================
-- Chapter publishing + import provenance
--
-- Run this after novels.sql. It adds:
--   * is_published — a visibility gate. Chapters default to published so that
--     existing data keeps showing up, but the scrape/translate importer inserts
--     chapters as drafts (is_published = false) so an admin can review and
--     release them on their own schedule.
--   * source_url — the external URL a chapter was scraped from. Used to resume
--     an import without re-translating chapters that were already imported.
--
-- Reads/writes still happen server-side with the service-role key, so no RLS
-- policy changes are required.
-- =============================================================================

alter table public.chapters
  add column if not exists is_published boolean not null default true;

alter table public.chapters
  add column if not exists source_url text;

-- Fast "drafts for this novel" / "next number" lookups during imports.
create index if not exists chapters_published_idx
  on public.chapters (novel_id, is_published);

create index if not exists chapters_source_url_idx
  on public.chapters (novel_id, source_url);
