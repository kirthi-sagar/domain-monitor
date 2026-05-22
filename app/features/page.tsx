import { SiteNavbar } from "@/components/site/navbar";
import { SiteFooter } from "@/components/site/footer";
import { Card } from "@/components/ui/card";
import { ShieldCheck, Bell, Globe2, KeyRound, GitBranch, Workflow, FileSearch, Users, FileBarChart } from "lucide-react";

const features = [
  { icon: ShieldCheck, title: "Expiration tracking", body: "Multi-threshold reminders at 90, 60, 30, 14, 7, 3, and 1 days. Custom thresholds per domain." },
  { icon: Globe2,      title: "WHOIS monitoring",   body: "RDAP + classic WHOIS with normalized parsing. Snapshots stored for historical diffing." },
  { icon: GitBranch,   title: "Nameserver changes", body: "Detect NS swaps and infrastructure handoffs the moment they happen." },
  { icon: FileSearch,  title: "DNS record watch",   body: "Track A, AAAA, MX, TXT, and CNAME records. Diff against the previous snapshot." },
  { icon: Bell,        title: "Alert routing",      body: "Per-portfolio rules, severity filters, suppression windows, and digest mode." },
  { icon: KeyRound,    title: "API & API keys",     body: "Scoped, hashed API keys. REST endpoints for every resource. Outbound webhooks." },
  { icon: Workflow,    title: "Bulk operations",    body: "CSV import with dry-run validation. Bulk tag, archive, and re-check." },
  { icon: Users,       title: "Workspaces & roles", body: "Owner / admin / member / viewer roles. Invite teammates. Multi-tenant isolation." },
  { icon: FileBarChart,title: "Audit & exports",    body: "CSV and PDF reports. Full audit logs for sensitive actions." },
];

export default function FeaturesPage() {
  return (
    <>
      <SiteNavbar />
      <main className="flex-1 mx-auto max-w-6xl px-6 py-20">
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-center">Every feature you need to protect a portfolio.</h1>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(({ icon: Icon, title, body }) => (
            <Card key={title} className="p-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Icon className="h-5 w-5" />
              </div>
              <div className="mt-4 font-semibold">{title}</div>
              <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
            </Card>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
