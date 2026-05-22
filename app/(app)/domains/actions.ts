"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { checkDomain } from "@/lib/monitor";
import { audit } from "@/lib/audit";

const DOMAIN_RE = /^([a-z0-9-]+\.)+[a-z]{2,}$/i;

const AddDomainSchema = z.object({
  name: z.string().min(3).regex(DOMAIN_RE, "Enter a valid domain like acme.com"),
  notes: z.string().max(2000).optional(),
});

export async function addDomainAction(formData: FormData): Promise<void> {
  const parsed = AddDomainSchema.safeParse({
    name: String(formData.get("name") ?? "").trim().toLowerCase(),
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  });
  if (!parsed.success) redirect(`/domains/new?error=${encodeURIComponent(parsed.error.issues[0].message)}`);

  const wsId = await getCurrentWorkspaceId();
  if (!wsId) redirect("/domains/new?error=no-workspace");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase.from("domains").insert({
    workspace_id: wsId,
    added_by: user!.id,
    name: parsed.data.name,
    notes: parsed.data.notes ?? null,
    monitor_flags: ["expiry", "whois", "nameservers", "registrar", "status", "dns", "availability"],
  }).select("id").single();
  if (error || !data) redirect(`/domains/new?error=${encodeURIComponent(error?.message ?? "insert failed")}`);

  checkDomain(data!.id).catch(() => {});
  await audit("domain.added", { workspaceId: wsId, targetKind: "domain", targetId: data!.id, metadata: { name: parsed.data.name } });
  revalidatePath("/domains");
  revalidatePath("/dashboard");
  redirect(`/domains/${data!.id}`);
}

export async function deleteDomainAction(id: string) {
  const supabase = await createClient();
  const { data: d } = await supabase.from("domains").select("workspace_id, name").eq("id", id).maybeSingle();
  await supabase.from("domains").delete().eq("id", id);
  await audit("domain.deleted", { workspaceId: d?.workspace_id, targetKind: "domain", targetId: id, metadata: { name: d?.name } });
  revalidatePath("/domains");
  redirect("/domains");
}

const MONITOR_KINDS = ["expiry","whois","nameservers","registrar","status","dns","availability"] as const;

const EditSchema = z.object({
  notes: z.string().max(2000).optional(),
  monitor_flags: z.array(z.enum(MONITOR_KINDS)).min(1, "Pick at least one monitor"),
  alert_thresholds: z.array(z.coerce.number().int().min(0).max(365)).min(1).max(20),
  check_interval_minutes: z.coerce.number().int().min(15).max(60 * 24 * 30).nullable().optional(),
});

export async function editDomainAction(id: string, formData: FormData): Promise<{ ok: boolean; message: string }> {
  const thresholdsRaw = String(formData.get("alert_thresholds") ?? "")
    .split(/[,\s]+/).filter(Boolean);
  const intervalRaw = String(formData.get("check_interval_minutes") ?? "").trim();
  const parsed = EditSchema.safeParse({
    notes: String(formData.get("notes") ?? "").trim() || undefined,
    monitor_flags: formData.getAll("monitor_flags"),
    alert_thresholds: thresholdsRaw,
    check_interval_minutes: intervalRaw === "" ? null : intervalRaw,
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("domains").update({
    notes: parsed.data.notes ?? null,
    monitor_flags: parsed.data.monitor_flags,
    alert_thresholds: parsed.data.alert_thresholds,
    check_interval_minutes: parsed.data.check_interval_minutes,
  }).eq("id", id);
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/domains/${id}`);
  revalidatePath("/domains");
  return { ok: true, message: "Settings saved" };
}

export async function checkNowAction(id: string): Promise<{ ok: boolean; message: string }> {
  console.log("[checkNowAction] starting for", id);
  try {
    const r = await checkDomain(id, { force: true });
    console.log("[checkNowAction] result:", r);
    revalidatePath(`/domains/${id}`);
    revalidatePath("/domains");
    if (r.source === "none") {
      return { ok: false, message: "Couldn't reach WHOIS/RDAP for this domain. The authoritative registry may be down or this environment can't reach it." };
    }
    return { ok: true, message: `Updated via ${r.source}${r.changes ? ` — ${r.changes} change${r.changes === 1 ? "" : "s"}` : ""}` };
  } catch (e) {
    console.error("[checkNowAction] FAILED:", (e as Error).message);
    return { ok: false, message: (e as Error).message };
  }
}
