-- Skip duplicates within the batch instead of retrying every recipient.
-- No SECURITY DEFINER: only the existing service role can execute this RPC.
create or replace function public.batch_insert_notifications(p_rows jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  inserted integer;
begin
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'Expected a notification array' using errcode = '22023';
  end if;
  if jsonb_array_length(p_rows) > 500 then
    raise exception 'At most 500 notifications per batch' using errcode = '22023';
  end if;

  insert into public.notifications (
    user_id, actor_id, type, comment_id, reply_id, novel_id, chapter_number
  )
  select r.user_id, r.actor_id, r.type, r.comment_id, r.reply_id, r.novel_id, r.chapter_number
  from jsonb_to_recordset(p_rows) as r(
    user_id uuid, actor_id uuid, type text, comment_id uuid, reply_id uuid,
    novel_id uuid, chapter_number integer
  )
  where r.actor_id is null or r.actor_id <> r.user_id
  on conflict do nothing;

  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

revoke all on function public.batch_insert_notifications(jsonb) from public, anon, authenticated;
grant execute on function public.batch_insert_notifications(jsonb) to service_role;

comment on function public.batch_insert_notifications(jsonb) is
  'Server-only inbox insert: skip duplicates and self-notifications in batches of at most 500.';
