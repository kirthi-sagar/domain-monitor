import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Globe2, AlertTriangle, Calendar, Bell, ArrowRight } from "lucide-react";
import { daysUntil, expirySeverity, formatDate } from "@/lib/utils";
import type { DomainRow } from "@/lib/supabase/types";
import { EventsOverTimeChart, SeverityPie, ExpiryBuckets } from "@/components/app/dashboard-charts";

export default async function DashboardPage() {
  const supabase = await createClient();
  const wsId = await getCurrentWorkspaceId();

  const since30 = new Date(Date.now() - 30 * 86400_000).toISOString();
  const [{ data: domains }, { count: eventsCount }, { data: recentEvents }] = await Promise.all([
    supabase.from("domains").select("*").eq("workspace_id", wsId ?? "").is("archived_at", null).order("expiration_date", { ascending: true }),
    supabase.from("domain_events").select("id", { count: "exact", head: true }).eq("workspace_id", wsId ?? ""),
    supabase.from("domain_events").select("occurred_at, severity")
      .eq("workspace_id", wsId ?? "").gte("occurred_at", since30)
      .order("occurred_at", { ascending: true }).limit(2000),
  ]);

  // Build chart data
  const dayMap = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
    dayMap.set(d, 0);
  }
  const sevMap: Record<"info" | "warning" | "critical", number> = { info: 0, warning: 0, critical: 0 };
  for (const e of (recentEvents ?? []) as any[]) {
    const day = String(e.occurred_at).slice(0, 10);
    dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
    if (e.severity in sevMap) sevMap[e.severity as keyof typeof sevMap]++;
  }
  const eventsByDay = Array.from(dayMap.entries()).map(([day, count]) => ({ day, count }));
  const severityData = (["info", "warning", "critical"] as const).map((k) => ({ name: k, value: sevMap[k] }));

  const rows = (domains ?? []) as DomainRow[];
  const expiringSoon = rows.filter((d) => {
    const days = daysUntil(d.expiration_date);
    return days !== null && days >= 0 && days <= 30;
  });
  const critical = rows.filter((d) => {
    const days = daysUntil(d.expiration_date);
    return days !== null && days >= 0 && days <= 7;
  });

  // Expiry buckets
  const buckets = { "0–7d": 0, "8–30d": 0, "31–90d": 0, "91d+": 0, "Unknown": 0 };
  for (const d of rows) {
    const days = daysUntil(d.expiration_date);
    if (days === null) buckets["Unknown"]++;
    else if (days <= 7) buckets["0–7d"]++;
    else if (days <= 30) buckets["8–30d"]++;
    else if (days <= 90) buckets["31–90d"]++;
    else buckets["91d+"]++;
  }
  const bucketData = [
    { bucket: "0–7d",  count: buckets["0–7d"],  color: "#dc2626" },
    { bucket: "8–30d", count: buckets["8–30d"], color: "#d97706" },
    { bucket: "31–90d",count: buckets["31–90d"],color: "#4338ca" },
    { bucket: "91d+",  count: buckets["91d+"],  color: "#059669" },
    { bucket: "?",     count: buckets["Unknown"], color: "#9ca3af" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Snapshot of your portfolio.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={Globe2}  label="Domains tracked" value={rows.length} />
        <Stat icon={Calendar}  label="Expiring (30d)" value={expiringSoon.length} variant={expiringSoon.length > 0 ? "warn" : "ok"} />
        <Stat icon={AlertTriangle} label="Critical (7d)" value={critical.length} variant={critical.length > 0 ? "crit" : "ok"} />
        <Stat icon={Bell}    label="Events" value={eventsCount ?? 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Events (last 30 days)</div>
          <EventsOverTimeChart data={eventsByDay} />
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Severity mix</div>
          <SeverityPie data={severityData} />
        </Card>
        <Card className="p-5 lg:col-span-3">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Expiry buckets</div>
          <ExpiryBuckets data={bucketData} />
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Expiring soon</CardTitle>
            <CardDescription>Domains expiring in the next 30 days.</CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/domains">All domains <ArrowRight className="h-3.5 w-3.5" /></Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0 pt-0 px-6 pb-6">
          {expiringSoon.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              All clear. Nothing expires in the next 30 days.
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Domain</TH>
                  <TH>Registrar</TH>
                  <TH>Expires</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {expiringSoon.map((d) => {
                  const days = daysUntil(d.expiration_date);
                  const sev = expirySeverity(days);
                  return (
                    <TR key={d.id}>
                      <TD className="font-medium"><Link href={`/domains/${d.id}`} className="hover:underline">{d.name}</Link></TD>
                      <TD className="text-muted-foreground">{d.registrar ?? "—"}</TD>
                      <TD>{formatDate(d.expiration_date)} <span className="text-muted-foreground text-xs">({days}d)</span></TD>
                      <TD><Badge variant={sev === "crit" ? "danger" : sev === "warn" ? "warning" : "success"}>{sev === "crit" ? "Critical" : sev === "warn" ? "Warning" : "OK"}</Badge></TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ icon: Icon, label, value, variant = "ok" }: { icon: any; label: string; value: number; variant?: "ok" | "warn" | "crit" }) {
  const color = variant === "crit" ? "text-red-600" : variant === "warn" ? "text-amber-600" : "text-foreground";
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className={`mt-2 text-3xl font-semibold tracking-tight ${color}`}>{value}</div>
    </Card>
  );
}
