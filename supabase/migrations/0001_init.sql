-- Domain Monitor — initial schema
-- Multi-tenant: every row is scoped to a workspace; RLS enforces isolation.

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- =========================================================================
-- ENUMS
-- =========================================================================
create type workspace_role as enum ('owner', 'admin', 'member', 'viewer');
create type plan_tier as enum ('free', 'pro', 'business');
create type domain_status as enum ('active', 'pending_check', 'expired', 'grace_period', 'redemption', 'unknown', 'archived');
create type monitor_kind as enum ('expiry', 'whois', 'nameservers', 'registrar', 'status', 'dns', 'availability');
create type event_severity as enum ('info', 'warning', 'critical');
create type channel_kind as enum ('email', 'slack', 'discord', 'telegram', 'webhook');
create type notification_status as enum ('queued', 'sent', 'failed', 'suppressed');
create type job_status as enum ('queued', 'running', 'succeeded', 'failed');

-- =========================================================================
-- USERS / WORKSPACES
-- =========================================================================
-- Mirrors auth.users (Supabase). We don't duplicate identity; we add profile.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email citext unique not null,
  full_name text,
  avatar_url text,
  default_workspace_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug citext unique not null,
  plan plan_tier not null default 'free',
  owner_id uuid not null references profiles(id) on delete restrict,
  domain_limit int not null default 25,
  check_interval_minutes int not null default 1440,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table profiles add constraint profiles_default_ws_fk
  foreign key (default_workspace_id) references workspaces(id) on delete set null;

create table workspace_members (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role workspace_role not null default 'member',
  invited_by uuid references profiles(id),
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index on workspace_members(user_id);

create table workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  email citext not null,
  role workspace_role not null default 'member',
  token text not null unique,
  invited_by uuid references profiles(id),
  accepted_at timestamptz,
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now()
);
create index on workspace_invites(workspace_id);
create index on workspace_invites(email);

-- =========================================================================
-- DOMAINS
-- =========================================================================
create table domains (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  added_by uuid references profiles(id),
  name citext not null,
  registrar text,
  registrar_url text,
  registration_date date,
  expiration_date date,
  last_updated_date date,
  nameservers text[] not null default '{}',
  status domain_status not null default 'pending_check',
  status_flags text[] not null default '{}',
  monitor_flags monitor_kind[] not null default array['expiry','whois','nameservers']::monitor_kind[],
  alert_thresholds int[] not null default '{90,60,30,14,7,3,1}',
  check_interval_minutes int,
  notes text,
  last_checked_at timestamptz,
  next_check_at timestamptz,
  last_change_summary text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, name)
);
create index on domains(workspace_id);
create index on domains(expiration_date);
create index on domains(next_check_at) where archived_at is null;
create index on domains(name);
create index on domains(status);

create table domain_snapshots (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references domains(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  taken_at timestamptz not null default now(),
  whois_raw text,
  whois_parsed jsonb,
  dns_records jsonb,
  nameservers text[],
  registrar text,
  expiration_date date,
  status text[]
);
create index on domain_snapshots(domain_id, taken_at desc);
create index on domain_snapshots(workspace_id);

create table domain_events (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references domains(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  kind monitor_kind not null,
  severity event_severity not null default 'info',
  title text not null,
  message text,
  before jsonb,
  after jsonb,
  occurred_at timestamptz not null default now(),
  dedupe_key text,
  unique (domain_id, kind, dedupe_key)
);
create index on domain_events(workspace_id, occurred_at desc);
create index on domain_events(domain_id, occurred_at desc);
create index on domain_events(kind);

-- =========================================================================
-- TAGS
-- =========================================================================
create table tags (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name citext not null,
  color text not null default '#4338ca',
  unique (workspace_id, name)
);

create table domain_tags (
  domain_id uuid not null references domains(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (domain_id, tag_id)
);

-- =========================================================================
-- ALERTS / NOTIFICATIONS
-- =========================================================================
create table alert_rules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  enabled boolean not null default true,
  applies_to_domain_id uuid references domains(id) on delete cascade,
  applies_to_tag_id uuid references tags(id) on delete cascade,
  kinds monitor_kind[] not null,
  min_severity event_severity not null default 'info',
  channel_ids uuid[] not null default '{}',
  suppression_minutes int not null default 60,
  digest boolean not null default false,
  created_at timestamptz not null default now()
);
create index on alert_rules(workspace_id);

create table notification_channels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  kind channel_kind not null,
  name text not null,
  config jsonb not null,           -- encrypted at app layer for secrets
  enabled boolean not null default true,
  last_test_at timestamptz,
  last_test_ok boolean,
  created_at timestamptz not null default now()
);
create index on notification_channels(workspace_id);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  channel_id uuid references notification_channels(id) on delete set null,
  event_id uuid references domain_events(id) on delete set null,
  rule_id uuid references alert_rules(id) on delete set null,
  status notification_status not null default 'queued',
  attempt int not null default 0,
  error text,
  payload jsonb,
  scheduled_for timestamptz not null default now(),
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);
create index on notifications(workspace_id, created_at desc);
create index on notifications(status, scheduled_for);

