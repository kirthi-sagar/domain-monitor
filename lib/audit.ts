import { createServiceClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/session";

export async function audit(
  action: string,
  opts?: { workspaceId?: string | null; targetKind?: string; targetId?: string; metadata?: Record<string, unknown> }
) {
  try {
    const user = await getUser();
    const svc = await createServiceClient();
    await svc.from("audit_logs").insert({
      workspace_id: opts?.workspaceId ?? null,
      actor_id: user?.id ?? null,
      actor_kind: user ? "user" : "system",
      action,
      target_kind: opts?.targetKind ?? null,
      target_id: opts?.targetId ?? null,
      metadata: opts?.metadata ?? null,
    });
  } catch (e) {
    console.warn("[audit] log failed:", (e as Error).message);
  }
}
