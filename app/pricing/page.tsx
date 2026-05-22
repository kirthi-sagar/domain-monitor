import Link from "next/link";
import { SiteNavbar } from "@/components/site/navbar";
import { SiteFooter } from "@/components/site/footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const tiers = [
  {
    name: "Free",
    price: "$0",
    suffix: "forever",
    description: "For solo devs and side projects.",
    features: ["25 domains", "Daily checks", "Email alerts", "1 workspace", "7-day event history"],
    cta: "Start free",
    featured: false,
  },
  {
    name: "Pro",
    price: "$19",
    suffix: "/ month",
    description: "For founders and small teams.",
    features: ["500 domains", "Hourly checks", "Slack + Discord + webhooks", "Unlimited team members", "90-day snapshots", "API access"],
    cta: "Start 14-day trial",
    featured: true,
  },
  {
    name: "Business",
    price: "$99",
    suffix: "/ month",
    description: "For agencies and brand teams.",
    features: ["10,000 domains", "15-min checks", "All channels + PagerDuty", "Audit logs", "SSO ready", "Priority support"],
    cta: "Contact sales",
    featured: false,
  },
];

export default function PricingPage() {
  return (
    <>
      <SiteNavbar />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">Pricing that scales with your portfolio.</h1>
          <p className="mt-4 text-muted-foreground">Start free. Upgrade when you need more domains or faster checks.</p>
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {tiers.map((t) => (
              <Card key={t.name} className={`p-8 text-left ${t.featured ? "border-primary ring-1 ring-primary/30 glow-indigo" : ""}`}>
                {t.featured && <div className="text-xs uppercase tracking-wider text-primary font-semibold mb-2">Most popular</div>}
                <div className="text-lg font-semibold">{t.name}</div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-semibold tracking-tight">{t.price}</span>
                  <span className="text-muted-foreground text-sm">{t.suffix}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{t.description}</p>
                <Button asChild className="mt-6 w-full" variant={t.featured ? "primary" : "outline"}>
                  <Link href="/signup">{t.cta}</Link>
                </Button>
                <ul className="mt-6 space-y-2.5 text-sm">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" /> <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
