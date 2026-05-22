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

export default async function DashboardPage() {
  const supabase = await createClient();
  const wsId = await getCurrentWorkspaceId();

  const [{ data: domains }, { count: eventsCount }] = await Promise.all([
    supabase.from("domains").select("*").eq("workspace_id", wsId ?? "").is("archived_at", null).order("expiration_date", { ascending: true }),
    supabase.from("domain_events").select("id", { count: "exact", head: true }).eq("workspace_id", wsId ?? ""),
  ]);

  const rows = (domains ?? []) as DomainRow[];
  const expiringSoon = rows.filter((d) => {
    const days = daysUntil(d.expiration_date);
    return days !== null && days >= 0 && days <= 30;
  });
  const critical = rows.filter((d) => {
    const days = daysUntil(d.expiration_date);
    return days !== null && days >= 0 && days <= 7;
  });

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
