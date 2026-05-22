"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/session";

const CreateSchema = z.object({
  name: z.string().min(1).max(80),
});

export async function createWorkspaceAction(formData: FormData): Promise<void> {
  const parsed = CreateSchema.safeParse({ name: String(formData.get("name") ?? "").trim() });
  if (!parsed.success) redirect(`/settings/workspaces/new?error=${encodeURIComponent(parsed.error.issues[0].message)}`);

  const stem = parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 32) || "ws";
  const slug = `${stem}-${Math.random().toString(36).slice(2, 6)}`;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_workspace", { p_name: parsed.data.name, p_slug: slug });
  if (error) redirect(`/settings/workspaces/new?error=${encodeURIComponent(error.message)}`);

  // Switch to the new workspace as default
  const user = await getUser();
  if (user) await supabase.from("profiles").update({ default_workspace_id: data }).eq("id", user.id);
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function switchWorkspaceAction(workspaceId: string): Promise<void> {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return;
  await supabase.from("profiles").update({ default_workspace_id: workspaceId }).eq("id", user.id);
  revalidatePath("/", "layout");
  redirect("/dashboard");
}
