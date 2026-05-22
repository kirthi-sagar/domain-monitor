// Snapshot diffing — produces structured change descriptions for event creation.
import type { WhoisResult } from "./whois";

export interface ChangeRecord {
  kind: "expiry" | "whois" | "nameservers" | "registrar" | "status";
  severity: "info" | "warning" | "critical";
  title: string;
  before: unknown;
  after: unknown;
  dedupeKey: string;
}

export function diffSnapshots(prev: Partial<WhoisResult> | null, next: WhoisResult): ChangeRecord[] {
  const out: ChangeRecord[] = [];
  if (!prev) return out;

  if (prev.expirationDate !== next.expirationDate && next.expirationDate) {
    out.push({
      kind: "expiry",
      severity: "warning",
      title: "Expiration date changed",
      before: prev.expirationDate,
      after: next.expirationDate,
      dedupeKey: `exp:${next.expirationDate}`,
    });
  }

  if (prev.registrar !== next.registrar && next.registrar) {
    out.push({
      kind: "registrar",
      severity: "critical",
      title: "Registrar changed",
      before: prev.registrar,
      after: next.registrar,
      dedupeKey: `reg:${next.registrar}`,
    });
  }

  const prevNs = (prev.nameservers ?? []).slice().sort().join(",");
  const nextNs = next.nameservers.slice().sort().join(",");
  if (prevNs !== nextNs && next.nameservers.length > 0) {
    out.push({
      kind: "nameservers",
      severity: "critical",
      title: "Nameservers changed",
      before: prev.nameservers ?? [],
      after: next.nameservers,
      dedupeKey: `ns:${nextNs}`,
    });
  }

  const prevSt = (prev.status ?? []).slice().sort().join(",");
  const nextSt = next.status.slice().sort().join(",");
  if (prevSt !== nextSt && next.status.length > 0) {
    out.push({
      kind: "status",
      severity: "info",
      title: "Status flags changed",
      before: prev.status ?? [],
      after: next.status,
      dedupeKey: `st:${nextSt}`,
    });
  }
  return out;
}

export function expiryThresholdEvents(prevDays: number | null, nextDays: number | null, thresholds: number[]): number[] {
  // Returns thresholds crossed since last check (e.g., crossed 30 today).
  if (nextDays === null) return [];
  const hits: number[] = [];
  for (const t of thresholds) {
    if (nextDays <= t && (prevDays === null || prevDays > t)) hits.push(t);
  }
  return hits;
}
