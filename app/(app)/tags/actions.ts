"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/workspace";

const CreateSchema = z.object({
  name: z.string().min(1).max(40).regex(/^[a-z0-9][a-z0-9 _-]*$/i, "Use letters, numbers, dashes, underscores"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Need a #RRGGBB color"),
});

export async function createTagAction(formData: FormData): Promise<void> {
  const wsId = await getCurrentWorkspaceId();
  if (!wsId) redirect("/tags?error=no-workspace");
  const parsed = CreateSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    color: String(formData.get("color") ?? "#4338ca"),
  });
  if (!parsed.success) redirect(`/tags?error=${encodeURIComponent(parsed.error.issues[0].message)}`);

  const supabase = await createClient();
  const { error } = await supabase.from("tags").insert({ workspace_id: wsId, name: parsed.data.name, color: parsed.data.color });
  if (error) redirect(`/tags?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/tags");
  redirect("/tags");
}

export async function deleteTagAction(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("tags").delete().eq("id", id);
  revalidatePath("/tags");
  revalidatePath("/domains");
}

export async function setDomainTagsAction(domainId: string, tagIds: string[]): Promise<{ ok: boolean; message: string }> {
  const supabase = await createClient();
  // Replace the membership set: delete then insert.
  const { error: delErr } = await supabase.from("domain_tags").delete().eq("domain_id", domainId);
  if (delErr) return { ok: false, message: delErr.message };
  if (tagIds.length > 0) {
    const rows = tagIds.map((tag_id) => ({ domain_id: domainId, tag_id }));
    const { error: insErr } = await supabase.from("domain_tags").insert(rows);
    if (insErr) return { ok: false, message: insErr.message };
  }
  revalidatePath(`/domains/${domainId}`);
  revalidatePath("/domains");
  return { ok: true, message: "Tags updated" };
}
