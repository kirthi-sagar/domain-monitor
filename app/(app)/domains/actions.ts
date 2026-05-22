"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { checkDomain } from "@/lib/monitor";

const DOMAIN_RE = /^([a-z0-9-]+\.)+[a-z]{2,}$/i;

const AddDomainSchema = z.object({
  name: z.string().min(3).regex(DOMAIN_RE, "Enter a valid domain like acme.com"),
  notes: z.string().max(2000).optional(),
});

export async function addDomainAction(formData: FormData): Promise<void> {
  const parsed = AddDomainSchema.safeParse({
    name: String(formData.get("name") ?? "").trim().toLowerCase(),
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  });
  if (!parsed.success) redirect(`/domains/new?error=${encodeURIComponent(parsed.error.issues[0].message)}`);

  const wsId = await getCurrentWorkspaceId();
  if (!wsId) redirect("/domains/new?error=no-workspace");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase.from("domains").insert({
    workspace_id: wsId,
    added_by: user!.id,
    name: parsed.data.name,
    notes: parsed.data.notes ?? null,
    monitor_flags: ["expiry", "whois", "nameservers", "registrar", "status", "dns"],
  }).select("id").single();
  if (error || !data) redirect(`/domains/new?error=${encodeURIComponent(error?.message ?? "insert failed")}`);

  checkDomain(data!.id).catch(() => {});
  revalidatePath("/domains");
  revalidatePath("/dashboard");
  redirect(`/domains/${data!.id}`);
}

export async function deleteDomainAction(id: string) {
  const supabase = await createClient();
  await supabase.from("domains").delete().eq("id", id);
  revalidatePath("/domains");
  redirect("/domains");
}

export async function checkNowAction(id: string) {
  await checkDomain(id, { force: true });
  revalidatePath(`/domains/${id}`);
  revalidatePath("/domains");
}
