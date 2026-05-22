-- Atomic, race-safe default-workspace provisioning.
-- Replaces the JS multi-step insert that produced duplicates under
-- concurrent first-load requests.

create or replace function ensure_default_workspace(p_name text, p_slug text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid;
  ws_id uuid;
begin
  uid := auth.uid();
  if uid is null then raise exception 'not authenticated'; end if;

  -- Lock the profile row to serialize concurrent callers for this user.
  select default_workspace_id into ws_id from profiles where id = uid for update;
  if ws_id is not null then return ws_id; end if;

  -- The user might be a member of someone else's workspace already (invite flow).
  select workspace_id into ws_id from workspace_members
    where user_id = uid order by joined_at limit 1;
  if ws_id is not null then
    update profiles set default_workspace_id = ws_id where id = uid;
    return ws_id;
  end if;

  insert into workspaces (name, slug, owner_id) values (p_name, p_slug, uid) returning id into ws_id;
  insert into workspace_members (workspace_id, user_id, role) values (ws_id, uid, 'owner');
  update profiles set default_workspace_id = ws_id where id = uid;
  return ws_id;
end $$;

grant execute on function ensure_default_workspace(text, text) to authenticated;
