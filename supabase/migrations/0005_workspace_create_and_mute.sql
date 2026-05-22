-- Atomic workspace creation for an authenticated user + alert mute window on domains.

create or replace function create_workspace(p_name text, p_slug text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid;
  ws_id uuid;
begin
  uid := auth.uid();
  if uid is null then raise exception 'not authenticated'; end if;

  insert into workspaces (name, slug, owner_id) values (p_name, p_slug, uid) returning id into ws_id;
  insert into workspace_members (workspace_id, user_id, role) values (ws_id, uid, 'owner');
  return ws_id;
end $$;
grant execute on function create_workspace(text, text) to authenticated;

-- Per-domain mute window: when set in the future, dispatcher suppresses alerts.
alter table domains add column if not exists alerts_muted_until timestamptz;
create index if not exists domains_muted_idx on domains(alerts_muted_until) where alerts_muted_until is not null;
