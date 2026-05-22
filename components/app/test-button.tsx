"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export type ActionResult = { ok: true; message?: string } | { ok: false; message: string };

export function TestButton({
  action,
  label = "Test",
  pendingLabel = "Sending…",
  successLabel = "Test sent",
}: {
  action: () => Promise<ActionResult>;
  label?: string;
  pendingLabel?: string;
  successLabel?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          try {
            const r = await action();
            if (r.ok) toast.success(r.message ?? successLabel);
            else toast.error(r.message);
          } catch (e) {
            toast.error((e as Error).message ?? "Action failed");
          }
        })
      }
    >
      {pending ? (<><Loader2 className="h-3.5 w-3.5 animate-spin" /> {pendingLabel}</>) : label}
    </Button>
  );
}
