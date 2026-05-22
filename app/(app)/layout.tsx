import { redirect } from "next/navigation";
import { getUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("is_admin, default_workspace_id").eq("id", user.id).maybeSingle(),
    supabase.from("workspace_members").select("workspace_id, workspaces!inner(id, name, slug)").eq("user_id", user.id),
  ]);
  const envAdmins = (process.env.ADMIN_USER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const isAdmin = !!profile?.is_admin || envAdmins.includes(user.id);

  const workspaces = (memberships ?? []).map((m: any) => {
    const w = Array.isArray(m.workspaces) ? m.workspaces[0] : m.workspaces;
    return { id: w.id, name: w.name, slug: w.slug };
  });
  const current = workspaces.find((w) => w.id === profile?.default_workspace_id) ?? workspaces[0] ?? null;

  return (
    <div className="flex min-h-screen">
      <Sidebar isAdmin={isAdmin} />
      <div className="flex-1 flex flex-col">
        <Topbar email={user.email} current={current} workspaces={workspaces} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
