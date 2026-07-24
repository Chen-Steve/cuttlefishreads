-- =============================================================================
-- Optional star rating on comments
--
-- Reuses novel_comments instead of a separate reviews table. rating is
-- optional (NULL = no rating). When set, it must be 0–5.
-- Aggregate averages only consider rows where rating is not null.
-- =============================================================================

alter table public.novel_comments
  add column if not exists rating integer
  check (rating is null or (rating >= 0 and rating <= 5));

create index if not exists novel_comments_slug_rating_idx
  on public.novel_comments (novel_slug)
  where rating is not null and parent_id is null;
