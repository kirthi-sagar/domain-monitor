// Channel send primitives — extracted so test buttons can call them without
// going through rule matching.
import { Resend } from "resend";

export type ChannelKind = "email" | "slack" | "discord" | "telegram" | "webhook";

export interface SendInput {
  workspaceId: string;
  eventId: string;
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
  domainName: string;
}

export async function sendToChannel(kind: ChannelKind, cfg: any, input: SendInput) {
  switch (kind) {
    case "email": {
      if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { error } = await resend.emails.send({
        from: process.env.ALERT_FROM_EMAIL ?? "Sentinel <onboarding@resend.dev>",
        to: cfg.to,
        subject: `[${input.severity.toUpperCase()}] ${input.title} — ${input.domainName}`,
        text: input.body,
      });
      if (error) throw new Error(error.message);
      return;
    }
    case "slack": {
      const r = await fetch(cfg.webhookUrl, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: `*${input.title}* — \`${input.domainName}\`\n${input.body}` }),
      });
      if (!r.ok) throw new Error(`Slack: HTTP ${r.status}`);
      return;
    }
    case "discord": {
      const r = await fetch(cfg.webhookUrl, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: `**${input.title}** — \`${input.domainName}\`\n${input.body}` }),
      });
      if (!r.ok && r.status !== 204) throw new Error(`Discord: HTTP ${r.status}`);
      return;
    }
    case "telegram": {
      const url = `https://api.telegram.org/bot${cfg.botToken}/sendMessage`;
      const r = await fetch(url, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: cfg.chatId, text: `${input.title}\n${input.domainName}\n${input.body}` }),
      });
      if (!r.ok) throw new Error(`Telegram: HTTP ${r.status}`);
      return;
    }
    case "webhook": {
      const r = await fetch(cfg.url, {
        method: "POST",
        headers: { "content-type": "application/json", ...(cfg.secret ? { "x-sentinel-signature": cfg.secret } : {}) },
        body: JSON.stringify({
          event: "domain.changed", severity: input.severity, title: input.title,
          domain: input.domainName, body: input.body,
        }),
      });
      if (!r.ok) throw new Error(`Webhook: HTTP ${r.status}`);
      return;
    }
  }
}
