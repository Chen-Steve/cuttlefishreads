-- =============================================================================
-- Translator notes + support links
--
-- Run this after novels.sql and translators.sql. It adds:
--   * profiles.translator_note -> a global message reused on chapters that opt in.
--   * chapters.translator_note -> an optional per-chapter message when a chapter
--     does not use the global note.
--   * chapters.use_global_translator_note -> when true, the chapter shows the
--     profile's global message instead of its own translator_note.
--   * profiles.kofi_url / patreon_url -> a translator's support links, set once
--     in the workspace and reused on every chapter they publish.
--
-- Chapter writes happen server-side with the service-role key, so no chapter RLS
-- changes are needed. The support links live on profiles, which are publicly
-- readable, so the new columns are exposed by the existing select grant.
-- =============================================================================

alter table public.chapters
  add column if not exists translator_note text;

alter table public.chapters
  add column if not exists use_global_translator_note boolean not null default true;

alter table public.profiles
  add column if not exists translator_note text;

alter table public.profiles
  add column if not exists kofi_url text;

alter table public.profiles
  add column if not exists patreon_url text;

-- Chapters that already have a per-chapter note should keep showing it.
update public.chapters
set use_global_translator_note = false
where translator_note is not null
  and btrim(translator_note) <> '';
