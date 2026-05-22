import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Activity, Users, Globe2, Briefcase } from "lucide-react";

export default async function AdminPage() {
  const adminId = await requireAdmin();
  if (!adminId) notFound();

  const svc = await createServiceClient();
  const [users, workspaces, domains, jobs, events] = await Promise.all([
    svc.from("profiles").select("id, email, full_name, is_admin, created_at", { count: "exact" }).order("created_at", { ascending: false }).limit(20),
    svc.from("workspaces").select("id, name, slug, plan, owner_id, created_at", { count: "exact" }).order("created_at", { ascending: false }).limit(20),
    svc.from("domains").select("id", { count: "exact", head: true }).is("archived_at", null),
    svc.from("jobs").select("*").order("created_at", { ascending: false }).limit(20),
    svc.from("domain_events").select("id", { count: "exact", head: true }),
  ]);

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">System-wide view. Visible only to platform admins.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={Users}     label="Users"      value={users.count ?? 0} />
        <Stat icon={Briefcase} label="Workspaces" value={workspaces.count ?? 0} />
        <Stat icon={Globe2}    label="Domains"    value={domains.count ?? 0} />
        <Stat icon={Activity}  label="Events"     value={events.count ?? 0} />
      </div>

      <Card>
        <CardHeader><CardTitle>Recent users</CardTitle><CardDescription>Last 20 signups.</CardDescription></CardHeader>
        <CardContent className="p-0 px-6 pb-6">
          <Table>
            <THead><TR><TH>Email</TH><TH>Name</TH><TH>Joined</TH><TH>Admin</TH></TR></THead>
            <TBody>
              {(users.data ?? []).map((u: any) => (
                <TR key={u.id}>
                  <TD className="font-medium">{u.email}</TD>
                  <TD className="text-muted-foreground">{u.full_name ?? "—"}</TD>
                  <TD className="text-xs">{formatDate(u.created_at)}</TD>
                  <TD>{u.is_admin && <Badge>admin</Badge>}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Workspaces</CardTitle><CardDescription>Last 20 created.</CardDescription></CardHeader>
        <CardContent className="p-0 px-6 pb-6">
          <Table>
            <THead><TR><TH>Name</TH><TH>Slug</TH><TH>Plan</TH><TH>Created</TH></TR></THead>
            <TBody>
              {(workspaces.data ?? []).map((w: any) => (
                <TR key={w.id}>
                  <TD className="font-medium">{w.name}</TD>
                  <TD className="text-muted-foreground font-mono text-xs">{w.slug}</TD>
                  <TD><Badge variant="default">{w.plan}</Badge></TD>
                  <TD className="text-xs">{formatDate(w.created_at)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent jobs</CardTitle><CardDescription>Background work history.</CardDescription></CardHeader>
        <CardContent className="p-0 px-6 pb-6">
          {(!jobs.data || jobs.data.length === 0) ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No jobs logged.</div>
          ) : (
            <Table>
              <THead><TR><TH>Kind</TH><TH>Status</TH><TH>Attempts</TH><TH>Finished</TH><TH>Error</TH></TR></THead>
              <TBody>
                {jobs.data.map((j: any) => (
                  <TR key={j.id}>
                    <TD className="font-medium">{j.kind}</TD>
                    <TD><Badge variant={j.status === "succeeded" ? "success" : j.status === "failed" ? "danger" : "neutral"}>{j.status}</Badge></TD>
                    <TD>{j.attempt}</TD>
                    <TD className="text-xs">{j.finished_at ? formatDate(j.finished_at, { dateStyle: "short", timeStyle: "short" }) : "—"}</TD>
                    <TD className="text-xs text-muted-foreground truncate max-w-xs">{j.error ?? "—"}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Health</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div>Supabase URL: <code className="rounded bg-muted px-1.5 text-xs">{process.env.NEXT_PUBLIC_SUPABASE_URL ?? "—"}</code></div>
          <div>Service role configured: {process.env.SUPABASE_SERVICE_ROLE_KEY ? "✓" : "✗"}</div>
          <div>Resend configured: {process.env.RESEND_API_KEY ? "✓" : "✗"}</div>
          <div>Cron secret configured: {process.env.CRON_SECRET ? "✓" : "✗"}</div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
    </Card>
  );
}
