import { NextResponse, type NextRequest } from "next/server";
import { authenticate } from "@/lib/api-auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req); if ("error" in auth) return auth.error;
  const { id } = await params;
  const supa = await createServiceClient();
  const { data, error } = await supa.from("domains")
    .select("*").eq("id", id).eq("workspace_id", auth.ctx.workspaceId).maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req); if ("error" in auth) return auth.error;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const supa = await createServiceClient();
  const { data, error } = await supa.from("domains").update({
    notes: body.notes,
    monitor_flags: body.monitor,
    alert_thresholds: body.alertThresholds,
    check_interval_minutes: body.checkIntervalMinutes,
  }).eq("id", id).eq("workspace_id", auth.ctx.workspaceId).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req); if ("error" in auth) return auth.error;
  const { id } = await params;
  const supa = await createServiceClient();
  await supa.from("domains").delete().eq("id", id).eq("workspace_id", auth.ctx.workspaceId);
  return NextResponse.json({ ok: true });
}
