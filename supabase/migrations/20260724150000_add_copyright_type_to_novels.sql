-- =============================================================================
-- Originals: copyright type
--
-- Authors choose how their original work is licensed when creating/editing a
-- series. Replaces the previous ownership confirmation checkbox in the form.
-- Null for translations and any legacy rows that predate this column.
-- =============================================================================

alter table public.novels
  add column if not exists copyright_type text
    check (
      copyright_type is null
      or copyright_type in (
        'all_rights_reserved',
        'public_domain',
        'creative_commons'
      )
    );
