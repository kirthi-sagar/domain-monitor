import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { authenticate } from "@/lib/api-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { checkDomain } from "@/lib/monitor";

const DOMAIN_RE = /^([a-z0-9-]+\.)+[a-z]{2,}$/i;

export async function GET(req: NextRequest) {
  const auth = await authenticate(req); if ("error" in auth) return auth.error;
  const supa = await createServiceClient();
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 500);
  const { data } = await supa.from("domains")
    .select("*").eq("workspace_id", auth.ctx.workspaceId).is("archived_at", null)
    .order("name").limit(limit);
  return NextResponse.json({ data });
}

const CreateSchema = z.object({
  name: z.string().regex(DOMAIN_RE),
  notes: z.string().max(2000).optional(),
  monitor: z.array(z.enum(["expiry","whois","nameservers","registrar","status","dns","availability"])).optional(),
  alertThresholds: z.array(z.number().int().min(0).max(365)).optional(),
});

export async function POST(req: NextRequest) {
  const auth = await authenticate(req); if ("error" in auth) return auth.error;
  let body: unknown; try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const supa = await createServiceClient();
  const { data, error } = await supa.from("domains").insert({
    workspace_id: auth.ctx.workspaceId,
    name: parsed.data.name.toLowerCase(),
    notes: parsed.data.notes,
    monitor_flags: parsed.data.monitor ?? undefined,
    alert_thresholds: parsed.data.alertThresholds ?? undefined,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 409 });

  checkDomain(data.id).catch(() => {});
  return NextResponse.json({ data }, { status: 201 });
}
