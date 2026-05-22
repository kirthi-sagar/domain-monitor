-- Availability snapshot column on domain_snapshots (HTTP status + TLS cert expiry).
alter table domain_snapshots add column if not exists availability jsonb;
