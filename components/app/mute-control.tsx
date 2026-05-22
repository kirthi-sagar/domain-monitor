"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, BellOff, Bell } from "lucide-react";
import { muteDomainAction } from "@/app/(app)/domains/actions";

const PRESETS = [
  { label: "1 hour", hours: 1 },
  { label: "4 hours", hours: 4 },
  { label: "1 day", hours: 24 },
  { label: "1 week", hours: 24 * 7 },
];

export function MuteControl({ domainId, mutedUntil }: { domainId: string; mutedUntil: string | null }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const isMuted = !!mutedUntil && new Date(mutedUntil) > new Date();

  const set = (hours: number | null) => {
    setOpen(false);
    start(async () => {
      const r = await muteDomainAction(domainId, hours);
      r.ok ? toast.success(r.message) : toast.error(r.message);
    });
  };

  return (
    <div className="relative inline-block">
      <Button type="button" size="sm" variant={isMuted ? "primary" : "outline"} disabled={pending} onClick={() => setOpen((v) => !v)}>
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isMuted ? <BellOff className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
        {isMuted ? "Muted" : "Mute alerts"}
      </Button>
      {isMuted && <Badge variant="neutral" className="ml-2 text-xs">until {new Date(mutedUntil!).toLocaleString()}</Badge>}
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-30 mt-1 w-56 rounded-md border border-border bg-card p-1 shadow-md">
            <div className="px-2 py-1 text-xs uppercase tracking-wider text-muted-foreground">Mute alerts for</div>
            {PRESETS.map((p) => (
              <button key={p.hours} type="button" onClick={() => set(p.hours)}
                className="w-full text-left rounded-md px-2 py-1.5 text-sm hover:bg-muted">{p.label}</button>
            ))}
            {isMuted && (
              <>
                <div className="border-t border-border my-1" />
                <button type="button" onClick={() => set(null)}
                  className="w-full text-left rounded-md px-2 py-1.5 text-sm hover:bg-muted text-primary">Un-mute now</button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
