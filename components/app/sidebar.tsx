"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Globe2, Bell, Settings, KeyRound, Upload, Users, Radio, Shield, Filter, Menu, X, Tag, FileClock } from "lucide-react";

const items: { href: string; icon: any; label: string; adminOnly?: boolean }[] = [
  { href: "/dashboard",     icon: LayoutDashboard, label: "Dashboard" },
  { href: "/domains",       icon: Globe2,          label: "Domains" },
  { href: "/import",        icon: Upload,          label: "Import" },
  { href: "/tags",          icon: Tag,             label: "Tags" },
  { href: "/channels",      icon: Radio,           label: "Channels" },
  { href: "/alerts",        icon: Filter,          label: "Alert rules" },
  { href: "/notifications", icon: Bell,            label: "Notifications" },
  { href: "/team",          icon: Users,           label: "Team" },
  { href: "/api-keys",      icon: KeyRound,        label: "API keys" },
  { href: "/audit",         icon: FileClock,       label: "Audit log" },
  { href: "/settings",      icon: Settings,        label: "Settings" },
  { href: "/admin",         icon: Shield,          label: "Admin", adminOnly: true },
];

export function Sidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const visible = items.filter((it) => !it.adminOnly || isAdmin);

  return (
    <>
      {/* Mobile menu button — fixed in top-left */}
      <button
        type="button"
        aria-label="Toggle navigation"
        onClick={() => setOpen((v) => !v)}
        className="md:hidden fixed top-3 left-3 z-50 inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card shadow-sm"
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {/* Mobile backdrop */}
      {open && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
      )}

      <aside
        className={cn(
          "fixed md:static inset-y-0 left-0 z-40 w-60 shrink-0 border-r border-border bg-card flex-col transition-transform md:transition-none",
          "md:flex",
          open ? "flex translate-x-0" : "hidden md:flex -translate-x-full md:translate-x-0",
        )}
      >
        <div className="h-14 flex items-center px-5 border-b border-border">
          <Link href="/dashboard" onClick={() => setOpen(false)}><Logo /></Link>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {visible.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
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
    </>
  );
}
