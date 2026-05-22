import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-muted/40">
      <div className="mx-auto max-w-6xl px-6 py-12 grid grid-cols-2 md:grid-cols-5 gap-8 text-sm">
        <div className="col-span-2">
          <Logo />
          <p className="mt-3 text-muted-foreground max-w-xs">
            Domain monitoring and alerting for teams that can&apos;t afford to lose a domain.
          </p>
        </div>
        <FooterCol title="Product" links={[
          ["Features", "/features"],
          ["Pricing", "/pricing"],
          ["Changelog", "/docs/changelog"],
          ["Roadmap", "/docs/roadmap"],
        ]} />
        <FooterCol title="Developers" links={[
          ["API Docs", "/docs/api"],
          ["Webhooks", "/docs/webhooks"],
          ["Status", "/status"],
        ]} />
        <FooterCol title="Company" links={[
          ["About", "/about"],
          ["Privacy", "/legal/privacy"],
          ["Terms", "/legal/terms"],
        ]} />
      </div>
      <div className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Sentinel. All rights reserved.</span>
          <span>Built with Next.js · Supabase</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div className="font-semibold mb-3">{title}</div>
      <ul className="space-y-2">
        {links.map(([label, href]) => (
          <li key={href}><Link href={href} className="text-muted-foreground hover:text-foreground">{label}</Link></li>
        ))}
      </ul>
    </div>
  );
}
