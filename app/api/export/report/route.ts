import { NextResponse } from "next/server";
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { createElement as h } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { daysUntil } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const wsId = await getCurrentWorkspaceId();
  if (!wsId) return NextResponse.json({ error: "No workspace" }, { status: 401 });

  const [{ data: ws }, { data: domains }, { data: events }] = await Promise.all([
    supabase.from("workspaces").select("name").eq("id", wsId).maybeSingle(),
    supabase.from("domains").select("name, registrar, expiration_date, status, last_checked_at, nameservers").eq("workspace_id", wsId).is("archived_at", null).order("expiration_date", { ascending: true }),
    supabase.from("domain_events").select("occurred_at, kind, severity, title, domain_id").eq("workspace_id", wsId).order("occurred_at", { ascending: false }).limit(50),
  ]);

  const expiringSoon = (domains ?? []).filter((d: any) => {
    const days = daysUntil(d.expiration_date);
    return days !== null && days >= 0 && days <= 30;
  });

  const buf = await renderToBuffer(
    h(ReportDoc as any, { workspace: ws?.name ?? "Workspace", domains: domains ?? [], events: events ?? [], expiringSoon }) as any
  );

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="sentinel-report-${new Date().toISOString().slice(0, 10)}.pdf"`,
    },
  });
}

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica" },
  h1:   { fontSize: 20, fontWeight: 700, marginBottom: 4 },
  h2:   { fontSize: 14, fontWeight: 700, marginTop: 20, marginBottom: 8 },
  meta: { color: "#6b7280", fontSize: 9, marginBottom: 14 },
  row:  { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e5e7eb", paddingVertical: 4 },
  rowH: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#0a0a0f", paddingVertical: 4 },
  c:    { paddingHorizontal: 4 },
  tag:  { color: "#4338ca", fontWeight: 700 },
  warn: { color: "#d97706" },
  crit: { color: "#dc2626" },
});

function ReportDoc({ workspace, domains, events, expiringSoon }: {
  workspace: string; domains: any[]; events: any[]; expiringSoon: any[];
}) {
  return h(Document, null,
    h(Page, { size: "A4", style: styles.page },
      h(Text, { style: styles.h1 }, "Sentinel domain report"),
      h(Text, { style: styles.meta }, `${workspace} · generated ${new Date().toLocaleString()}`),

      h(Text, { style: styles.h2 }, `Summary`),
      h(Text, null, `Tracked: ${domains.length}`),
      h(Text, null, `Expiring within 30 days: ${expiringSoon.length}`),
      h(Text, null, `Recent events (last 50): ${events.length}`),

      h(Text, { style: styles.h2 }, "Expiring soon"),
      expiringSoon.length === 0
        ? h(Text, { style: styles.meta }, "Nothing expiring in the next 30 days.")
        : h(View, null,
            h(View, { style: styles.rowH },
              h(Text, { style: [styles.c, { width: "35%" }] }, "Domain"),
              h(Text, { style: [styles.c, { width: "25%" }] }, "Registrar"),
              h(Text, { style: [styles.c, { width: "20%" }] }, "Expires"),
              h(Text, { style: [styles.c, { width: "20%" }] }, "Days"),
            ),
            ...expiringSoon.map((d: any) => {
              const days = daysUntil(d.expiration_date);
              const dayStyle = days != null && days <= 7 ? styles.crit : styles.warn;
              return h(View, { key: d.name, style: styles.row },
                h(Text, { style: [styles.c, { width: "35%" }] }, d.name),
                h(Text, { style: [styles.c, { width: "25%" }] }, d.registrar ?? "—"),
                h(Text, { style: [styles.c, { width: "20%" }] }, d.expiration_date ?? "—"),
                h(Text, { style: [styles.c, { width: "20%" }, dayStyle] }, days != null ? `${days}d` : "—"),
              );
            }),
          ),

      h(Text, { style: styles.h2 }, "All domains"),
      h(View, { style: styles.rowH },
        h(Text, { style: [styles.c, { width: "40%" }] }, "Domain"),
        h(Text, { style: [styles.c, { width: "25%" }] }, "Registrar"),
        h(Text, { style: [styles.c, { width: "20%" }] }, "Expires"),
        h(Text, { style: [styles.c, { width: "15%" }] }, "Status"),
      ),
      ...domains.map((d: any) =>
        h(View, { key: d.name, style: styles.row },
          h(Text, { style: [styles.c, { width: "40%" }] }, d.name),
          h(Text, { style: [styles.c, { width: "25%" }] }, d.registrar ?? "—"),
          h(Text, { style: [styles.c, { width: "20%" }] }, d.expiration_date ?? "—"),
          h(Text, { style: [styles.c, { width: "15%" }] }, d.status ?? "—"),
        ),
      ),
    ),
  );
}
