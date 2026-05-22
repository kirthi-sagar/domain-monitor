"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/workspace";

const RoleSchema = z.enum(["admin", "member", "viewer"]);

export async function inviteMemberAction(formData: FormData): Promise<void> {
  const wsId = await getCurrentWorkspaceId();
  if (!wsId) redirect("/team?error=no-workspace");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = RoleSchema.safeParse(formData.get("role") ?? "member");
  if (!email || !email.includes("@") || !role.success) redirect("/team?error=invalid");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const token = randomBytes(24).toString("hex");

  const { error } = await supabase.from("workspace_invites").insert({
    workspace_id: wsId, email, role: role.data,
    token, invited_by: user!.id,
  });
  if (error) redirect(`/team?error=${encodeURIComponent(error.message)}`);

  // Best-effort invite email
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const url = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/invite/${token}`;
      await resend.emails.send({
        from: process.env.ALERT_FROM_EMAIL ?? "Sentinel <onboarding@resend.dev>",
        to: email,
        subject: "You've been invited to a Sentinel workspace",
        text: `Click to accept: ${url}\nExpires in 7 days.`,
      });
    } catch { /* ignore — link still works */ }
  }

  revalidatePath("/team");
  redirect("/team?sent=1");
}

export async function changeRoleAction(userId: string, role: string): Promise<void> {
  const wsId = await getCurrentWorkspaceId();
  if (!wsId) return;
  const parsed = z.enum(["owner", "admin", "member", "viewer"]).safeParse(role);
  if (!parsed.success) return;
  const supabase = await createClient();
  await supabase.from("workspace_members").update({ role: parsed.data }).eq("workspace_id", wsId).eq("user_id", userId);
  revalidatePath("/team");
}

export async function removeMemberAction(userId: string): Promise<void> {
  const wsId = await getCurrentWorkspaceId();
  if (!wsId) return;
  const supabase = await createClient();
  await supabase.from("workspace_members").delete().eq("workspace_id", wsId).eq("user_id", userId);
  revalidatePath("/team");
}

export async function revokeInviteAction(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("workspace_invites").delete().eq("id", id);
  revalidatePath("/team");
}