-- =========================================================================
-- API KEYS / AUDIT / IMPORTS / JOBS
-- =========================================================================
create table api_keys (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  created_by uuid references profiles(id),
  name text not null,
  key_hash text not null,          -- sha256 hex of key
  key_prefix text not null,        -- first 8 chars for display
  scopes text[] not null default array['read','write']::text[],
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index on api_keys(workspace_id);
create unique index on api_keys(key_hash);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  actor_id uuid references profiles(id),
  actor_kind text not null default 'user',  -- 'user' | 'api_key' | 'system'
  action text not null,
  target_kind text,
  target_id uuid,
  ip inet,
  user_agent text,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index on audit_logs(workspace_id, created_at desc);

create table imports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  created_by uuid references profiles(id),
  filename text,
  total int not null default 0,
  succeeded int not null default 0,
  failed int not null default 0,
  errors jsonb,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  domain_id uuid references domains(id) on delete cascade,
  kind text not null,
  status job_status not null default 'queued',
  attempt int not null default 0,
  scheduled_for timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  error text,
  result jsonb,
  created_at timestamptz not null default now()
);
create index on jobs(status, scheduled_for);
create index on jobs(workspace_id, created_at desc);

-- =========================================================================
-- HELPERS
-- =========================================================================
create or replace function is_workspace_member(ws uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from workspace_members
    where workspace_id = ws and user_id = auth.uid()
  );
$$;

create or replace function workspace_role_of(ws uuid) returns workspace_role
language sql stable security definer set search_path = public as $$
  select role from workspace_members
  where workspace_id = ws and user_id = auth.uid();
$$;

create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger trg_workspaces_touch before update on workspaces
  for each row execute function touch_updated_at();
create trigger trg_domains_touch before update on domains
  for each row execute function touch_updated_at();
create trigger trg_profiles_touch before update on profiles
  for each row execute function touch_updated_at();

-- Auto-create profile row when a new auth user signs up
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- =========================================================================
-- RLS
-- =========================================================================
alter table profiles                 enable row level security;
alter table workspaces               enable row level security;
alter table workspace_members        enable row level security;
alter table workspace_invites        enable row level security;
alter table domains                  enable row level security;
alter table domain_snapshots         enable row level security;
alter table domain_events            enable row level security;
alter table tags                     enable row level security;
alter table domain_tags              enable row level security;
alter table alert_rules              enable row level security;
alter table notification_channels    enable row level security;
alter table notifications            enable row level security;
alter table api_keys                 enable row level security;
alter table audit_logs               enable row level security;
alter table imports                  enable row level security;
alter table jobs                     enable row level security;

-- Profile: a user can read/write only their own row.
create policy profiles_self on profiles for all
  using (id = auth.uid()) with check (id = auth.uid());

-- Workspaces: members can read; owners/admins can update.
create policy ws_read on workspaces for select using (is_workspace_member(id));
create policy ws_insert on workspaces for insert with check (owner_id = auth.uid());
create policy ws_update on workspaces for update
  using (workspace_role_of(id) in ('owner','admin'))
  with check (workspace_role_of(id) in ('owner','admin'));
create policy ws_delete on workspaces for delete using (workspace_role_of(id) = 'owner');

create policy wsm_read on workspace_members for select using (is_workspace_member(workspace_id));
create policy wsm_write on workspace_members for all
  using (workspace_role_of(workspace_id) in ('owner','admin'))
  with check (workspace_role_of(workspace_id) in ('owner','admin'));

create policy invites_rw on workspace_invites for all
  using (workspace_role_of(workspace_id) in ('owner','admin'))
  with check (workspace_role_of(workspace_id) in ('owner','admin'));

-- Generic "is member" policy for all workspace-scoped tables.
create policy tenant_read on domains              for select using (is_workspace_member(workspace_id));
create policy tenant_write on domains             for all    using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));

create policy tenant_read on domain_snapshots     for select using (is_workspace_member(workspace_id));
create policy tenant_write on domain_snapshots    for all    using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));

create policy tenant_read on domain_events        for select using (is_workspace_member(workspace_id));
create policy tenant_write on domain_events       for all    using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));

create policy tenant_read on tags                 for select using (is_workspace_member(workspace_id));
create policy tenant_write on tags                for all    using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));

create policy tenant_read on domain_tags          for select using (exists (select 1 from domains d where d.id = domain_id and is_workspace_member(d.workspace_id)));
create policy tenant_write on domain_tags         for all    using (exists (select 1 from domains d where d.id = domain_id and is_workspace_member(d.workspace_id))) with check (exists (select 1 from domains d where d.id = domain_id and is_workspace_member(d.workspace_id)));

create policy tenant_read on alert_rules          for select using (is_workspace_member(workspace_id));
create policy tenant_write on alert_rules         for all    using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));

create policy tenant_read on notification_channels for select using (is_workspace_member(workspace_id));
create policy tenant_write on notification_channels for all   using (workspace_role_of(workspace_id) in ('owner','admin','member')) with check (workspace_role_of(workspace_id) in ('owner','admin','member'));

create policy tenant_read on notifications        for select using (is_workspace_member(workspace_id));

create policy tenant_read on api_keys             for select using (is_workspace_member(workspace_id));
create policy tenant_write on api_keys            for all    using (workspace_role_of(workspace_id) in ('owner','admin')) with check (workspace_role_of(workspace_id) in ('owner','admin'));

create policy tenant_read on audit_logs           for select using (workspace_id is null or is_workspace_member(workspace_id));

create policy tenant_read on imports              for select using (is_workspace_member(workspace_id));
create policy tenant_write on imports             for all    using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));

create policy tenant_read on jobs                 for select using (workspace_id is null or is_workspace_member(workspace_id));
