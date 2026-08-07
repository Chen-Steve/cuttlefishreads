-- Allow recipients to delete their own notification rows.
drop policy if exists "Members delete their own notifications" on public.notifications;
create policy "Members delete their own notifications"
  on public.notifications for delete to authenticated
  using ( (select auth.uid()) = user_id );

grant delete on public.notifications to authenticated;
