import { NextResponse, type NextRequest } from "next/server";
import { authenticate } from "@/lib/api-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { checkDomain } from "@/lib/monitor";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req); if ("error" in auth) return auth.error;
  const { id } = await params;
  const supa = await createServiceClient();
  const { data: d } = await supa.from("domains").select("id").eq("id", id).eq("workspace_id", auth.ctx.workspaceId).maybeSingle();
  if (!d) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const r = await checkDomain(id, { force: true });
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
