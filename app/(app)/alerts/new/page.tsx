import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createAlertRuleAction } from "../actions";

const KINDS = ["expiry", "whois", "nameservers", "registrar", "status", "dns", "availability"] as const;

export default async function NewAlertRulePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const wsId = await getCurrentWorkspaceId();
  const { data: channels } = await supabase.from("notification_channels").select("id, name, kind, enabled").eq("workspace_id", wsId ?? "");

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/alerts" className="text-sm text-muted-foreground hover:text-foreground">← Alert rules</Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">New alert rule</h1>
      </div>

      {(!channels || channels.length === 0) && (
        <Card><CardContent className="p-6">
          <p className="text-sm">You need at least one notification channel before you can create a rule. <Link href="/channels/new" className="text-primary hover:underline">Add one →</Link></p>
        </CardContent></Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Rule details</CardTitle>
          <CardDescription>Pick which event kinds fire which channels.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createAlertRuleAction} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" placeholder="Critical brand domains" required />
            </div>

            <div className="space-y-1.5">
              <Label>Event kinds</Label>
              <p className="text-xs text-muted-foreground">Trigger on these change types.</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {KINDS.map((k) => (
                  <label key={k} className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm cursor-pointer hover:bg-muted">
                    <input type="checkbox" name="kinds" value={k} defaultChecked={["expiry","nameservers","registrar"].includes(k)} />
                    {k}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="min_severity">Minimum severity</Label>
              <select id="min_severity" name="min_severity" defaultValue="warning" className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm">
                <option value="info">Info — fire for everything</option>
                <option value="warning">Warning — skip info events</option>
                <option value="critical">Critical only</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Send to channels</Label>
              {(channels ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No channels yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {(channels ?? []).map((c: any) => (
                    <label key={c.id} className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm cursor-pointer hover:bg-muted">
                      <input type="checkbox" name="channel_ids" value={c.id} disabled={!c.enabled} />
                      <span className="font-medium">{c.name}</span>
                      <span className="text-xs text-muted-foreground">· {c.kind}{!c.enabled && " (disabled)"}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="suppression_minutes">Suppression (minutes)</Label>
                <Input id="suppression_minutes" name="suppression_minutes" type="number" min="0" max="10080" defaultValue="60" />
                <p className="text-xs text-muted-foreground">Don&apos;t re-fire the same event within this window.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Options</Label>
                <label className="flex items-center gap-2 text-sm h-10"><input type="checkbox" name="enabled" defaultChecked /> Enable rule</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="digest" /> Digest mode (group events)</label>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={(channels ?? []).length === 0}>Create rule</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
