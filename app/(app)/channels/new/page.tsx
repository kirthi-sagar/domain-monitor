import Link from "next/link";
import { createChannelAction } from "../actions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, MessageSquare, Send, Webhook } from "lucide-react";

const KIND_LABELS: Record<string, { label: string; icon: any; desc: string }> = {
  email:    { label: "Email",    icon: Mail,          desc: "Plain email via Resend." },
  slack:    { label: "Slack",    icon: MessageSquare, desc: "Incoming webhook URL." },
  discord:  { label: "Discord",  icon: MessageSquare, desc: "Channel webhook URL." },
  telegram: { label: "Telegram", icon: Send,          desc: "Bot token + chat ID." },
  webhook:  { label: "Webhook",  icon: Webhook,       desc: "Any HTTPS endpoint." },
};

export default async function NewChannelPage({ searchParams }: { searchParams: Promise<{ kind?: string; error?: string }> }) {
  const { kind = "email", error } = await searchParams;
  const meta = KIND_LABELS[kind] ?? KIND_LABELS.email;
  const Icon = meta.icon;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/channels" className="text-sm text-muted-foreground hover:text-foreground">← Channels</Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Add notification channel</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pick a type</CardTitle>
          <CardDescription>You can add more later.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {Object.entries(KIND_LABELS).map(([k, m]) => {
              const KIcon = m.icon;
              const active = k === kind;
              return (
                <Link key={k} href={`/channels/new?kind=${k}`}
                  className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs transition-colors ${active ? "border-primary bg-accent text-accent-foreground" : "border-border hover:bg-muted"}`}>
                  <KIcon className="h-5 w-5" /> {m.label}
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Icon className="h-5 w-5 text-primary" /> {meta.label} channel</CardTitle>
          <CardDescription>{meta.desc}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createChannelAction} className="space-y-4">
            <input type="hidden" name="kind" value={kind} />
            <div className="space-y-1.5">
              <Label htmlFor="name">Channel name</Label>
              <Input id="name" name="name" placeholder={`${meta.label} — oncall`} required />
            </div>
            {kind === "email" && (
              <div className="space-y-1.5">
                <Label htmlFor="cfg_to">Send to</Label>
                <Input id="cfg_to" name="cfg_to" type="email" placeholder="alerts@yourcompany.com" required />
              </div>
            )}
            {(kind === "slack" || kind === "discord") && (
              <div className="space-y-1.5">
                <Label htmlFor="cfg_webhookUrl">Webhook URL</Label>
                <Input id="cfg_webhookUrl" name="cfg_webhookUrl" type="url"
                  placeholder={kind === "slack" ? "https://hooks.slack.com/services/…" : "https://discord.com/api/webhooks/…"} required />
              </div>
            )}
            {kind === "telegram" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="cfg_botToken">Bot token</Label>
                  <Input id="cfg_botToken" name="cfg_botToken" placeholder="123456:ABC-DEF..." required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cfg_chatId">Chat ID</Label>
                  <Input id="cfg_chatId" name="cfg_chatId" placeholder="-1001234567890" required />
                </div>
              </>
            )}
            {kind === "webhook" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="cfg_url">Endpoint URL</Label>
                  <Input id="cfg_url" name="cfg_url" type="url" placeholder="https://example.com/sentinel" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cfg_secret">Signature secret (optional)</Label>
                  <Input id="cfg_secret" name="cfg_secret" placeholder="Sent as X-Sentinel-Signature" />
                </div>
              </>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit">Create channel</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
