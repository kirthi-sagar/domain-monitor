import { cache } from "react";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/session";

export const getCurrentWorkspaceId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("default_workspace_id, full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.default_workspace_id) return profile.default_workspace_id as string;

  // Fall back to any existing membership
  const { data: m } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (m?.workspace_id) {
    await supabase.from("profiles").update({ default_workspace_id: m.workspace_id }).eq("id", user.id);
    return m.workspace_id as string;
  }

  // No workspace yet — auto-provision one for this user (first login after email confirm).
  return ensureWorkspaceForUser(user.id, profile?.full_name ?? null, profile?.email ?? user.email ?? "user");
});

async function ensureWorkspaceForUser(userId: string, fullName: string | null, email: string): Promise<string | null> {
  // Uses the service-role client because the workspace_members RLS policy requires
  // already being a member to insert — chicken-and-egg for first provisioning.
  const svc = await createServiceClient();
  const stem = (fullName || email.split("@")[0])
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 32) || "ws";
  const slug = `${stem}-${Math.random().toString(36).slice(2, 6)}`;

  const { data: ws, error } = await svc
    .from("workspaces")
    .insert({ name: `${fullName || "My"}'s workspace`, slug, owner_id: userId })
    .select("id")
    .single();
  if (error || !ws) {
    console.error("ensureWorkspaceForUser: workspace insert failed", error);
    return null;
  }

  const { error: mErr } = await svc.from("workspace_members").insert({
    workspace_id: ws.id, user_id: userId, role: "owner",
  });
  if (mErr) console.error("ensureWorkspaceForUser: member insert failed", mErr);

  await svc.from("profiles").update({ default_workspace_id: ws.id }).eq("id", userId);
  return ws.id as string;
}
