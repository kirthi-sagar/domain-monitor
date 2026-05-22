"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { dispatchAlertsForEvent } from "@/lib/alerts";

const KindEnum = z.enum(["expiry", "whois", "nameservers", "registrar", "status", "dns", "availability"]);
const SeverityEnum = z.enum(["info", "warning", "critical"]);

const CreateSchema = z.object({
  name: z.string().min(1).max(120),
  enabled: z.literal("on").optional(),
  kinds: z.array(KindEnum).min(1, "Pick at least one kind"),
  min_severity: SeverityEnum,
  channel_ids: z.array(z.string().uuid()).min(1, "Pick at least one channel"),
  suppression_minutes: z.coerce.number().int().min(0).max(60 * 24 * 7).default(60),
  digest: z.literal("on").optional(),
});

export async function createAlertRuleAction(formData: FormData): Promise<void> {
  const wsId = await getCurrentWorkspaceId();
  if (!wsId) redirect("/alerts?error=no-workspace");

  const parsed = CreateSchema.safeParse({
    name: formData.get("name") ?? "",
    enabled: formData.get("enabled") ?? undefined,
    kinds: formData.getAll("kinds"),
    min_severity: formData.get("min_severity") ?? "info",
    channel_ids: formData.getAll("channel_ids"),
    suppression_minutes: formData.get("suppression_minutes") ?? "60",
    digest: formData.get("digest") ?? undefined,
  });
  if (!parsed.success) {
    redirect(`/alerts/new?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("alert_rules").insert({
    workspace_id: wsId,
    name: parsed.data.name,
    enabled: parsed.data.enabled === "on",
    kinds: parsed.data.kinds as any,
    min_severity: parsed.data.min_severity as any,
    channel_ids: parsed.data.channel_ids,
    suppression_minutes: parsed.data.suppression_minutes,
    digest: parsed.data.digest === "on",
  });
  if (error) redirect(`/alerts/new?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/alerts");
  redirect("/alerts");
}

export async function toggleRuleAction(id: string, enabled: boolean): Promise<void> {
  const supabase = await createClient();
  await supabase.from("alert_rules").update({ enabled: !enabled }).eq("id", id);
  revalidatePath("/alerts");
}

export async function deleteRuleAction(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("alert_rules").delete().eq("id", id);
  revalidatePath("/alerts");
  redirect("/alerts");
}

export async function testRuleAction(id: string): Promise<void> {
  const wsId = await getCurrentWorkspaceId();
  if (!wsId) return;
  const supabase = await createClient();
  const { data: rule } = await supabase.from("alert_rules").select("*").eq("id", id).maybeSingle();
  if (!rule) return;

  await dispatchAlertsForEvent({
    workspaceId: wsId,
    eventId: `test-rule-${id}`,
    title: `[TEST] Rule "${rule.name}" fired`,
    body: "This is a test event generated from the Alerts page. If you received this, your rule is wired up correctly.",
    severity: "info",
    domainName: "test.example.com",
  });
  revalidatePath("/notifications");
}
