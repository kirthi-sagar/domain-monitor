// Notification dispatch — routes events to channels matched by alert rules.
import { createServiceClient } from "@/lib/supabase/server";
import { sendToChannel, type ChannelKind, type SendInput } from "@/lib/alerts-internal";

export { sendToChannel };

export async function dispatchAlertsForEvent(input: SendInput) {
  const supa = await createServiceClient();

  const { data: rules } = await supa.from("alert_rules")
    .select("*").eq("workspace_id", input.workspaceId).eq("enabled", true);

  const channelIds = Array.from(new Set((rules ?? []).flatMap((r: any) => r.channel_ids ?? [])));
  if (channelIds.length === 0) return { dispatched: 0 };

  const { data: channels } = await supa.from("notification_channels")
    .select("*").in("id", channelIds).eq("enabled", true);

  let dispatched = 0;
  for (const ch of (channels ?? []) as any[]) {
    try {
      await sendToChannel(ch.kind as ChannelKind, ch.config, input);
      await supa.from("notifications").insert({
        workspace_id: input.workspaceId, channel_id: ch.id, event_id: input.eventId,
        status: "sent", payload: { title: input.title, body: input.body } as any,
        delivered_at: new Date().toISOString(),
      });
      dispatched++;
    } catch (e) {
      await supa.from("notifications").insert({
        workspace_id: input.workspaceId, channel_id: ch.id, event_id: input.eventId,
        status: "failed", error: (e as Error).message,
      });
    }
  }
  return { dispatched };
}
