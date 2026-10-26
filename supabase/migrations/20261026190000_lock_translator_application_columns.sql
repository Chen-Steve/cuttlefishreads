-- Applicants could previously insert their own row with status = 'approved'
-- (RLS only checks user_id), and getAdminAccess promotes anyone with an
-- approved application. Only the fields the apply form sends are writable;
-- status and review fields stay at their defaults until an admin reviews.

revoke insert, update on public.translator_applications from anon, authenticated;

grant insert (user_id, username, email, discord, message)
  on public.translator_applications to authenticated;
