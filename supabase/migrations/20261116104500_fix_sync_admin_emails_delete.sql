-- sync_admin_emails() replaced the allowlist with `delete from private.admin_emails`,
-- which Postgres rejects ("DELETE requires a WHERE clause"). The call failed,
-- the allowlist stayed empty, and master-admin policies hid every application.
-- An empty input must not clear the table either.

create or replace function public.sync_admin_emails(p_emails text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_emails text[];
begin
  if current_user is distinct from 'service_role'
     and coalesce(auth.jwt() ->> 'role', '') is distinct from 'service_role' then
    raise exception 'not allowed';
  end if;

  select coalesce(array_agg(distinct lower(btrim(email))), array[]::text[])
    into v_emails
  from unnest(coalesce(p_emails, array[]::text[])) as email
  where btrim(email) <> '';

  if coalesce(array_length(v_emails, 1), 0) = 0 then
    return;
  end if;

  delete from private.admin_emails
  where email is not null;

  insert into private.admin_emails (email)
  select unnest(v_emails);
end;
$$;

revoke all on function public.sync_admin_emails(text[]) from public, anon, authenticated;
grant execute on function public.sync_admin_emails(text[]) to service_role;
