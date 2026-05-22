import Link from "next/link";
import { SiteNavbar } from "@/components/site/navbar";
import { SiteFooter } from "@/components/site/footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ShieldCheck, Bell, Globe2, KeyRound, GitBranch, Workflow,
  Mail, MessageSquare, Send, Webhook, ArrowRight, Check,
} from "lucide-react";

export default function HomePage() {
  return (
    <>
      <SiteNavbar />
      <main className="flex-1">
        <Hero />
        <CodeShowcase />
        <Features />
        <HowItWorks />
        <Channels />
        <FAQ />
        <CTA />
      </main>
      <SiteFooter />
    </>
  );
}

/* ---------------- Hero ---------------- */
function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-grid pointer-events-none" />
      <div className="relative mx-auto max-w-6xl px-6 pt-28 pb-20 text-center">
        <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.05]">
          Don&apos;t lose another <span className="text-primary">domain</span>.
          <br className="hidden sm:block" />
          Watch every change. Never miss a renewal.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Sentinel tracks expiration dates, WHOIS, DNS and nameservers across your entire portfolio —
          and routes alerts to email, Slack, Discord, Telegram, or any webhook.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button asChild size="lg" className="px-6">
            <Link href="/signup">Start free — 25 domains <ArrowRight className="ml-1" /></Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/docs">Read the docs</Link>
          </Button>
        </div>

        <div className="mx-auto mt-10 max-w-md rounded-lg border border-border bg-card px-4 py-2.5 text-left font-mono text-sm flex items-center gap-3">
          <span className="text-primary">$</span>
          <span className="text-muted-foreground">curl -X POST https://api.sentinel.dev/v1/domains \</span>
        </div>

      </div>
    </section>
  );
}

/* ---------------- Code Showcase ---------------- */
function CodeShowcase() {
  const tabs = [
    { id: "add", label: "domains.ts", body: ADD_DOMAIN_CODE },
    { id: "wh", label: "webhook.json", body: WEBHOOK_CODE },
    { id: "rule", label: "alerts.ts", body: ALERT_RULE_CODE },
    { id: "snap", label: "snapshot.diff", body: SNAPSHOT_CODE },
  ];
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="text-center mb-10">
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">One API. Every signal.</h2>
        <p className="mt-3 text-muted-foreground">Add domains, configure alerts, receive change events — all in code.</p>
      </div>
      <Card className="overflow-hidden glow-indigo">
        <div className="flex items-center gap-2 border-b border-[#1f1f33] bg-[#0b0b14] px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
          <div className="ml-4 flex gap-1">
            {tabs.map((t, i) => (
              <span key={t.id} className={`rounded-md px-3 py-1 text-xs font-mono ${i === 0 ? "bg-[#1f1f33] text-white" : "text-zinc-400"}`}>
                {t.label}
              </span>
            ))}
          </div>
        </div>
        <pre className="code-window m-0 p-6 overflow-x-auto" dangerouslySetInnerHTML={{ __html: tabs[0].body }} />
      </Card>
    </section>
  );
}

const ADD_DOMAIN_CODE = `<span class="tok-com">// Add a domain and start monitoring in one call</span>
<span class="tok-key">const</span> domain = <span class="tok-key">await</span> sentinel.<span class="tok-fn">domains</span>.<span class="tok-fn">create</span>({
  name: <span class="tok-str">"acme.com"</span>,
  monitor: [<span class="tok-str">"expiry"</span>, <span class="tok-str">"whois"</span>, <span class="tok-str">"nameservers"</span>, <span class="tok-str">"dns"</span>],
  alertThresholds: [<span class="tok-num">90</span>, <span class="tok-num">30</span>, <span class="tok-num">7</span>, <span class="tok-num">1</span>],
  tags: [<span class="tok-str">"production"</span>, <span class="tok-str">"brand"</span>],
  channels: [<span class="tok-str">"slack:#oncall"</span>, <span class="tok-str">"email:domains@acme.com"</span>],
});`;

const WEBHOOK_CODE = `{
  <span class="tok-tag">"event"</span>: <span class="tok-str">"domain.changed"</span>,
  <span class="tok-tag">"kind"</span>: <span class="tok-str">"nameservers"</span>,
  <span class="tok-tag">"severity"</span>: <span class="tok-str">"warning"</span>,
  <span class="tok-tag">"domain"</span>: <span class="tok-str">"acme.com"</span>,
  <span class="tok-tag">"before"</span>: [<span class="tok-str">"ns1.aws.com"</span>],
  <span class="tok-tag">"after"</span>: [<span class="tok-str">"ns1.evil.io"</span>]
}`;

const ALERT_RULE_CODE = `sentinel.<span class="tok-fn">alerts</span>.<span class="tok-fn">create</span>({
  name: <span class="tok-str">"Critical brand domains"</span>,
  tag: <span class="tok-str">"brand"</span>,
  kinds: [<span class="tok-str">"whois"</span>, <span class="tok-str">"nameservers"</span>],
  minSeverity: <span class="tok-str">"warning"</span>,
  channels: [slackOncall, pagerDuty],
  suppressionMinutes: <span class="tok-num">60</span>,
});`;

