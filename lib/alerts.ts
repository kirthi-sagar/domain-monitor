// Notification dispatch. Email via Resend, plus generic webhook / Slack / Discord / Telegram.
import { Resend } from "resend";
import { createServiceClient } from "@/lib/supabase/server";

type ChannelKind = "email" | "slack" | "discord" | "telegram" | "webhook";

interface SendInput {
  workspaceId: string;
  eventId: string;
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
  domainName: string;
}

export async function dispatchAlertsForEvent(input: SendInput) {
  const supa = await createServiceClient();

  // Find matching alert rules for this workspace.
  const { data: rules } = await supa.from("alert_rules")
    .select("*").eq("workspace_id", input.workspaceId).eq("enabled", true);

  const channelIds = Array.from(new Set((rules ?? []).flatMap((r) => r.channel_ids ?? [])));
  if (channelIds.length === 0) return { dispatched: 0 };

  const { data: channels } = await supa.from("notification_channels")
    .select("*").in("id", channelIds).eq("enabled", true);

  let dispatched = 0;
  for (const ch of channels ?? []) {
    try {
      await sendToChannel(ch.kind as ChannelKind, ch.config, input);
      await supa.from("notifications").insert({
        workspace_id: input.workspaceId,
        channel_id: ch.id,
        event_id: input.eventId,
        status: "sent",
        payload: { title: input.title, body: input.body } as any,
        delivered_at: new Date().toISOString(),
      });
      dispatched++;
    } catch (e) {
      await supa.from("notifications").insert({
        workspace_id: input.workspaceId,
        channel_id: ch.id,
        event_id: input.eventId,
        status: "failed",
        error: (e as Error).message,
      });
    }
  }
  return { dispatched };
}

async function sendToChannel(kind: ChannelKind, cfg: any, input: SendInput) {
  switch (kind) {
    case "email": {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.ALERT_FROM_EMAIL ?? "Sentinel <alerts@sentinel.dev>",
        to: cfg.to,
        subject: `[${input.severity.toUpperCase()}] ${input.title} — ${input.domainName}`,
        text: input.body,
      });
      return;
    }
    case "slack":
    case "discord": {
      await fetch(cfg.webhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text: `*${input.title}* — \`${input.domainName}\`\n${input.body}`,
          content: `**${input.title}** — \`${input.domainName}\`\n${input.body}`, // Discord
        }),
      });
      return;
    }
    case "telegram": {
      const url = `https://api.telegram.org/bot${cfg.botToken}/sendMessage`;
      await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: cfg.chatId, text: `${input.title}\n${input.domainName}\n${input.body}` }),
      });
      return;
    }
    case "webhook": {
      await fetch(cfg.url, {
        method: "POST",
        headers: { "content-type": "application/json", ...(cfg.secret ? { "x-sentinel-signature": cfg.secret } : {}) },
        body: JSON.stringify({
          event: "domain.changed",
          severity: input.severity,
          title: input.title,
          domain: input.domainName,
          body: input.body,
        }),
      });
      return;
    }
  }
}
