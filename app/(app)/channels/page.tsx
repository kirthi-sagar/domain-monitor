import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Plus, Mail, MessageSquare, Send, Webhook } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toggleChannelAction, deleteChannelAction, testChannelAction } from "./actions";
import { TestButton } from "@/components/app/test-button";

const ICONS: Record<string, any> = { email: Mail, slack: MessageSquare, discord: MessageSquare, telegram: Send, webhook: Webhook };

export default async function ChannelsPage() {
  const supabase = await createClient();
  const wsId = await getCurrentWorkspaceId();
  const { data: channels } = await supabase
    .from("notification_channels")
    .select("*")
    .eq("workspace_id", wsId ?? "")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notification channels</h1>
          <p className="text-sm text-muted-foreground">Where Sentinel sends alerts.</p>
        </div>
        <Button asChild><Link href="/channels/new"><Plus className="h-4 w-4" /> Add channel</Link></Button>
      </div>

      <Card className="p-0">
        {(!channels || channels.length === 0) ? (
          <div className="p-12 text-center">
            <div className="text-sm text-muted-foreground">No channels yet.</div>
            <Button asChild className="mt-4"><Link href="/channels/new"><Plus className="h-4 w-4" /> Add your first channel</Link></Button>
          </div>
        ) : (
          <Table>
            <THead>
              <TR><TH>Name</TH><TH>Type</TH><TH>Status</TH><TH>Last test</TH><TH></TH></TR>
            </THead>
            <TBody>
              {channels.map((c: any) => {
                const Icon = ICONS[c.kind] ?? Webhook;
                return (
                  <TR key={c.id}>
                    <TD className="font-medium">{c.name}</TD>
                    <TD><span className="inline-flex items-center gap-1.5 text-sm"><Icon className="h-4 w-4 text-primary" /> {c.kind}</span></TD>
                    <TD>
                      <form action={toggleChannelAction.bind(null, c.id, c.enabled)} className="inline">
                        <button type="submit" className="inline-flex"><Badge variant={c.enabled ? "success" : "neutral"} className="cursor-pointer">{c.enabled ? "Enabled" : "Disabled"}</Badge></button>
                      </form>
                    </TD>
                    <TD className="text-xs text-muted-foreground">
                      {c.last_test_at ? (
                        <span className={c.last_test_ok ? "text-emerald-700" : "text-red-700"}>
                          {c.last_test_ok ? "✓" : "✗"} {formatDate(c.last_test_at, { dateStyle: "short", timeStyle: "short" })}
                        </span>
                      ) : "Never"}
                    </TD>
                    <TD className="text-right">
                      <span className="inline-block mr-1">
                        <TestButton action={testChannelAction.bind(null, c.id)} successLabel={`Test sent to ${c.kind} channel`} />
                      </span>
                      <form action={deleteChannelAction.bind(null, c.id)} className="inline">
                        <Button type="submit" size="sm" variant="ghost" className="text-destructive">Delete</Button>
                      </form>
                    </TD>
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
