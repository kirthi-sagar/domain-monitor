"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function signupAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();

  const supabase = await createClient();
  const { error, data } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) { redirect(`/signup?error=${encodeURIComponent(error.message)}`); }

  // Auto-create a starter workspace if confirmed
  if (data.user && data.session) {
    const slug = `${(fullName || email.split("@")[0])
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 32) || "ws"}-${Math.random().toString(36).slice(2, 6)}`;
    const { data: ws } = await supabase
      .from("workspaces")
      .insert({ name: `${fullName || "My"}'s workspace`, slug, owner_id: data.user.id })
      .select()
      .single();
    if (ws) {
      await supabase.from("workspace_members").insert({
        workspace_id: ws.id, user_id: data.user.id, role: "owner",
      });
      await supabase.from("profiles").update({ default_workspace_id: ws.id }).eq("id", data.user.id);
    }
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function loginAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) { redirect(`/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`); }
  revalidatePath("/", "layout");
  redirect(next);
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function resetRequestAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/callback?next=/settings`,
  });
  redirect("/reset?sent=1");
}
