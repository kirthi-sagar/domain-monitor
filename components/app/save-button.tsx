"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function SaveButton({
  action,
  label = "Save",
  pendingLabel = "Saving…",
}: {
  action: (formData: FormData) => Promise<{ ok: boolean; message: string }>;
  label?: string;
  pendingLabel?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      disabled={pending}
      onClick={(e) => {
        const form = (e.currentTarget as HTMLButtonElement).closest("form");
        if (!form) return;
        const fd = new FormData(form);
        start(async () => {
          try {
            const r = await action(fd);
            if (r.ok) toast.success(r.message);
            else toast.error(r.message);
          } catch (e2) {
            toast.error((e2 as Error).message ?? "Failed");
          }
        });
      }}
    >
      {pending ? (<><Loader2 className="h-3.5 w-3.5 animate-spin" /> {pendingLabel}</>) : label}
    </Button>
  );
}
