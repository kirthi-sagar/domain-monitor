import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const wsId = await getCurrentWorkspaceId();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("workspace_id", wsId ?? "")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-sm text-muted-foreground">Delivery history across all channels.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Recent deliveries</CardTitle><CardDescription>Last 100 events.</CardDescription></CardHeader>
        <CardContent className="p-0 px-6 pb-6">
          {(!data || data.length === 0) ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No notifications yet.</div>
          ) : (
            <Table>
              <THead><TR><TH>Status</TH><TH>When</TH><TH>Attempts</TH><TH>Error</TH></TR></THead>
              <TBody>
                {data.map((n: any) => (
                  <TR key={n.id}>
                    <TD><Badge variant={n.status === "sent" ? "success" : n.status === "failed" ? "danger" : "neutral"}>{n.status}</Badge></TD>
                    <TD className="text-xs">{formatDate(n.created_at, { dateStyle: "medium", timeStyle: "short" })}</TD>
                    <TD>{n.attempt}</TD>
                    <TD className="text-xs text-muted-foreground">{n.error ?? "—"}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
