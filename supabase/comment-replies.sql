-- =============================================================================
-- Comment replies (translator threads)
--
-- Run this after comments.sql. Adds a self-referencing parent_id to
-- novel_comments so translators can reply to reader comments. Replies are
-- ordinary comment rows whose parent_id points at the comment being answered.
--
-- No new RLS or grants are needed: the existing "Users can create their own
-- comments" insert policy already lets an authenticated translator post a reply
-- as themselves, and the reply server action enforces that only the novel's
-- publisher (or a master admin) may reply.
-- =============================================================================

alter table public.novel_comments
  add column if not exists parent_id uuid
    references public.novel_comments (id) on delete cascade;

create index if not exists novel_comments_parent_id_idx
  on public.novel_comments (parent_id);
