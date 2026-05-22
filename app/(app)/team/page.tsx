import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { inviteMemberAction, removeMemberAction, revokeInviteAction } from "./actions";
import { RoleSelect } from "@/components/app/role-select";

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const { sent, error } = await searchParams;
  const supabase = await createClient();
  const wsId = await getCurrentWorkspaceId();
  const { data: { user } } = await supabase.auth.getUser();

  // Join member rows against profiles for emails.
  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase.from("workspace_members").select("user_id, role, joined_at, profiles!inner(email, full_name)").eq("workspace_id", wsId ?? ""),
    supabase.from("workspace_invites").select("*").eq("workspace_id", wsId ?? "").is("accepted_at", null).order("created_at", { ascending: false }),
  ]);

  const myRole = (members ?? []).find((m: any) => m.user_id === user?.id)?.role;
  const canManage = myRole === "owner" || myRole === "admin";

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
        <p className="text-sm text-muted-foreground">Members and pending invites for this workspace.</p>
      </div>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Invite a teammate</CardTitle>
            <CardDescription>They&apos;ll get an email with a link valid for 7 days.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={inviteMemberAction} className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="email" className="sr-only">Email</Label>
                <Input id="email" name="email" type="email" placeholder="teammate@company.com" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="role" className="sr-only">Role</Label>
                <select id="role" name="role" defaultValue="member"
                  className="h-10 rounded-md border border-input bg-card px-3 text-sm">
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <Button type="submit">Send invite</Button>
            </form>
            {sent && <p className="mt-3 text-sm text-emerald-700">Invite sent.</p>}
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Members</CardTitle></CardHeader>
        <CardContent className="p-0 px-6 pb-6">
          <Table>
            <THead><TR><TH>Member</TH><TH>Role</TH><TH>Joined</TH><TH></TH></TR></THead>
            <TBody>
              {(members ?? []).map((m: any) => {
                const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
                const isSelf = m.user_id === user?.id;
                return (
                  <TR key={m.user_id}>
                    <TD>
                      <div className="font-medium">{p?.full_name ?? p?.email ?? m.user_id.slice(0, 8)}</div>
                      <div className="text-xs text-muted-foreground">{p?.email}</div>
                    </TD>
                    <TD>
                      {canManage && !isSelf && m.role !== "owner"
                        ? <RoleSelect userId={m.user_id} defaultRole={m.role} />
                        : <Badge variant="default">{m.role}</Badge>}
                    </TD>
                    <TD className="text-xs text-muted-foreground">{formatDate(m.joined_at)}</TD>
                    <TD className="text-right">
                      {canManage && !isSelf && m.role !== "owner" && (
                        <form action={removeMemberAction.bind(null, m.user_id)} className="inline">
                          <Button type="submit" size="sm" variant="ghost" className="text-destructive">Remove</Button>
                        </form>
                      )}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      {(invites?.length ?? 0) > 0 && (
        <Card>
          <CardHeader><CardTitle>Pending invites</CardTitle></CardHeader>
          <CardContent className="p-0 px-6 pb-6">
            <Table>
              <THead><TR><TH>Email</TH><TH>Role</TH><TH>Expires</TH><TH></TH></TR></THead>
              <TBody>
                {(invites ?? []).map((i: any) => (
                  <TR key={i.id}>
                    <TD>{i.email}</TD>
                    <TD><Badge variant="neutral">{i.role}</Badge></TD>
                    <TD className="text-xs text-muted-foreground">{formatDate(i.expires_at)}</TD>
                    <TD className="text-right">
                      {canManage && (
                        <form action={revokeInviteAction.bind(null, i.id)} className="inline">
                          <Button type="submit" size="sm" variant="ghost" className="text-destructive">Revoke</Button>
                        </form>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
