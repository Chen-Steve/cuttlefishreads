-- Comment inserts and edits go through server actions (service role), which
-- check chapter access, reply depth, and length. Without this, readers could
-- skip those checks by writing to novel_comments through the Data API.
-- Apply only after the server actions that use the service role are deployed.

revoke insert, update on public.novel_comments from anon, authenticated;
