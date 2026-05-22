// Idempotent monitoring runner. Used by /api/domains/:id/check and cron.
import { createServiceClient } from "@/lib/supabase/server";
import { lookupDomain, type WhoisResult } from "@/lib/whois";
import { resolveDns, diffDns, type DnsSnapshot } from "@/lib/dns";
import { diffSnapshots, expiryThresholdEvents } from "@/lib/diff";
import { dispatchAlertsForEvent } from "@/lib/alerts";
import { daysUntil } from "@/lib/utils";

interface CheckOpts { force?: boolean }

export async function checkDomain(domainId: string, _opts: CheckOpts = {}) {
  const supa = await createServiceClient();
  const { data: domain, error } = await supa.from("domains").select("*").eq("id", domainId).single();
  if (error || !domain) throw new Error(`Domain ${domainId} not found`);

  const wantsDns = (domain.monitor_flags ?? []).includes("dns");
  const [result, dnsNext] = await Promise.all([
    lookupDomain(domain.name),
    wantsDns ? resolveDns(domain.name) : Promise.resolve(null as DnsSnapshot | null),
  ]);

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
  const prevDns: DnsSnapshot | null = prevSnap?.dns_records ?? null;

  // Decide whether this snapshot is worth storing.
  // - Skip entirely if the lookup produced nothing (source === "none").
  // - Skip if every field matches the previous snapshot (no signal worth keeping).
  const sameAsPrev = prev
    && prev.registrar === result.registrar
    && prev.expirationDate === result.expirationDate
    && (prev.nameservers ?? []).slice().sort().join(",") === result.nameservers.slice().sort().join(",")
    && (prev.status ?? []).slice().sort().join(",") === result.status.slice().sort().join(",")
    && (!wantsDns || JSON.stringify(prevSnap?.dns_records ?? null) === JSON.stringify(dnsNext ?? null));

  if (result.source !== "none" && !sameAsPrev) {
    await supa.from("domain_snapshots").insert({
      domain_id: domainId,
      workspace_id: domain.workspace_id,
      whois_raw: result.raw,
      whois_parsed: result as any,
      dns_records: dnsNext as any,
      nameservers: result.nameservers,
      registrar: result.registrar,
      expiration_date: result.expirationDate,
      status: result.status,
    });
  }

  // Compute structural diff events (WHOIS + DNS).
  const changes = [
    ...diffSnapshots(prev, result),
    ...(wantsDns && dnsNext ? diffDns(prevDns, dnsNext) : []),
  ];
  for (const c of changes) {
    const { data: inserted } = await supa.from("domain_events").upsert({
      domain_id: domainId,
      workspace_id: domain.workspace_id,
      kind: c.kind,
      severity: c.severity,
      title: c.title,
      message: null,
      before: c.before as any,
      after: c.after as any,
      dedupe_key: c.dedupeKey,
    }, { onConflict: "domain_id,kind,dedupe_key", ignoreDuplicates: true }).select("id").maybeSingle();

    // Only dispatch when upsert actually inserted a new row (idempotency).
    if (inserted?.id) {
      await dispatchAlertsForEvent({
        workspaceId: domain.workspace_id,
        eventId: inserted.id,
        kind: c.kind,
        title: c.title,
        body: `Detected on ${domain.name}.\nBefore: ${JSON.stringify(c.before)}\nAfter:  ${JSON.stringify(c.after)}`,
        severity: c.severity,
        domainName: domain.name,
      });
    }
  }

  // Expiry threshold crossings.
  const prevDays = daysUntil(prev?.expirationDate ?? null);
  const nextDays = daysUntil(result.expirationDate);
  const crossings = expiryThresholdEvents(prevDays, nextDays, domain.alert_thresholds ?? []);
  for (const t of crossings) {
    const severity: "critical" | "warning" | "info" = t <= 7 ? "critical" : t <= 30 ? "warning" : "info";
    const title = `Expires in ${t} day${t === 1 ? "" : "s"}`;
    const { data: inserted } = await supa.from("domain_events").upsert({
      domain_id: domainId,
      workspace_id: domain.workspace_id,
      kind: "expiry",
      severity,
      title,
      message: `Crossed ${t}-day reminder threshold for ${domain.name}.`,
      after: { days: t, expirationDate: result.expirationDate } as any,
      dedupe_key: `expt:${result.expirationDate}:${t}`,
    }, { onConflict: "domain_id,kind,dedupe_key", ignoreDuplicates: true }).select("id").maybeSingle();

    if (inserted?.id) {
      await dispatchAlertsForEvent({
        workspaceId: domain.workspace_id,
        eventId: inserted.id,
        kind: "expiry",
        title,
        body: `${domain.name} expires in ${t} day${t === 1 ? "" : "s"} (${result.expirationDate}).`,
        severity,
        domainName: domain.name,
      });
    }
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
