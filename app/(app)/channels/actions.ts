"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { dispatchAlertsForEvent } from "@/lib/alerts";
import { audit } from "@/lib/audit";

const ChannelKind = z.enum(["email", "slack", "discord", "telegram", "webhook"]);

const ConfigSchemas: Record<string, z.ZodType> = {
  email:    z.object({ to: z.string().email() }),
  slack:    z.object({ webhookUrl: z.string().url() }),
  discord:  z.object({ webhookUrl: z.string().url() }),
  telegram: z.object({ botToken: z.string().min(20), chatId: z.string().min(1) }),
  webhook:  z.object({ url: z.string().url(), secret: z.string().optional() }),
};

export async function createChannelAction(formData: FormData): Promise<void> {
  const wsId = await getCurrentWorkspaceId();
  if (!wsId) redirect("/channels?error=no-workspace");

  const kindRaw = String(formData.get("kind") ?? "");
  const kind = ChannelKind.safeParse(kindRaw);
  if (!kind.success) redirect("/channels/new?error=bad-kind");

  const name = String(formData.get("name") ?? "").trim() || `New ${kindRaw}`;

  const config: Record<string, string> = {};
  formData.forEach((v, k) => { if (k.startsWith("cfg_") && typeof v === "string") config[k.slice(4)] = v.trim(); });

  const parsedCfg = ConfigSchemas[kind.data].safeParse(config);
  if (!parsedCfg.success) redirect(`/channels/new?kind=${kind.data}&error=${encodeURIComponent(parsedCfg.error.issues[0].message)}`);

  const supabase = await createClient();
  await supabase.from("notification_channels").insert({
    workspace_id: wsId, kind: kind.data, name, config: parsedCfg.data as object, enabled: true,
  });
  await audit("channel.created", { workspaceId: wsId, targetKind: "channel", metadata: { kind: kind.data, name } });

  revalidatePath("/channels");
  revalidatePath("/settings");
  redirect("/channels");
}

export async function toggleChannelAction(id: string, enabled: boolean): Promise<void> {
  const supabase = await createClient();
  await supabase.from("notification_channels").update({ enabled: !enabled }).eq("id", id);
  revalidatePath("/channels");
}

export async function deleteChannelAction(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: ch } = await supabase.from("notification_channels").select("workspace_id, kind, name").eq("id", id).maybeSingle();
  await supabase.from("notification_channels").delete().eq("id", id);
  await audit("channel.deleted", { workspaceId: ch?.workspace_id, targetKind: "channel", targetId: id, metadata: { kind: ch?.kind, name: ch?.name } });
  revalidatePath("/channels");
  redirect("/channels");
}

export async function testChannelAction(id: string): Promise<{ ok: boolean; message: string }> {
  console.log("[testChannelAction] start for", id);
  const supabase = await createClient();
  const wsId = await getCurrentWorkspaceId();
  if (!wsId) return { ok: false, message: "No workspace" };

  const { data: ch } = await supabase.from("notification_channels").select("*").eq("id", id).maybeSingle();
  if (!ch) return { ok: false, message: "Channel not found" };

  console.log("[testChannelAction] sending to", ch.kind);
  try {
    const { sendToChannel } = await import("@/lib/alerts-internal");
    await sendToChannel(ch.kind, ch.config, {
      workspaceId: wsId, eventId: "test", title: "Test alert from Sentinel",
      body: `This is a test notification for channel "${ch.name}". If you can read this, your channel works.`,
      severity: "info", domainName: "example.com",
    });
    await supabase.from("notification_channels").update({
      last_test_at: new Date().toISOString(), last_test_ok: true,
    }).eq("id", id);
    revalidatePath("/channels");
    void dispatchAlertsForEvent;
    return { ok: true, message: `Test sent to ${ch.kind} channel "${ch.name}"` };
  } catch (e) {
    console.error("[testChannelAction] FAILED:", (e as Error).message);
    await supabase.from("notification_channels").update({
      last_test_at: new Date().toISOString(), last_test_ok: false,
    }).eq("id", id);
    revalidatePath("/channels");
    return { ok: false, message: (e as Error).message };
  }
}
