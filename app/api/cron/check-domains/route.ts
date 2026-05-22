import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { checkDomain } from "@/lib/monitor";

// Invoked by an external scheduler (Vercel Cron, Supabase scheduled function, GitHub Actions, etc.)
// Protected by CRON_SECRET.
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supa = await createServiceClient();
  const { data: due } = await supa
    .from("domains")
    .select("id")
    .is("archived_at", null)
    .or(`next_check_at.is.null,next_check_at.lte.${new Date().toISOString()}`)
    .limit(50);

  const results: any[] = [];
  for (const d of due ?? []) {
    try {
      const r = await checkDomain(d.id);
      results.push({ id: d.id, ok: true, ...r });
    } catch (e) {
      results.push({ id: d.id, ok: false, error: (e as Error).message });
    }
  }
  return NextResponse.json({ checked: results.length, results });
}

export const GET = POST; // allow GET for simple webhooks
