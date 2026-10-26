-- The community board had no posts or votes, and the originals forum
-- tables were already gone. Drop both so neither can be recreated by
-- replaying the earlier migrations without this follow-up.

drop table if exists public.community_post_votes cascade;
drop table if exists public.community_posts cascade;

drop view if exists public.forum_category_overview cascade;
drop table if exists public.forum_notifications cascade;
drop table if exists public.forum_reactions cascade;
drop table if exists public.forum_posts cascade;
drop table if exists public.forum_threads cascade;
drop table if exists public.forum_categories cascade;
drop table if exists public.forum_sections cascade;

drop function if exists public.sync_community_post_vote_count();
drop function if exists public.community_posts_auto_vote();
drop function if exists public.forum_sync_thread_activity();
