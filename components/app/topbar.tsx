import Link from "next/link";
import { logoutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Plus, LogOut } from "lucide-react";
import { WorkspaceSwitcher, type WorkspaceOption } from "./workspace-switcher";

export function Topbar({
  email, current, workspaces,
}: { email?: string | null; current?: WorkspaceOption | null; workspaces?: WorkspaceOption[] }) {
  return (
    <header className="h-14 border-b border-border bg-background/80 backdrop-blur sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 pl-16 md:pl-6">
      <div className="flex items-center gap-3 min-w-0">
        {workspaces && workspaces.length > 0 && (
          <WorkspaceSwitcher current={current ?? null} options={workspaces} />
        )}
        <div className="hidden sm:block text-sm text-muted-foreground truncate">{email ?? ""}</div>
      </div>
      <div className="flex items-center gap-2">
        <Button asChild size="sm"><Link href="/domains/new"><Plus className="h-4 w-4" /> Add domain</Link></Button>
        <form action={logoutAction}>
          <Button type="submit" size="sm" variant="ghost"><LogOut className="h-4 w-4" /></Button>
        </form>
      </div>
    </header>
  );
}
