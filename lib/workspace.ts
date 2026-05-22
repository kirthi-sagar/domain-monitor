import { createClient } from "@/lib/supabase/server";

export async function getCurrentWorkspaceId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("default_workspace_id")
    .eq("id", user.id)
    .single();

  if (profile?.default_workspace_id) return profile.default_workspace_id as string;

  // Fall back to first membership
  const { data: m } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();
  return m?.workspace_id ?? null;
}
