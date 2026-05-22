import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Papa from "papaparse";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/input";
import { checkDomain } from "@/lib/monitor";

const DOMAIN_RE = /^([a-z0-9-]+\.)+[a-z]{2,}$/i;

async function importDomains(formData: FormData) {
  "use server";
  const raw = String(formData.get("csv") ?? "");
  if (!raw.trim()) return;

  const wsId = await getCurrentWorkspaceId();
  if (!wsId) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const parsed = Papa.parse<{ name?: string; notes?: string }>(raw, { header: true, skipEmptyLines: true });
  const candidates = (parsed.data ?? [])
    .map((r) => ({ name: (r.name ?? "").trim().toLowerCase(), notes: (r.notes ?? "").trim() || null }))
    .filter((r) => DOMAIN_RE.test(r.name));

  // Allow simple newline-separated lists too (no header row).
  if (candidates.length === 0) {
    for (const line of raw.split(/\n+/)) {
      const n = line.trim().toLowerCase();
      if (DOMAIN_RE.test(n)) candidates.push({ name: n, notes: null });
    }
  }

  const errors: string[] = [];
  let succeeded = 0;
  const ids: string[] = [];
  for (const c of candidates) {
    const { data, error } = await supabase.from("domains").insert({
      workspace_id: wsId, added_by: user!.id, name: c.name, notes: c.notes,
    }).select("id").single();
    if (error) errors.push(`${c.name}: ${error.message}`);
    else { succeeded++; ids.push(data.id); }
  }

  await supabase.from("imports").insert({
    workspace_id: wsId, created_by: user!.id,
    total: candidates.length, succeeded, failed: candidates.length - succeeded,
    errors: errors as any, status: "completed", completed_at: new Date().toISOString(),
  });

  // Best-effort fan-out initial checks (non-blocking).
  for (const id of ids) checkDomain(id).catch(() => {});

  revalidatePath("/domains");
  revalidatePath("/dashboard");
  redirect("/domains");
}

export default function ImportPage() {
  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Import domains</CardTitle>
          <CardDescription>Paste CSV with a <code className="rounded bg-muted px-1 text-xs">name</code> column, or one domain per line.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={importDomains} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="csv">CSV or newline-separated</Label>
              <Textarea id="csv" name="csv" rows={10} placeholder={"name,notes\nacme.com,brand\nshop.acme.com,storefront"} className="font-mono text-xs" required />
            </div>
            <Button type="submit">Import</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
