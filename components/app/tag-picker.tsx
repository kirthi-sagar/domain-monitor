"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, X, Check } from "lucide-react";
import { setDomainTagsAction } from "@/app/(app)/tags/actions";
import { Button } from "@/components/ui/button";

export interface TagOption { id: string; name: string; color: string; }

export function TagPicker({
  domainId, allTags, initialSelected,
}: { domainId: string; allTags: TagOption[]; initialSelected: string[] }) {
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const save = (next: string[]) => {
    setSelected(next);
    start(async () => {
      const r = await setDomainTagsAction(domainId, next);
      if (!r.ok) toast.error(r.message);
    });
  };

  const toggle = (id: string) => save(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  const chips = allTags.filter((t) => selected.includes(t.id));

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((t) => (
        <span key={t.id} className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: t.color + "22", color: t.color }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: t.color }} />
          {t.name}
          <button type="button" onClick={() => toggle(t.id)} className="ml-0.5 opacity-60 hover:opacity-100" aria-label={`Remove ${t.name}`}>
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <div className="relative">
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen((v) => !v)} disabled={pending} className="h-7">
          <Plus className="h-3.5 w-3.5" /> Tag
        </Button>
        {open && (
          <div className="absolute z-20 mt-1 w-56 rounded-md border border-border bg-card p-1 shadow-md">
            {allTags.length === 0 ? (
              <div className="px-2 py-3 text-xs text-muted-foreground">No tags yet. Create some at <a href="/tags" className="text-primary hover:underline">/tags</a>.</div>
            ) : (
              <ul className="max-h-60 overflow-auto">
                {allTags.map((t) => {
                  const on = selected.includes(t.id);
                  return (
                    <li key={t.id}>
                      <button type="button" onClick={() => toggle(t.id)} className="w-full flex items-center justify-between rounded-md px-2 py-1.5 text-xs hover:bg-muted">
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                          {t.name}
                        </span>
                        {on && <Check className="h-3.5 w-3.5 text-primary" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
