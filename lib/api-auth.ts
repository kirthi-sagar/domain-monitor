import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export interface ApiContext {
  workspaceId: string;
  keyId: string;
  scopes: string[];
}

export function hashKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function authenticate(req: NextRequest): Promise<{ ctx: ApiContext } | { error: NextResponse }> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { error: NextResponse.json({ error: "Missing API key" }, { status: 401 }) };

  const supa = await createServiceClient();
  const keyHash = hashKey(token);
  const { data: key } = await supa.from("api_keys").select("*").eq("key_hash", keyHash).is("revoked_at", null).maybeSingle();
  if (!key) return { error: NextResponse.json({ error: "Invalid API key" }, { status: 401 }) };

  await supa.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", key.id);

  return { ctx: { workspaceId: key.workspace_id, keyId: key.id, scopes: key.scopes ?? [] } };
}

export function requireScope(ctx: ApiContext, scope: string): NextResponse | null {
  if (!ctx.scopes.includes(scope)) return NextResponse.json({ error: `Missing scope: ${scope}` }, { status: 403 });
  return null;
}
