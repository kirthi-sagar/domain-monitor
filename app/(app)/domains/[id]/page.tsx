import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { ArrowLeft, Trash2 } from "lucide-react";
import { daysUntil, expirySeverity, formatDate } from "@/lib/utils";
import { checkNowAction, deleteDomainAction } from "../actions";
import { TestButton } from "@/components/app/test-button";
import { TagPicker } from "@/components/app/tag-picker";
import { MuteControl } from "@/components/app/mute-control";
import type { DomainRow, DomainEventRow } from "@/lib/supabase/types";

export default async function DomainDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: domain } = await supabase.from("domains").select("*").eq("id", id).single();
  if (!domain) notFound();
  const d = domain as DomainRow;

  const { data: events } = await supabase
    .from("domain_events")
    .select("*")
    .eq("domain_id", id)
    .order("occurred_at", { ascending: false })
    .limit(50);

  const { data: snapshots } = await supabase
    .from("domain_snapshots")
    .select("id, taken_at, registrar, expiration_date, nameservers, status, availability")
    .eq("domain_id", id)
    .order("taken_at", { ascending: false })
    .limit(10);

  const latestAvail = (snapshots?.[0] as any)?.availability as
    { reachable: boolean; statusCode: number | null; tlsValidTo: string | null; tlsIssuer: string | null; latencyMs: number | null } | null;

  const [{ data: allTags }, { data: domainTags }] = await Promise.all([
    supabase.from("tags").select("id, name, color").eq("workspace_id", d.workspace_id).order("name"),
    supabase.from("domain_tags").select("tag_id").eq("domain_id", id),
  ]);
  const selectedTagIds = (domainTags ?? []).map((r: any) => r.tag_id as string);

  const days = daysUntil(d.expiration_date);
  const sev = expirySeverity(days);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-1"><Link href="/domains"><ArrowLeft className="h-4 w-4" /> All domains</Link></Button>
          <h1 className="text-2xl font-semibold tracking-tight truncate">{d.name}</h1>
          <p className="text-sm text-muted-foreground">{d.registrar ?? "Registrar unknown"} · last checked {d.last_checked_at ? formatDate(d.last_checked_at, { dateStyle: "medium", timeStyle: "short" }) : "—"}</p>
        </div>
        <div className="flex gap-2 shrink-0 items-center">
          <TestButton action={checkNowAction.bind(null, d.id)} label="Check now" pendingLabel="Checking…" successLabel={`Re-checked ${d.name}`} />
          <Button asChild variant="outline" size="sm"><Link href={`/domains/${d.id}/edit`}>Edit</Link></Button>
          <form action={deleteDomainAction.bind(null, d.id)}>
            <Button type="submit" variant="ghost" size="sm" className="text-destructive hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
          </form>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <TagPicker domainId={d.id} allTags={(allTags ?? []) as any} initialSelected={selectedTagIds} />
        <MuteControl domainId={d.id} mutedUntil={d.alerts_muted_until} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Expires</div>
          <div className="mt-2 text-2xl font-semibold">{formatDate(d.expiration_date)}</div>
          {days !== null && (
            <Badge className="mt-2" variant={sev === "crit" || sev === "expired" ? "danger" : sev === "warn" ? "warning" : "success"}>
              {sev === "expired" ? `${Math.abs(days)}d ago` : `in ${days} days`}
            </Badge>
          )}
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Status</div>
          <div className="mt-2 text-base font-medium capitalize">{d.status.replace("_", " ")}</div>
          <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{d.status_flags?.join(", ") || "—"}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Registered</div>
          <div className="mt-2 text-base font-medium">{formatDate(d.registration_date)}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Nameservers</div>
          <div className="mt-2 text-xs font-mono space-y-0.5">
            {(d.nameservers ?? []).slice(0, 3).map((n) => <div key={n} className="truncate">{n}</div>)}
            {(d.nameservers?.length ?? 0) === 0 && <span className="text-muted-foreground">—</span>}
          </div>
        </Card>
      </div>

      {latestAvail && (
        <Card className="p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Availability (last check)</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div><div className="text-xs text-muted-foreground">Reachable</div><Badge variant={latestAvail.reachable ? "success" : "danger"} className="mt-1">{latestAvail.reachable ? "Yes" : "No"}</Badge></div>
            <div><div className="text-xs text-muted-foreground">HTTP status</div><div className="mt-1 font-medium">{latestAvail.statusCode ?? "—"}</div></div>
            <div><div className="text-xs text-muted-foreground">Latency</div><div className="mt-1 font-medium">{latestAvail.latencyMs ? `${latestAvail.latencyMs} ms` : "—"}</div></div>
            <div><div className="text-xs text-muted-foreground">TLS expires</div><div className="mt-1 font-medium">{formatDate(latestAvail.tlsValidTo)}</div><div className="text-xs text-muted-foreground">{latestAvail.tlsIssuer ?? ""}</div></div>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle>Activity timeline</CardTitle><CardDescription>Detected changes and reminders.</CardDescription></div>
          <Button asChild size="sm" variant="outline"><a href={`/api/export/events?domain_id=${d.id}`}>Export CSV</a></Button>
        </CardHeader>
        <CardContent>
          {(!events || events.length === 0) ? (
            <div className="text-sm text-muted-foreground py-6 text-center">No events yet.</div>
          ) : (
            <ol className="space-y-3">
              {(events as DomainEventRow[]).map((e) => (
                <li key={e.id} className="flex gap-3 items-start border-l-2 pl-4 py-1" style={{ borderColor: e.severity === "critical" ? "#dc2626" : e.severity === "warning" ? "#d97706" : "#4338ca" }}>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{e.title}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(e.occurred_at, { dateStyle: "medium", timeStyle: "short" })} · {e.kind}</div>
                    {e.message && <p className="mt-1 text-sm text-muted-foreground">{e.message}</p>}
                  </div>
                  <Badge variant={e.severity === "critical" ? "danger" : e.severity === "warning" ? "warning" : "default"}>{e.severity}</Badge>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent snapshots</CardTitle><CardDescription>Last 10 WHOIS captures.</CardDescription></CardHeader>
        <CardContent className="p-0 px-6 pb-6">
          {(!snapshots || snapshots.length === 0) ? (
            <div className="text-sm text-muted-foreground py-6 text-center">No snapshots yet.</div>
          ) : (
            <Table>
              <THead>
                <TR><TH>Taken</TH><TH>Registrar</TH><TH>Expires</TH><TH>Nameservers</TH></TR>
              </THead>
              <TBody>
                {snapshots.map((s: any) => (
                  <TR key={s.id}>
                    <TD className="text-xs"><Link href={`/domains/${d.id}/snapshots/${s.id}`} className="hover:underline">{formatDate(s.taken_at, { dateStyle: "medium", timeStyle: "short" })}</Link></TD>
                    <TD className="text-muted-foreground">{s.registrar ?? "—"}</TD>
                    <TD>{formatDate(s.expiration_date)}</TD>
                    <TD className="text-xs font-mono truncate max-w-xs">{(s.nameservers ?? []).join(", ") || "—"}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {d.notes && (
        <Card><CardHeader><CardTitle>Notes</CardTitle></CardHeader><CardContent><p className="text-sm whitespace-pre-wrap">{d.notes}</p></CardContent></Card>
      )}
    </div>
  );
}
