import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { hashKey } from "@/lib/api-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

async function createKey(formData: FormData) {
  "use server";
  const name = String(formData.get("name") ?? "").trim() || "API Key";
  const wsId = await getCurrentWorkspaceId();
  if (!wsId) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const raw = `sk_live_${randomBytes(24).toString("hex")}`;
  await supabase.from("api_keys").insert({
    workspace_id: wsId,
    created_by: user!.id,
    name,
    key_hash: hashKey(raw),
    key_prefix: raw.slice(0, 12),
  });
  revalidatePath("/api-keys");
  // NOTE: in production, surface `raw` once via flash. For now it shows in logs/dev only.
  console.log("[api-key] new key (show once):", raw);
}

async function revokeKey(id: string) {
  "use server";
  const supabase = await createClient();
  await supabase.from("api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/api-keys");
}

export default async function ApiKeysPage() {
  const supabase = await createClient();
  const wsId = await getCurrentWorkspaceId();
  const { data: keys } = await supabase.from("api_keys").select("*").eq("workspace_id", wsId ?? "").order("created_at", { ascending: false });

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">API keys</h1>
        <p className="text-sm text-muted-foreground">Scoped, hashed keys for the REST API.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Create a new key</CardTitle><CardDescription>The full key is shown once in server logs after creation.</CardDescription></CardHeader>
        <CardContent>
          <form action={createKey} className="flex gap-2">
            <div className="flex-1"><Label htmlFor="name" className="sr-only">Name</Label><Input id="name" name="name" placeholder="CI deploy key" /></div>
            <Button type="submit">Create</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Existing keys</CardTitle></CardHeader>
        <CardContent className="p-0 px-6 pb-6">
          {(!keys || keys.length === 0) ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No keys yet.</div>
          ) : (
            <Table>
              <THead><TR><TH>Name</TH><TH>Prefix</TH><TH>Last used</TH><TH>Status</TH><TH></TH></TR></THead>
              <TBody>
                {keys.map((k: any) => (
                  <TR key={k.id}>
                    <TD className="font-medium">{k.name}</TD>
                    <TD className="font-mono text-xs">{k.key_prefix}…</TD>
                    <TD className="text-xs text-muted-foreground">{k.last_used_at ? formatDate(k.last_used_at, { dateStyle: "medium", timeStyle: "short" }) : "Never"}</TD>
                    <TD><Badge variant={k.revoked_at ? "neutral" : "success"}>{k.revoked_at ? "Revoked" : "Active"}</Badge></TD>
                    <TD>{!k.revoked_at && (
                      <form action={revokeKey.bind(null, k.id)}><Button type="submit" size="sm" variant="ghost" className="text-destructive">Revoke</Button></form>
                    )}</TD>
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
