import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { daysUntil, expirySeverity, formatDate } from "@/lib/utils";
import type { DomainRow } from "@/lib/supabase/types";

export default async function DomainsPage({ searchParams }: { searchParams: Promise<{ q?: string; filter?: string }> }) {
  const { q, filter } = await searchParams;
  const supabase = await createClient();
  const wsId = await getCurrentWorkspaceId();

  let query = supabase.from("domains").select("*").eq("workspace_id", wsId ?? "").is("archived_at", null).order("name");
  if (q) query = query.ilike("name", `%${q}%`);
  const { data } = await query;
  const rows = (data ?? []) as DomainRow[];

  const filtered = filter === "expiring" ? rows.filter((d) => {
    const days = daysUntil(d.expiration_date);
    return days !== null && days <= 30;
  }) : rows;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Domains</h1>
          <p className="text-sm text-muted-foreground">{rows.length} tracked.</p>
        </div>
        <Button asChild><Link href="/domains/new"><Plus className="h-4 w-4" /> Add domain</Link></Button>
      </div>

      <form className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input name="q" defaultValue={q ?? ""} placeholder="Search domains…" className="pl-9" />
        </div>
        <Button variant={filter === "expiring" ? "primary" : "outline"} asChild>
          <Link href={filter === "expiring" ? "/domains" : "/domains?filter=expiring"}>Expiring</Link>
        </Button>
      </form>

      <Card className="p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-sm text-muted-foreground">No domains yet.</div>
            <Button asChild className="mt-4"><Link href="/domains/new"><Plus className="h-4 w-4" /> Add your first domain</Link></Button>
          </div>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Domain</TH>
                <TH>Registrar</TH>
                <TH>Expires</TH>
                <TH>Last checked</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.map((d) => {
                const days = daysUntil(d.expiration_date);
                const sev = expirySeverity(days);
                return (
                  <TR key={d.id}>
                    <TD className="font-medium"><Link href={`/domains/${d.id}`} className="hover:underline">{d.name}</Link></TD>
                    <TD className="text-muted-foreground">{d.registrar ?? "—"}</TD>
                    <TD>{formatDate(d.expiration_date)} {days !== null && <span className="text-muted-foreground text-xs">({days}d)</span>}</TD>
                    <TD className="text-muted-foreground text-xs">{d.last_checked_at ? formatDate(d.last_checked_at, { dateStyle: "medium", timeStyle: "short" }) : "Pending"}</TD>
                    <TD>
                      <Badge variant={sev === "crit" || sev === "expired" ? "danger" : sev === "warn" ? "warning" : sev === "unknown" ? "neutral" : "success"}>
                        {sev === "expired" ? "Expired" : sev === "crit" ? "Critical" : sev === "warn" ? "Warning" : sev === "unknown" ? "Unknown" : "OK"}
                      </Badge>
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
