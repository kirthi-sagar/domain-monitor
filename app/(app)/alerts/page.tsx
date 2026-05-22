import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Plus } from "lucide-react";
import { toggleRuleAction, deleteRuleAction, testRuleAction } from "./actions";
import { TestButton } from "@/components/app/test-button";

export default async function AlertsPage() {
  const supabase = await createClient();
  const wsId = await getCurrentWorkspaceId();

  const [{ data: rules }, { data: channels }] = await Promise.all([
    supabase.from("alert_rules").select("*").eq("workspace_id", wsId ?? "").order("created_at", { ascending: false }),
    supabase.from("notification_channels").select("id, name").eq("workspace_id", wsId ?? ""),
  ]);
  const channelMap = new Map((channels ?? []).map((c: any) => [c.id, c.name]));

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Alert rules</h1>
          <p className="text-sm text-muted-foreground">When events happen, decide which channels get notified.</p>
        </div>
        <Button asChild><Link href="/alerts/new"><Plus className="h-4 w-4" /> New rule</Link></Button>
      </div>

      <Card className="p-0">
        {(!rules || rules.length === 0) ? (
          <div className="p-12 text-center">
            <div className="text-sm text-muted-foreground">No rules yet. Without rules, channels won&apos;t be notified.</div>
            <Button asChild className="mt-4"><Link href="/alerts/new"><Plus className="h-4 w-4" /> Create your first rule</Link></Button>
          </div>
        ) : (
          <Table>
            <THead><TR><TH>Name</TH><TH>Kinds</TH><TH>Min severity</TH><TH>Channels</TH><TH>Status</TH><TH></TH></TR></THead>
            <TBody>
              {rules.map((r: any) => (
                <TR key={r.id}>
                  <TD className="font-medium">{r.name}</TD>
                  <TD className="text-xs">{(r.kinds ?? []).join(", ")}</TD>
                  <TD><Badge variant={r.min_severity === "critical" ? "danger" : r.min_severity === "warning" ? "warning" : "default"}>{r.min_severity}</Badge></TD>
                  <TD className="text-xs">{(r.channel_ids ?? []).map((id: string) => channelMap.get(id) ?? id.slice(0, 6)).join(", ")}</TD>
                  <TD>
                    <form action={toggleRuleAction.bind(null, r.id, r.enabled)} className="inline">
                      <button type="submit"><Badge variant={r.enabled ? "success" : "neutral"} className="cursor-pointer">{r.enabled ? "Enabled" : "Disabled"}</Badge></button>
                    </form>
                  </TD>
                  <TD className="text-right">
                    <span className="inline-block mr-1">
                      <TestButton action={testRuleAction.bind(null, r.id)} successLabel="Test event dispatched" />
                    </span>
                    <form action={deleteRuleAction.bind(null, r.id)} className="inline">
                      <Button type="submit" size="sm" variant="ghost" className="text-destructive">Delete</Button>
                    </form>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
