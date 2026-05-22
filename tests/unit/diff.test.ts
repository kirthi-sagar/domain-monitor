import { describe, it, expect } from "vitest";
import { diffSnapshots, expiryThresholdEvents } from "@/lib/diff";
import type { WhoisResult } from "@/lib/whois";

const baseline: WhoisResult = {
  raw: null,
  registrar: "GoDaddy",
  registrarUrl: null,
  registrationDate: "2020-01-01",
  expirationDate: "2027-01-01",
  lastUpdatedDate: "2026-01-01",
  nameservers: ["ns1.aws.com", "ns2.aws.com"],
  status: ["clientTransferProhibited"],
  source: "rdap",
};

describe("diffSnapshots", () => {
  it("returns no changes against null prev", () => {
    expect(diffSnapshots(null, baseline)).toEqual([]);
  });

  it("emits no changes for identical snapshots", () => {
    expect(diffSnapshots(baseline, baseline)).toEqual([]);
  });

  it("flags expiration date changes as warning", () => {
    const next = { ...baseline, expirationDate: "2028-01-01" };
    const changes = diffSnapshots(baseline, next);
    expect(changes).toHaveLength(1);
    expect(changes[0].kind).toBe("expiry");
    expect(changes[0].severity).toBe("warning");
  });

  it("flags registrar changes as critical", () => {
    const next = { ...baseline, registrar: "Cloudflare" };
    const changes = diffSnapshots(baseline, next);
    expect(changes.find((c) => c.kind === "registrar")?.severity).toBe("critical");
  });

  it("flags nameserver changes as critical", () => {
    const next = { ...baseline, nameservers: ["ns1.evil.io"] };
    const changes = diffSnapshots(baseline, next);
    expect(changes.find((c) => c.kind === "nameservers")?.severity).toBe("critical");
  });

  it("ignores nameserver ordering", () => {
    const next = { ...baseline, nameservers: ["ns2.aws.com", "ns1.aws.com"] };
    expect(diffSnapshots(baseline, next)).toEqual([]);
  });

  it("uses stable dedupe keys for idempotency", () => {
    const next = { ...baseline, expirationDate: "2028-01-01" };
    const a = diffSnapshots(baseline, next)[0];
    const b = diffSnapshots(baseline, next)[0];
    expect(a.dedupeKey).toBe(b.dedupeKey);
  });
});

describe("expiryThresholdEvents", () => {
  it("returns crossings since last check", () => {
    expect(expiryThresholdEvents(45, 25, [90, 60, 30, 14, 7])).toEqual([30]);
  });

  it("returns multiple if jumping past several at once", () => {
    expect(expiryThresholdEvents(100, 6, [90, 30, 7])).toEqual([90, 30, 7]);
  });

  it("returns empty when not crossing anything", () => {
    expect(expiryThresholdEvents(100, 95, [90, 30, 7])).toEqual([]);
  });

  it("treats null prev as 'first observation'", () => {
    expect(expiryThresholdEvents(null, 5, [90, 30, 7])).toEqual([90, 30, 7]);
  });
});
