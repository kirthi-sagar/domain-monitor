import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
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

async function ensureWorkspaceForUser(_userId: string, fullName: string | null, email: string): Promise<string | null> {
  // Delegates to a SECURITY DEFINER Postgres function that takes a row-level
  // lock on the profile, so concurrent requests for the same user can never
  // create duplicate workspaces.
  const supabase = await createClient();
  const stem = (fullName || email.split("@")[0])
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 32) || "ws";
  const slug = `${stem}-${Math.random().toString(36).slice(2, 6)}`;
  const name = `${fullName || "My"}'s workspace`;

  const { data, error } = await supabase.rpc("ensure_default_workspace", { p_name: name, p_slug: slug });
  if (error) { console.error("ensure_default_workspace failed:", error); return null; }
  return (data as unknown as string) ?? null;
}
