import { redirect } from "next/navigation";
import { getUser } from "@/lib/session";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar email={user.email} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
