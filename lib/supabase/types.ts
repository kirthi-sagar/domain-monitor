// Lightweight hand-typed schema. Replace with `supabase gen types` output once linked.

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";
export type PlanTier = "free" | "pro" | "business";
export type DomainStatus = "active" | "pending_check" | "expired" | "grace_period" | "redemption" | "unknown" | "archived";
export type MonitorKind = "expiry" | "whois" | "nameservers" | "registrar" | "status" | "dns" | "availability";
export type EventSeverity = "info" | "warning" | "critical";
export type ChannelKind = "email" | "slack" | "discord" | "telegram" | "webhook";
export type NotificationStatus = "queued" | "sent" | "failed" | "suppressed";

export interface DomainRow {
  id: string;
  workspace_id: string;
  added_by: string | null;
  name: string;
  registrar: string | null;
  registrar_url: string | null;
  registration_date: string | null;
  expiration_date: string | null;
  last_updated_date: string | null;
  nameservers: string[];
  status: DomainStatus;
  status_flags: string[];
  monitor_flags: MonitorKind[];
  alert_thresholds: number[];
  check_interval_minutes: number | null;
  notes: string | null;
  last_checked_at: string | null;
  next_check_at: string | null;
  last_change_summary: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceRow {
  id: string;
  name: string;
  slug: string;
  plan: PlanTier;
  owner_id: string;
  domain_limit: number;
  check_interval_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface DomainEventRow {
  id: string;
  domain_id: string;
  workspace_id: string;
  kind: MonitorKind;
  severity: EventSeverity;
  title: string;
  message: string | null;
  before: unknown;
  after: unknown;
  occurred_at: string;
  dedupe_key: string | null;
}

// Database type stub. We type the most-used row shapes for autocomplete, but allow
// any table key with `any` payloads — swap with `supabase gen types typescript` output.
type AnyTable<Row = any> = { Row: Row; Insert: any; Update: any; Relationships: [] };

export type Database = {
  public: {
    Tables: {
      profiles: AnyTable<{ id: string; email: string; full_name: string | null; default_workspace_id: string | null }>;
      workspaces: AnyTable<WorkspaceRow>;
      workspace_members: AnyTable<{ workspace_id: string; user_id: string; role: WorkspaceRole }>;
      workspace_invites: AnyTable;
      domains: AnyTable<DomainRow>;
      domain_snapshots: AnyTable;
      domain_events: AnyTable<DomainEventRow>;
      tags: AnyTable;
      domain_tags: AnyTable;
      alert_rules: AnyTable<{ id: string; workspace_id: string; enabled: boolean; channel_ids: string[]; kinds: MonitorKind[]; min_severity: EventSeverity }>;
      notification_channels: AnyTable<{ id: string; workspace_id: string; kind: ChannelKind; name: string; config: any; enabled: boolean }>;
      notifications: AnyTable;
      api_keys: AnyTable<{ id: string; workspace_id: string; name: string; key_hash: string; key_prefix: string; scopes: string[]; last_used_at: string | null; revoked_at: string | null; created_at: string }>;
      audit_logs: AnyTable;
      imports: AnyTable;
      jobs: AnyTable;
    } & Record<string, AnyTable>;
    Views: Record<string, any>;
    Functions: Record<string, any>;
    Enums: Record<string, any>;
    CompositeTypes: Record<string, any>;
  };
};
