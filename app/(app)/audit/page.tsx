import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default async function AuditPage() {
  const supabase = await createClient();
  const wsId = await getCurrentWorkspaceId();

  // Join actor profile for email/name
  const { data } = await supabase
    .from("audit_logs")
    .select("id, action, actor_kind, target_kind, target_id, metadata, created_at, actor:profiles!actor_id(email, full_name)")
    .eq("workspace_id", wsId ?? "")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
        <p className="text-sm text-muted-foreground">Sensitive actions in this workspace.</p>
      </div>

      <Card className="p-0">
        {(!data || data.length === 0) ? (
          <div className="p-12 text-center text-sm text-muted-foreground">No audit entries yet.</div>
        ) : (
          <Table>
            <THead><TR><TH>When</TH><TH>Actor</TH><TH>Action</TH><TH>Target</TH><TH>Details</TH></TR></THead>
            <TBody>
              {data.map((a: any) => {
                const actor = Array.isArray(a.actor) ? a.actor[0] : a.actor;
                return (
                  <TR key={a.id}>
                    <TD className="text-xs whitespace-nowrap">{formatDate(a.created_at, { dateStyle: "medium", timeStyle: "short" })}</TD>
                    <TD className="text-sm">
                      {actor?.email ?? (a.actor_kind === "system" ? "system" : "—")}
                      {actor?.full_name && <div className="text-xs text-muted-foreground">{actor.full_name}</div>}
                    </TD>
                    <TD><Badge variant="default">{a.action}</Badge></TD>
                    <TD className="text-xs text-muted-foreground">{a.target_kind ?? "—"}{a.target_id ? ` · ${a.target_id.slice(0, 8)}` : ""}</TD>
                    <TD className="text-xs font-mono text-muted-foreground max-w-xs truncate">{a.metadata ? JSON.stringify(a.metadata) : ""}</TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
