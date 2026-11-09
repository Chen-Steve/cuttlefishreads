-- Translator access is granted when an application is approved. Repair rows
-- that were approved before that write existed, then stop exposing the
-- self-serve repair function. Page views no longer change profiles.role.

update public.profiles as profile
set role = 'translator',
    updated_at = now()
from public.translator_applications as application
where application.user_id = profile.id
  and application.status = 'approved'
  and profile.role is distinct from 'translator';

insert into public.profiles (id, role)
select application.user_id, 'translator'
from public.translator_applications as application
where application.status = 'approved'
  and not exists (
    select 1
    from public.profiles as profile
    where profile.id = application.user_id
  );

drop function if exists public.sync_own_translator_role();