const SNAPSHOT_CODE = `<span class="tok-com">- expirationDate: 2026-04-12</span>
<span class="tok-str">+ expirationDate: 2027-04-12</span>
<span class="tok-com">- registrar:      "GoDaddy"</span>
<span class="tok-str">+ registrar:      "Cloudflare Registrar"</span>`;

/* ---------------- Features ---------------- */
function Features() {
  const items = [
    { icon: ShieldCheck, title: "Expiry tracking", body: "Multi-threshold reminders (90, 60, 30, 14, 7, 3, 1d). Never get caught by a missed renewal." },
    { icon: Globe2,      title: "WHOIS & DNS",     body: "Snapshot every check. Surface diffs in registrar, status flags, and DNS records over time." },
    { icon: GitBranch,   title: "Nameserver watch", body: "Detect NS hijacks and infrastructure handoffs the moment they happen." },
    { icon: Bell,        title: "Multi-channel alerts", body: "Email, Slack, Discord, Telegram, generic webhooks. Routing rules per portfolio." },
    { icon: KeyRound,    title: "API & webhooks",  body: "Scoped API keys, REST, and outbound webhooks for fully automated workflows." },
    { icon: Workflow,    title: "Bulk imports",    body: "CSV import with validation and dry-run. Tag and organize 10,000 domains in minutes." },
  ];
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">Everything you need to keep control.</h2>
        <p className="mt-3 text-muted-foreground">Built for founders, agencies, DevOps, and brand protection teams.</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(({ icon: Icon, title, body }) => (
          <Card key={title} className="p-6 hover:border-primary/30 transition-colors">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Icon className="h-5 w-5" />
            </div>
            <div className="mt-4 font-semibold">{title}</div>
            <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
            <Link href="/features" className="mt-4 inline-flex items-center text-sm font-medium text-primary hover:underline">
              Learn more <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Card>
        ))}
      </div>
    </section>
  );
}

/* ---------------- How it works ---------------- */
function HowItWorks() {
  const steps = [
    { n: "01", title: "Add your domains", body: "Manually, by CSV, or via API. Tag and organize into portfolios." },
    { n: "02", title: "We watch them", body: "Hourly WHOIS, DNS, nameserver, and expiry checks. Every snapshot kept for diffing." },
    { n: "03", title: "You get alerted", body: "Routed via your channels with severity, suppression windows, and dedupe." },
  ];
  return (
    <section className="border-y border-border bg-muted/40">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">How it works.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((s) => (
            <div key={s.n} className="relative rounded-xl border border-border bg-card p-6">
              <div className="font-mono text-xs text-primary">{s.n}</div>
              <div className="mt-3 text-lg font-semibold">{s.title}</div>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Channels ---------------- */
function Channels() {
  const ch = [
    { icon: Mail,          label: "Email" },
    { icon: MessageSquare, label: "Slack" },
    { icon: MessageSquare, label: "Discord" },
    { icon: Send,          label: "Telegram" },
    { icon: Webhook,       label: "Webhooks" },
  ];
  return (
    <section className="mx-auto max-w-6xl px-6 py-20 text-center">
      <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">Route alerts wherever your team lives.</h2>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {ch.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm">
            <Icon className="h-4 w-4 text-primary" /> {label}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- FAQ ---------------- */
function FAQ() {
  const faqs = [
    { q: "How often do you check domains?", a: "Hourly for paid plans, daily for free. You can override per-domain or per-workspace." },
    { q: "Which TLDs do you support?", a: "All TLDs with public WHOIS or RDAP. We fall back to RDAP for newer extensions." },
    { q: "Can I self-host?", a: "The app ships with Docker and Supabase, runnable on any VPS." },
    { q: "Do you store WHOIS history?", a: "Every check produces a snapshot. Compare any two points in time." },
  ];
  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-center">FAQ</h2>
      <div className="mt-10 divide-y divide-border rounded-xl border border-border bg-card">
        {faqs.map((f) => (
          <details key={f.q} className="group p-5">
            <summary className="flex cursor-pointer items-center justify-between font-medium">
              {f.q}
              <span className="text-primary group-open:rotate-45 transition-transform">+</span>
            </summary>
            <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/* ---------------- CTA ---------------- */
function CTA() {
  const bullets = ["25 domains free forever", "Email alerts included", "Upgrade anytime"];
  return (
    <section className="mx-auto max-w-6xl px-6 pb-24">
      <div className="rounded-2xl border border-border bg-[#1d1b4b] text-white p-10 sm:p-14 text-center glow-indigo">
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">Stop losing sleep over domain renewals.</h2>
        <p className="mt-3 text-white/70 max-w-xl mx-auto">Add your portfolio in under 5 minutes. Get your first alert tonight.</p>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button asChild size="lg" className="bg-white text-[#1d1b4b] hover:bg-white/90">
            <Link href="/signup">Create your workspace</Link>
          </Button>
          <Button asChild size="lg" variant="ghost" className="text-white hover:bg-white/10">
            <Link href="/pricing">See pricing</Link>
          </Button>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/60">
          {bullets.map((b) => (
            <span key={b} className="inline-flex items-center gap-1.5"><Check className="h-4 w-4" /> {b}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
