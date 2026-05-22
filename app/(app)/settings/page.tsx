import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function SettingsPage() {
  const supabase = await createClient();
  const wsId = await getCurrentWorkspaceId();
  const { data: ws } = await supabase.from("workspaces").select("*").eq("id", wsId ?? "").maybeSingle();
  const { data: channels } = await supabase.from("notification_channels").select("*").eq("workspace_id", wsId ?? "");

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Workspace, channels, and team.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Workspace</CardTitle><CardDescription>Plan and check cadence.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5"><Label>Name</Label><Input defaultValue={ws?.name ?? ""} disabled /></div>
          <div className="space-y-1.5"><Label>Slug</Label><Input defaultValue={ws?.slug ?? ""} disabled /></div>
          <div className="flex gap-3 text-sm">
            <Badge variant="default">Plan: {ws?.plan ?? "free"}</Badge>
            <Badge variant="neutral">Limit: {ws?.domain_limit ?? 25} domains</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Notification channels</CardTitle><CardDescription>Where alerts go.</CardDescription></CardHeader>
        <CardContent>
          {(!channels || channels.length === 0) ? (
            <p className="text-sm text-muted-foreground">No channels yet. Add one via the API or contact support.</p>
          ) : (
            <ul className="divide-y divide-border">
              {channels.map((c: any) => (
                <li key={c.id} className="py-3 flex items-center justify-between text-sm">
                  <div><span className="font-medium">{c.name}</span> <span className="text-muted-foreground">· {c.kind}</span></div>
                  <Badge variant={c.enabled ? "success" : "neutral"}>{c.enabled ? "Enabled" : "Disabled"}</Badge>
                </li>
              ))}
            </ul>
          )}
          <Button className="mt-4" variant="outline" disabled>Add channel (coming soon)</Button>
        </CardContent>
      </Card>
    </div>
  );
}
