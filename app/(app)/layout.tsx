import { redirect } from "next/navigation";
import { getUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  const envAdmins = (process.env.ADMIN_USER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const isAdmin = !!profile?.is_admin || envAdmins.includes(user.id);

  return (
    <div className="flex min-h-screen">
      <Sidebar isAdmin={isAdmin} />
      <div className="flex-1 flex flex-col">
        <Topbar email={user.email} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
