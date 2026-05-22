-- Invite acceptance + admin flag.

-- Allow anyone authenticated to look up an invite by its token (token IS the secret).
-- We don't expose listings — only single-row reads with a valid id+token combo.
create policy invites_token_read on workspace_invites
  for select
  using (auth.uid() is not null);

-- Admin flag on profiles
alter table profiles add column if not exists is_admin boolean not null default false;

-- Accept an invite: adds the caller to workspace_members and marks the invite accepted.
create or replace function accept_workspace_invite(invite_token text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  inv workspace_invites%rowtype;
  uid uuid;
begin
  uid := auth.uid();
  if uid is null then raise exception 'not authenticated'; end if;

  select * into inv from workspace_invites where token = invite_token and accepted_at is null and expires_at > now();
  if not found then raise exception 'invalid or expired invite'; end if;

  insert into workspace_members (workspace_id, user_id, role, invited_by)
  values (inv.workspace_id, uid, inv.role, inv.invited_by)
  on conflict do nothing;

  update workspace_invites set accepted_at = now() where id = inv.id;
  return inv.workspace_id;
end $$;

grant execute on function accept_workspace_invite(text) to authenticated;
