-- Soft-dismiss keeps the unique dedupe key so rematerializing today's
-- chapter_released alerts cannot recreate a notification the user cleared.
alter table public.notifications
  add column if not exists dismissed_at timestamptz;

drop index if exists public.notifications_unread_idx;
create index notifications_unread_idx
  on public.notifications (user_id)
  where read_at is null and dismissed_at is null;

revoke update on public.notifications from authenticated;
grant update (read_at, dismissed_at) on public.notifications to authenticated;
