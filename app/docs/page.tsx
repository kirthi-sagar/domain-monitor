import { SiteNavbar } from "@/components/site/navbar";
import { SiteFooter } from "@/components/site/footer";
import { Card } from "@/components/ui/card";

export default function DocsPage() {
  return (
    <>
      <SiteNavbar />
      <main className="flex-1 mx-auto max-w-3xl px-6 py-16 prose-sm">
        <h1 className="text-4xl font-semibold tracking-tight">Documentation</h1>
        <p className="mt-3 text-muted-foreground">Quickstart, API reference, and webhook contract.</p>

        <Section title="Quickstart">
          <ol className="list-decimal pl-5 space-y-1.5 text-sm">
            <li>Create an account and a workspace.</li>
            <li>Add domains manually or via CSV.</li>
            <li>Configure a notification channel under <code>/settings</code>.</li>
            <li>Receive your first event within 24 hours.</li>
          </ol>
        </Section>

        <Section title="REST API">
          <p>Base URL: <code>https://api.sentinel.dev/v1</code>. Authenticate with <code>Authorization: Bearer YOUR_API_KEY</code>.</p>
          <pre className="code-window p-4 mt-3 text-xs overflow-x-auto">{`GET    /domains
POST   /domains
GET    /domains/:id
PATCH  /domains/:id
DELETE /domains/:id
POST   /domains/:id/check-now
GET    /domains/:id/events
GET    /notifications
POST   /notification-channels`}</pre>
        </Section>

        <Section title="Webhook payload">
          <pre className="code-window p-4 text-xs overflow-x-auto">{`{
  "event":    "domain.changed",
  "kind":     "nameservers",
  "severity": "warning",
  "domain":   "acme.com",
  "before":   ["ns1.aws.com"],
  "after":    ["ns1.evil.io"],
  "occurredAt": "2026-05-21T11:23:45Z"
}`}</pre>
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="mt-8 p-6">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 text-sm text-foreground/90 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-xs">{children}</div>
    </Card>
  );
}
