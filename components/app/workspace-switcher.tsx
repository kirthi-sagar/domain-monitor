"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { switchWorkspaceAction } from "@/app/(app)/settings/workspaces/actions";

export interface WorkspaceOption { id: string; name: string; slug: string; }

export function WorkspaceSwitcher({
  current, options,
}: { current: WorkspaceOption | null; options: WorkspaceOption[] }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  return (
    <div className="relative">
      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => setOpen((v) => !v)}>
        <span className="font-medium max-w-[160px] truncate">{current?.name ?? "Select workspace"}</span>
        <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute z-30 mt-1 w-64 rounded-md border border-border bg-card p-1 shadow-md">
            <div className="px-2 py-1 text-xs uppercase tracking-wider text-muted-foreground">Workspaces</div>
            <ul className="max-h-72 overflow-auto">
              {options.map((w) => {
                const active = current?.id === w.id;
                return (
                  <li key={w.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        if (!active) start(() => switchWorkspaceAction(w.id));
                      }}
                      className="w-full flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                    >
                      <span className="truncate">{w.name}</span>
                      {active && <Check className="h-4 w-4 text-primary" />}
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-border mt-1 pt-1">
              <Link href="/settings/workspaces/new" onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted text-primary">
                <Plus className="h-4 w-4" /> Create workspace
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
