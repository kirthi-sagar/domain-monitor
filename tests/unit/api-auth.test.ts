import { describe, it, expect } from "vitest";
import { hashKey } from "@/lib/api-auth";

describe("hashKey", () => {
  it("is stable for the same input", () => {
    expect(hashKey("sk_live_abc")).toBe(hashKey("sk_live_abc"));
  });

  it("differs across inputs", () => {
    expect(hashKey("sk_live_abc")).not.toBe(hashKey("sk_live_def"));
  });

  it("produces hex of expected length", () => {
    expect(hashKey("x")).toMatch(/^[a-f0-9]{64}$/);
  });
});
