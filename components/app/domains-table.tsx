"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { daysUntil, expirySeverity, formatDate } from "@/lib/utils";
import { bulkDomainsAction, bulkTagDomainsAction } from "@/app/(app)/domains/actions";
import { Loader2, Archive, RefreshCw, Trash2, Tag as TagIcon } from "lucide-react";

export interface DomainRowLite {
  id: string; name: string; registrar: string | null;
  expiration_date: string | null; last_checked_at: string | null;
}
export interface TagOpt { id: string; name: string; color: string }

export function DomainsTable({ rows, tags }: { rows: DomainRowLite[]; tags: TagOpt[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const [tagMenu, setTagMenu] = useState(false);

  const allChecked = rows.length > 0 && selected.size === rows.length;
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(rows.map((r) => r.id)));
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const ids = Array.from(selected);
  const run = (op: "recheck" | "archive" | "delete", confirmMsg?: string) => {
    if (confirmMsg && !confirm(confirmMsg)) return;
    start(async () => {
      const r = await bulkDomainsAction(ids, op);
      r.ok ? toast.success(r.message) : toast.error(r.message);
      if (r.ok && (op === "delete" || op === "archive")) setSelected(new Set());
    });
  };

  return (
    <>
      {ids.length > 0 && (
        <div className="sticky top-14 z-10 -mt-2 mb-2 flex flex-wrap items-center gap-2 rounded-md border border-primary/30 bg-accent px-3 py-2 text-sm">
          <span className="font-medium">{ids.length} selected</span>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run("recheck")}>
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Re-check
          </Button>
          <div className="relative">
            <Button size="sm" variant="outline" disabled={pending || tags.length === 0} onClick={() => setTagMenu((v) => !v)}>
              <TagIcon className="h-3.5 w-3.5" /> Tag
            </Button>
            {tagMenu && (
              <div className="absolute mt-1 w-56 rounded-md border border-border bg-card p-1 shadow-md z-10">
                {tags.length === 0 ? (
                  <div className="px-2 py-2 text-xs text-muted-foreground">No tags yet.</div>
                ) : tags.map((t) => (
                  <button key={t.id} type="button"
                    onClick={() => {
                      setTagMenu(false);
                      start(async () => {
                        const r = await bulkTagDomainsAction(ids, [t.id]);
                        r.ok ? toast.success(r.message) : toast.error(r.message);
                      });
                    }}
                    className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run("archive")}>
            <Archive className="h-3.5 w-3.5" /> Archive
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive" disabled={pending}
            onClick={() => run("delete", `Delete ${ids.length} domain${ids.length === 1 ? "" : "s"}? This cannot be undone.`)}>
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      )}

      <Table>
        <THead>
          <TR>
            <TH className="w-10"><input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Select all" /></TH>
            <TH>Domain</TH>
            <TH>Registrar</TH>
            <TH>Expires</TH>
            <TH>Last checked</TH>
            <TH>Status</TH>
          </TR>
        </THead>
        <TBody>
          {rows.map((d) => {
            const days = daysUntil(d.expiration_date);
            const sev = expirySeverity(days);
            return (
              <TR key={d.id}>
                <TD><input type="checkbox" checked={selected.has(d.id)} onChange={() => toggleOne(d.id)} aria-label={`Select ${d.name}`} /></TD>
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
    </>
  );
}
