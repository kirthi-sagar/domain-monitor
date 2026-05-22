import { describe, it, expect } from "vitest";
import { daysUntil, expirySeverity } from "@/lib/utils";

describe("daysUntil", () => {
  it("returns null for null input", () => {
    expect(daysUntil(null)).toBeNull();
  });

  it("returns positive for future dates", () => {
    const future = new Date(Date.now() + 7 * 86400_000);
    expect(daysUntil(future)).toBeGreaterThan(0);
    expect(daysUntil(future)).toBeLessThanOrEqual(7);
  });

  it("returns negative for past dates", () => {
    const past = new Date(Date.now() - 7 * 86400_000);
    expect(daysUntil(past)).toBeLessThan(0);
  });
});

describe("expirySeverity", () => {
  it("classifies ranges correctly", () => {
    expect(expirySeverity(null)).toBe("unknown");
    expect(expirySeverity(-1)).toBe("expired");
    expect(expirySeverity(0)).toBe("crit");
    expect(expirySeverity(7)).toBe("crit");
    expect(expirySeverity(8)).toBe("warn");
    expect(expirySeverity(30)).toBe("warn");
    expect(expirySeverity(31)).toBe("ok");
    expect(expirySeverity(365)).toBe("ok");
  });
});
