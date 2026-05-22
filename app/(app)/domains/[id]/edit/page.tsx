import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SaveButton } from "@/components/app/save-button";
import { editDomainAction } from "../../actions";
import { ArrowLeft } from "lucide-react";
import type { DomainRow } from "@/lib/supabase/types";

const KINDS = ["expiry", "whois", "nameservers", "registrar", "status", "dns", "availability"] as const;

export default async function EditDomainPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: domain } = await supabase.from("domains").select("*").eq("id", id).maybeSingle();
  if (!domain) notFound();
  const d = domain as DomainRow;
  const action = editDomainAction.bind(null, d.id);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2"><Link href={`/domains/${d.id}`}><ArrowLeft className="h-4 w-4" /> Back to {d.name}</Link></Button>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Edit {d.name}</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>Settings</CardTitle><CardDescription>Per-domain monitoring overrides.</CardDescription></CardHeader>
        <CardContent>
          <form className="space-y-5">
            <div className="space-y-1.5">
              <Label>Monitor</Label>
              <p className="text-xs text-muted-foreground">Which signals to track for this domain.</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {KINDS.map((k) => (
                  <label key={k} className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm cursor-pointer hover:bg-muted">
                    <input type="checkbox" name="monitor_flags" value={k} defaultChecked={(d.monitor_flags ?? []).includes(k)} />
                    {k}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="alert_thresholds">Alert thresholds (days)</Label>
              <Input id="alert_thresholds" name="alert_thresholds" defaultValue={(d.alert_thresholds ?? []).join(", ")} placeholder="90, 60, 30, 14, 7, 3, 1" />
              <p className="text-xs text-muted-foreground">Comma- or space-separated. We&apos;ll fire one event per threshold crossing.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="check_interval_minutes">Check interval (minutes)</Label>
              <Input id="check_interval_minutes" name="check_interval_minutes" type="number" min="15" max="43200" defaultValue={d.check_interval_minutes ?? ""} placeholder="leave blank to use workspace default" />
              <p className="text-xs text-muted-foreground">Minimum 15 minutes. Blank uses the workspace setting.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" defaultValue={d.notes ?? ""} rows={4} />
            </div>

            <SaveButton action={action} />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
