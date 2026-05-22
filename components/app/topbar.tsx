import Link from "next/link";
import { logoutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Plus, LogOut } from "lucide-react";

export function Topbar({ email }: { email?: string | null }) {
  return (
    <header className="h-14 border-b border-border bg-background/80 backdrop-blur sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 pl-16 md:pl-6">
      <div className="text-sm text-muted-foreground truncate">{email ?? ""}</div>
      <div className="flex items-center gap-2">
        <Button asChild size="sm"><Link href="/domains/new"><Plus className="h-4 w-4" /> Add domain</Link></Button>
        <form action={logoutAction}>
          <Button type="submit" size="sm" variant="ghost"><LogOut className="h-4 w-4" /></Button>
        </form>
      </div>
    </header>
  );
}
