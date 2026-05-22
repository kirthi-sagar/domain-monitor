// HTTP/HTTPS availability + TLS expiry check.
import tls from "node:tls";

export interface AvailabilitySnapshot {
  reachable: boolean;
  statusCode: number | null;
  finalUrl: string | null;
  tlsValidTo: string | null;     // YYYY-MM-DD
  tlsIssuer: string | null;
  latencyMs: number | null;
  error: string | null;
}

const EMPTY: AvailabilitySnapshot = {
  reachable: false, statusCode: null, finalUrl: null,
  tlsValidTo: null, tlsIssuer: null, latencyMs: null, error: null,
};

export async function checkAvailability(name: string): Promise<AvailabilitySnapshot> {
  const url = `https://${name}/`;
  const out: AvailabilitySnapshot = { ...EMPTY };
  const start = Date.now();

  try {
    const r = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    out.reachable = true;
    out.statusCode = r.status;
    out.finalUrl = r.url;
    out.latencyMs = Date.now() - start;
  } catch (e) {
    out.error = (e as Error).message;
  }

  // TLS expiry — separate connection so we always probe the cert even when HTTP fails.
  try {
    const cert = await fetchCert(name);
    if (cert?.valid_to) out.tlsValidTo = new Date(cert.valid_to).toISOString().slice(0, 10);
    if (cert?.issuer?.O) out.tlsIssuer = String(cert.issuer.O);
  } catch {
    // Leave tls fields null
  }

  return out;
}

function fetchCert(host: string): Promise<tls.PeerCertificate | null> {
  return new Promise((resolve, reject) => {
    const sock = tls.connect({ host, port: 443, servername: host, rejectUnauthorized: false, timeout: 6000 }, () => {
      try {
        const cert = sock.getPeerCertificate(false);
        sock.end();
        resolve(cert && Object.keys(cert).length > 0 ? cert : null);
      } catch (e) { reject(e); }
    });
    sock.on("timeout", () => { sock.destroy(); reject(new Error("tls timeout")); });
    sock.on("error", reject);
  });
}

export function diffAvailability(prev: AvailabilitySnapshot | null, next: AvailabilitySnapshot):
  { kind: "availability"; severity: "info" | "warning" | "critical"; title: string; before: unknown; after: unknown; dedupeKey: string }[] {
  const out = [];

  if (prev && prev.reachable !== next.reachable) {
    out.push({
      kind: "availability" as const,
      severity: next.reachable ? "info" as const : "critical" as const,
      title: next.reachable ? "Domain became reachable" : "Domain became unreachable",
      before: prev.reachable, after: next.reachable,
      dedupeKey: `avail:${next.reachable}`,
    });
  }

  if (prev && prev.statusCode !== next.statusCode && next.statusCode !== null) {
    const sev = next.statusCode >= 500 ? "critical" as const : next.statusCode >= 400 ? "warning" as const : "info" as const;
    out.push({
      kind: "availability" as const,
      severity: sev,
      title: `HTTP status changed: ${prev.statusCode ?? "—"} → ${next.statusCode}`,
      before: prev.statusCode, after: next.statusCode,
      dedupeKey: `status:${next.statusCode}`,
    });
  }

  if (prev?.tlsValidTo !== next.tlsValidTo && next.tlsValidTo) {
    out.push({
      kind: "availability" as const,
      severity: "warning" as const,
      title: "TLS certificate expiry changed",
      before: prev?.tlsValidTo ?? null, after: next.tlsValidTo,
      dedupeKey: `tls:${next.tlsValidTo}`,
    });
  }

  return out;
}
