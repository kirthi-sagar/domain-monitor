// Notification dispatch — routes events to channels matched by alert rules.
import { createServiceClient } from "@/lib/supabase/server";
import { sendToChannel, type ChannelKind, type SendInput } from "@/lib/alerts-internal";

export { sendToChannel };

const SEVERITY_RANK = { info: 0, warning: 1, critical: 2 } as const;

export interface DispatchInput extends SendInput {
  kind?: string; // event kind for rule filtering; omit for ad-hoc/test sends
}

export async function dispatchAlertsForEvent(input: DispatchInput) {
  const supa = await createServiceClient();

  // Honor per-domain mute window: if the event references a specific domain
  // and that domain has alerts_muted_until in the future, suppress entirely.
  if (input.domainName) {
    const { data: d } = await supa.from("domains")
      .select("alerts_muted_until").eq("workspace_id", input.workspaceId).eq("name", input.domainName).maybeSingle();
    if (d?.alerts_muted_until && new Date(d.alerts_muted_until) > new Date()) {
      return { dispatched: 0, muted: true };
    }
  }

  const { data: rules } = await supa.from("alert_rules")
    .select("*").eq("workspace_id", input.workspaceId).eq("enabled", true);

  const matching = (rules ?? []).filter((r: any) => {
    if (input.kind && Array.isArray(r.kinds) && !r.kinds.includes(input.kind)) return false;
    const min = SEVERITY_RANK[r.min_severity as keyof typeof SEVERITY_RANK] ?? 0;
    const cur = SEVERITY_RANK[input.severity] ?? 0;
    return cur >= min;
  });

  const channelIds = Array.from(new Set(matching.flatMap((r: any) => r.channel_ids ?? [])));
  if (channelIds.length === 0) return { dispatched: 0 };

  const { data: channels } = await supa.from("notification_channels")
    .select("*").in("id", channelIds).eq("enabled", true);

  // Suppression: for each channel, skip if we sent a notification with same
  // event_id within the rule's window. Use the strictest (max) window across matching rules.
  const maxSuppression = matching.reduce((acc: number, r: any) => Math.max(acc, r.suppression_minutes ?? 0), 0);

  let dispatched = 0;
  for (const ch of (channels ?? []) as any[]) {
    if (maxSuppression > 0 && input.eventId) {
      const since = new Date(Date.now() - maxSuppression * 60_000).toISOString();
      const { count } = await supa.from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", input.workspaceId).eq("channel_id", ch.id).eq("event_id", input.eventId)
        .eq("status", "sent").gte("created_at", since);
      if ((count ?? 0) > 0) {
        await supa.from("notifications").insert({
          workspace_id: input.workspaceId, channel_id: ch.id, event_id: input.eventId,
          status: "suppressed", payload: { reason: "within suppression window" } as any,
        });
        continue;
      }
    }

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
