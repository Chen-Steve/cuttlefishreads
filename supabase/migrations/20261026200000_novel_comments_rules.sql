-- Rules the app already enforces, now enforced by the database too.

alter table public.novel_comments
  add constraint novel_comments_body_length
    check (char_length(body) <= 2000),
  add constraint novel_comments_rating_top_level
    check (rating is null or (parent_id is null and chapter_number is null));

-- One rating per reader per novel (createComment clears the old one first).
create unique index if not exists novel_comments_one_rating_per_user
  on public.novel_comments (user_id, novel_slug)
  where rating is not null and parent_id is null;
