"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Globe2, Bell, Settings, KeyRound, Upload, Users, Radio, Shield } from "lucide-react";

const items = [
  { href: "/dashboard",     icon: LayoutDashboard, label: "Dashboard" },
  { href: "/domains",       icon: Globe2,          label: "Domains" },
  { href: "/import",        icon: Upload,          label: "Import" },
  { href: "/channels",      icon: Radio,           label: "Channels" },
  { href: "/notifications", icon: Bell,            label: "Notifications" },
  { href: "/team",          icon: Users,           label: "Team" },
  { href: "/api-keys",      icon: KeyRound,        label: "API keys" },
  { href: "/settings",      icon: Settings,        label: "Settings" },
  { href: "/admin",         icon: Shield,          label: "Admin" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex w-60 shrink-0 border-r border-border bg-card flex-col">
      <div className="h-14 flex items-center px-5 border-b border-border">
        <Link href="/dashboard"><Logo /></Link>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {items.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                active ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" /> {label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-border text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Users className="h-3.5 w-3.5" /> Free plan · <Link href="/pricing" className="text-primary hover:underline">Upgrade</Link>
        </div>
      </div>
    </aside>
  );
}
