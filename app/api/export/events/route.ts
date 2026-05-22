import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { toCsv } from "@/lib/csv";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const wsId = await getCurrentWorkspaceId();
  if (!wsId) return NextResponse.json({ error: "No workspace" }, { status: 401 });

  const url = new URL(req.url);
  const domainId = url.searchParams.get("domain_id");
  const since = url.searchParams.get("since");

  let q = supabase.from("domain_events")
    .select("occurred_at, kind, severity, title, message, domain_id")
    .eq("workspace_id", wsId)
    .order("occurred_at", { ascending: false })
    .limit(10_000);
  if (domainId) q = q.eq("domain_id", domainId);
  if (since) q = q.gte("occurred_at", since);

  const { data } = await q;

  // Enrich with domain name
  const ids = Array.from(new Set((data ?? []).map((r: any) => r.domain_id)));
  const { data: domains } = ids.length > 0
    ? await supabase.from("domains").select("id, name").in("id", ids)
    : { data: [] };
  const nameById = new Map((domains ?? []).map((d: any) => [d.id, d.name]));

  const rows = (data ?? []).map((r: any) => ({
    occurred_at: r.occurred_at,
    domain: nameById.get(r.domain_id) ?? r.domain_id,
    kind: r.kind,
    severity: r.severity,
    title: r.title,
    message: r.message,
  }));

  const csv = toCsv(rows, ["occurred_at", "domain", "kind", "severity", "title", "message"]);

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="events-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
