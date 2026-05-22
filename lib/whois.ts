// Minimal WHOIS + RDAP lookup. RDAP first (JSON), fall back to TCP WHOIS for legacy TLDs.
import net from "node:net";

export interface WhoisResult {
  raw: string | null;
  registrar: string | null;
  registrarUrl: string | null;
  registrationDate: string | null;
  expirationDate: string | null;
  lastUpdatedDate: string | null;
  nameservers: string[];
  status: string[];
  source: "rdap" | "whois" | "none";
}

const RDAP_BOOTSTRAP = "https://rdap.org/domain/";

export async function lookupDomain(name: string): Promise<WhoisResult> {
  const clean = name.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  try {
    const r = await fetch(RDAP_BOOTSTRAP + clean, {
      redirect: "follow",
      headers: { Accept: "application/rdap+json" },
      // RDAP servers can be slow; cap at 15s.
      signal: AbortSignal.timeout(15000),
    });
    if (r.ok) return parseRdap(await r.json(), clean);
  } catch {
    // Fall through to whois
  }

  try {
    const raw = await whoisTcp(clean);
    return { ...parseWhoisRaw(raw), raw, source: "whois" };
  } catch {
    return emptyResult();
  }
}

function emptyResult(): WhoisResult {
  return { raw: null, registrar: null, registrarUrl: null, registrationDate: null, expirationDate: null, lastUpdatedDate: null, nameservers: [], status: [], source: "none" };
}

function parseRdap(j: any, _name: string): WhoisResult {
  const events: { eventAction: string; eventDate: string }[] = j.events ?? [];
  const eventDate = (k: string) => events.find((e) => e.eventAction === k)?.eventDate?.slice(0, 10) ?? null;

  const registrar =
    j.entities?.find((e: any) => e.roles?.includes("registrar"))?.vcardArray?.[1]
      ?.find((v: any[]) => v[0] === "fn")?.[3] ?? null;

  const nameservers: string[] = (j.nameservers ?? []).map((n: any) => String(n.ldhName ?? n.unicodeName ?? "").toLowerCase()).filter(Boolean);
  const status: string[] = (j.status ?? []).map(String);

  return {
    raw: null,
    registrar,
    registrarUrl: null,
    registrationDate: eventDate("registration"),
    expirationDate: eventDate("expiration"),
    lastUpdatedDate: eventDate("last changed") ?? eventDate("last update of RDAP database"),
    nameservers,
    status,
    source: "rdap",
  };
}

function parseWhoisRaw(raw: string): Omit<WhoisResult, "raw" | "source"> {
  const grab = (re: RegExp): string | null => {
    const m = raw.match(re);
    return m ? m[1].trim() : null;
  };
  const grabAll = (re: RegExp): string[] => {
    const out: string[] = [];
    let m: RegExpExecArray | null;
    const g = new RegExp(re.source, "gim");
    while ((m = g.exec(raw))) out.push(m[1].trim().toLowerCase());
    return Array.from(new Set(out));
  };
  const date = (s: string | null) => (s ? new Date(s).toISOString().slice(0, 10) : null);
  return {
    registrar: grab(/Registrar:\s*(.+)/i),
    registrarUrl: grab(/Registrar URL:\s*(\S+)/i),
    registrationDate: date(grab(/Creation Date:\s*(.+)/i)),
    expirationDate: date(grab(/(?:Registry Expiry Date|Registrar Registration Expiration Date|Expiration Date):\s*(.+)/i)),
    lastUpdatedDate: date(grab(/Updated Date:\s*(.+)/i)),
    nameservers: grabAll(/Name Server:\s*(\S+)/i),
    status: grabAll(/Domain Status:\s*(\S+)/i),
  };
}

function whoisTcp(name: string, server = "whois.iana.org"): Promise<string> {
  return new Promise((resolve, reject) => {
    const sock = net.createConnection(43, server);
    const chunks: Buffer[] = [];
    sock.setTimeout(15000);
    sock.on("connect", () => sock.write(name + "\r\n"));
    sock.on("data", (c) => chunks.push(c));
    sock.on("end", async () => {
      const text = Buffer.concat(chunks).toString("utf8");
      // Recurse one level to the authoritative whois server if present.
      const m = text.match(/whois:\s*(\S+)/i);
      if (m && server === "whois.iana.org") {
        try { return resolve(await whoisTcp(name, m[1])); } catch (e) { return reject(e); }
      }
      resolve(text);
    });
    sock.on("timeout", () => { sock.destroy(); reject(new Error("whois timeout")); });
    sock.on("error", reject);
  });
}
