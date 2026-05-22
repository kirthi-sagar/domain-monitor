import { createClient } from "@/lib/supabase/server";

export async function requireAdmin(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (profile?.is_admin) return user.id;

  // Allow comma-separated ADMIN_USER_IDS env as a fallback (bootstrap before any is_admin flag is set).
  const ids = (process.env.ADMIN_USER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (ids.includes(user.id)) return user.id;

  return null;
}
