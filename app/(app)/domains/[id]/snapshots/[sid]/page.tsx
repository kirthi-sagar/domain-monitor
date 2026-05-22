import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

type Snap = {
  id: string; taken_at: string;
  registrar: string | null; expiration_date: string | null;
  nameservers: string[] | null; status: string[] | null;
  dns_records: Record<string, string[]> | null;
};

export default async function SnapshotDiffPage({ params }: { params: Promise<{ id: string; sid: string }> }) {
  const { id, sid } = await params;
  const supabase = await createClient();

  const { data: domain } = await supabase.from("domains").select("id, name, workspace_id").eq("id", id).maybeSingle();
  if (!domain) notFound();

  const { data: current } = await supabase
    .from("domain_snapshots")
    .select("id, taken_at, registrar, expiration_date, nameservers, status, dns_records")
    .eq("id", sid).eq("domain_id", id).maybeSingle();
  if (!current) notFound();
  const cur = current as Snap;

  const { data: prevRow } = await supabase
    .from("domain_snapshots")
    .select("id, taken_at, registrar, expiration_date, nameservers, status, dns_records")
    .eq("domain_id", id).lt("taken_at", cur.taken_at)
    .order("taken_at", { ascending: false }).limit(1).maybeSingle();
  const prev = (prevRow as Snap | null) ?? null;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2"><Link href={`/domains/${id}`}><ArrowLeft className="h-4 w-4" /> Back to {domain.name}</Link></Button>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Snapshot diff</h1>
        <p className="text-sm text-muted-foreground">
          {prev ? (<>From {formatDate(prev.taken_at, { dateStyle: "medium", timeStyle: "short" })} → {formatDate(cur.taken_at, { dateStyle: "medium", timeStyle: "short" })}</>) : (<>This is the first snapshot — nothing to compare against.</>)}
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Changes</CardTitle><CardDescription>Differences from the previous snapshot.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <Row label="Registrar" before={prev?.registrar ?? null} after={cur.registrar} />
          <Row label="Expiration" before={prev?.expiration_date ?? null} after={cur.expiration_date} />
          <ArrayRow label="Nameservers" before={prev?.nameservers ?? []} after={cur.nameservers ?? []} />
          <ArrayRow label="Status flags" before={prev?.status ?? []} after={cur.status ?? []} />
          {cur.dns_records && Object.entries(cur.dns_records).map(([k, v]) => (
            <ArrayRow key={k} label={`DNS ${k}`} before={prev?.dns_records?.[k] ?? []} after={v ?? []} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, before, after }: { label: string; before: string | null; after: string | null }) {
  const changed = (before ?? "") !== (after ?? "");
  return (
    <div className="grid grid-cols-[120px_1fr_1fr] gap-4 items-start">
      <div className="text-xs uppercase tracking-wider text-muted-foreground pt-1">{label}</div>
      <ValueCell>{before ?? "—"}</ValueCell>
      <ValueCell highlight={changed}>{after ?? "—"}</ValueCell>
    </div>
  );
}

function ArrayRow({ label, before, after }: { label: string; before: string[]; after: string[] }) {
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  const removed = before.filter((x) => !afterSet.has(x));
  const added = after.filter((x) => !beforeSet.has(x));
  const changed = removed.length > 0 || added.length > 0;
  return (
    <div className="grid grid-cols-[120px_1fr_1fr] gap-4 items-start">
      <div className="text-xs uppercase tracking-wider text-muted-foreground pt-1">{label}</div>
      <ValueCell>
        {before.length === 0 ? <span className="text-muted-foreground">—</span> : (
          <ul className="space-y-0.5">{before.map((x) => (
            <li key={x} className={removed.includes(x) ? "bg-red-50 text-red-700 px-1.5 rounded" : ""}>{x}</li>
          ))}</ul>
        )}
      </ValueCell>
      <ValueCell highlight={changed}>
        {after.length === 0 ? <span className="text-muted-foreground">—</span> : (
          <ul className="space-y-0.5">{after.map((x) => (
            <li key={x} className={added.includes(x) ? "bg-emerald-50 text-emerald-700 px-1.5 rounded" : ""}>{x}</li>
          ))}</ul>
        )}
      </ValueCell>
    </div>
  );
}

function ValueCell({ children, highlight = false }: { children: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`rounded-md border ${highlight ? "border-primary/40 bg-accent" : "border-border bg-card"} p-2 font-mono text-xs`}>
      {children}
    </div>
  );
}
