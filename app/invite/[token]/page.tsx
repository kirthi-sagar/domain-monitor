import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

async function accept(token: string): Promise<void> {
  "use server";
  const supabase = await createClient();
  const { data: wsId, error } = await supabase.rpc("accept_workspace_invite", { invite_token: token });
  if (error) redirect(`/invite/${token}?error=${encodeURIComponent(error.message)}`);
  await supabase.from("profiles").update({ default_workspace_id: wsId as unknown as string }).eq("id", (await supabase.auth.getUser()).data.user!.id);
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export default async function AcceptInvitePage({ params, searchParams }: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Public token lookup — bypass RLS deliberately (the token IS the secret).
  const svc = await createServiceClient();
  const { data: inv } = await svc
    .from("workspace_invites")
    .select("workspace_id, email, role, expires_at, accepted_at, workspaces!inner(name)")
    .eq("token", token)
    .maybeSingle();

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-md">
        <Link href="/" className="flex justify-center mb-6"><Logo /></Link>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Workspace invite</CardTitle>
            <CardDescription>
              {!inv ? "This invite is invalid or has expired."
                : inv.accepted_at ? "This invite has already been used."
                : (() => { const w = Array.isArray(inv.workspaces) ? inv.workspaces[0] : inv.workspaces; return `You've been invited to ${w?.name ?? "a workspace"} as ${inv.role}.`; })()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {inv && !inv.accepted_at && (
              user ? (
                <form action={accept.bind(null, token)}>
                  <Button type="submit" className="w-full">Accept invite</Button>
                </form>
              ) : (
                <>
                  <Button asChild className="w-full"><Link href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}>Sign in to accept</Link></Button>
                  <Button asChild variant="outline" className="w-full"><Link href={`/signup?next=${encodeURIComponent(`/invite/${token}`)}`}>Create account</Link></Button>
                </>
              )
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
