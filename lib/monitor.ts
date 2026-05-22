// Idempotent monitoring runner. Used by /api/domains/:id/check and cron.
import { createServiceClient } from "@/lib/supabase/server";
import { lookupDomain, type WhoisResult } from "@/lib/whois";
import { diffSnapshots, expiryThresholdEvents } from "@/lib/diff";
import { daysUntil } from "@/lib/utils";

interface CheckOpts { force?: boolean }

export async function checkDomain(domainId: string, _opts: CheckOpts = {}) {
  const supa = await createServiceClient();
  const { data: domain, error } = await supa.from("domains").select("*").eq("id", domainId).single();
  if (error || !domain) throw new Error(`Domain ${domainId} not found`);

  const result = await lookupDomain(domain.name);

  // Find previous snapshot to diff against.
  const { data: prevSnap } = await supa
    .from("domain_snapshots")
    .select("*")
    .eq("domain_id", domainId)
    .order("taken_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const prev: Partial<WhoisResult> | null = prevSnap
    ? {
        registrar: prevSnap.registrar,
        expirationDate: prevSnap.expiration_date,
        nameservers: prevSnap.nameservers ?? [],
        status: prevSnap.status ?? [],
      }
    : null;

  // Persist new snapshot.
  await supa.from("domain_snapshots").insert({
    domain_id: domainId,
    workspace_id: domain.workspace_id,
    whois_raw: result.raw,
    whois_parsed: result as any,
    nameservers: result.nameservers,
    registrar: result.registrar,
    expiration_date: result.expirationDate,
    status: result.status,
  });

  // Compute structural diff events.
  const changes = diffSnapshots(prev, result);
  for (const c of changes) {
    await supa.from("domain_events").upsert({
      domain_id: domainId,
      workspace_id: domain.workspace_id,
      kind: c.kind,
      severity: c.severity,
      title: c.title,
      message: null,
      before: c.before as any,
      after: c.after as any,
      dedupe_key: c.dedupeKey,
    }, { onConflict: "domain_id,kind,dedupe_key", ignoreDuplicates: true });
  }

  // Expiry threshold crossings.
  const prevDays = daysUntil(prev?.expirationDate ?? null);
  const nextDays = daysUntil(result.expirationDate);
  const crossings = expiryThresholdEvents(prevDays, nextDays, domain.alert_thresholds ?? []);
  for (const t of crossings) {
    await supa.from("domain_events").upsert({
      domain_id: domainId,
      workspace_id: domain.workspace_id,
      kind: "expiry",
      severity: t <= 7 ? "critical" : t <= 30 ? "warning" : "info",
      title: `Expires in ${t} day${t === 1 ? "" : "s"}`,
      message: `Crossed ${t}-day reminder threshold for ${domain.name}.`,
      after: { days: t, expirationDate: result.expirationDate } as any,
      dedupe_key: `expt:${result.expirationDate}:${t}`,
    }, { onConflict: "domain_id,kind,dedupe_key", ignoreDuplicates: true });
  }

  // Update domain summary fields.
  await supa.from("domains").update({
    registrar: result.registrar ?? domain.registrar,
    registrar_url: result.registrarUrl ?? domain.registrar_url,
    registration_date: result.registrationDate ?? domain.registration_date,
    expiration_date: result.expirationDate ?? domain.expiration_date,
    last_updated_date: result.lastUpdatedDate ?? domain.last_updated_date,
    nameservers: result.nameservers.length ? result.nameservers : domain.nameservers,
    status: result.expirationDate
      ? new Date(result.expirationDate) < new Date() ? "expired" : "active"
      : "unknown",
    status_flags: result.status,
    last_checked_at: new Date().toISOString(),
    next_check_at: new Date(Date.now() + (domain.check_interval_minutes ?? 1440) * 60_000).toISOString(),
    last_change_summary: changes.length ? changes.map((c) => c.title).join("; ") : domain.last_change_summary,
  }).eq("id", domainId);

  return { source: result.source, changes: changes.length, crossings: crossings.length };
}
