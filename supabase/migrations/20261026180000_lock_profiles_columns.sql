-- Signed-in users could previously UPDATE every profiles column (coins, role,
-- ...) through the Data API, since RLS only checks row ownership. The app
-- writes everything except username with the service role, so restrict the
-- API roles to renaming themselves.

revoke insert, update on public.profiles from anon, authenticated;

grant update (username) on public.profiles to authenticated;
