// DNS resolution + diffing. Uses node:dns/promises with a short timeout.
import { promises as dns } from "node:dns";

export interface DnsSnapshot {
  A: string[];
  AAAA: string[];
  MX: string[];
  TXT: string[];
  CNAME: string[];
  NS: string[];
}

const EMPTY: DnsSnapshot = { A: [], AAAA: [], MX: [], TXT: [], CNAME: [], NS: [] };

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try { return await p; } catch { return fallback; }
}

export async function resolveDns(name: string): Promise<DnsSnapshot> {
  const resolver = new dns.Resolver();
  resolver.setServers(["1.1.1.1", "8.8.8.8"]);

  const timeout = (ms: number) => new Promise<never>((_, rej) => setTimeout(() => rej(new Error("dns timeout")), ms));
  const race = <T>(p: Promise<T>): Promise<T> => Promise.race([p, timeout(8000)]);

  const [A, AAAA, MX, TXT, CNAME, NS] = await Promise.all([
    safe(race(resolver.resolve4(name)), [] as string[]),
    safe(race(resolver.resolve6(name)), [] as string[]),
    safe(race(resolver.resolveMx(name)).then((rs) => rs.map((r) => `${r.priority} ${r.exchange}`.toLowerCase())), [] as string[]),
    safe(race(resolver.resolveTxt(name)).then((rs) => rs.map((parts) => parts.join(""))), [] as string[]),
    safe(race(resolver.resolveCname(name)), [] as string[]),
    safe(race(resolver.resolveNs(name)).then((rs) => rs.map((s) => s.toLowerCase())), [] as string[]),
  ]);

  void EMPTY;
  return {
    A: A.sort(),
    AAAA: AAAA.sort(),
    MX: MX.sort(),
    TXT: TXT.sort(),
    CNAME: CNAME.sort(),
    NS: NS.sort(),
  };
}

export function diffDns(prev: DnsSnapshot | null, next: DnsSnapshot): { kind: "dns"; severity: "info" | "warning" | "critical"; title: string; before: unknown; after: unknown; dedupeKey: string }[] {
  if (!prev) return [];
  const out = [];
  for (const k of Object.keys(next) as (keyof DnsSnapshot)[]) {
    const a = (prev[k] ?? []).join(",");
    const b = (next[k] ?? []).join(",");
    if (a !== b) {
      out.push({
        kind: "dns" as const,
        severity: k === "MX" || k === "NS" ? "warning" as const : "info" as const,
        title: `DNS ${k} records changed`,
        before: prev[k] ?? [],
        after: next[k],
        dedupeKey: `dns:${k}:${b}`,
      });
    }
  }
  return out;
}
