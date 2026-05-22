import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { toCsv } from "@/lib/csv";

export async function GET() {
  const supabase = await createClient();
  const wsId = await getCurrentWorkspaceId();
  if (!wsId) return NextResponse.json({ error: "No workspace" }, { status: 401 });

  const { data } = await supabase
    .from("domains")
    .select("name, registrar, registration_date, expiration_date, last_updated_date, nameservers, status, status_flags, last_checked_at, notes")
    .eq("workspace_id", wsId).is("archived_at", null).order("name");

  const csv = toCsv((data ?? []) as any[], [
    "name", "registrar", "registration_date", "expiration_date", "last_updated_date",
    "nameservers", "status", "status_flags", "last_checked_at", "notes",
  ]);

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="domains-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
