import { describe, expect, it } from "vitest";
import { normalizeARPhone, formatARPhone } from "./phone";

describe("normalizeARPhone", () => {
  it("normalizes a local mobile number", () => {
    expect(normalizeARPhone("11 2345 6789")).toBe("+5491123456789");
  });
  it("handles full international format", () => {
    expect(normalizeARPhone("+54 9 11 2345 6789")).toBe("+5491123456789");
  });
  it("handles 549-prefixed digits", () => {
    expect(normalizeARPhone("5491123456789")).toBe("+5491123456789");
  });
  it("handles leading 9", () => {
    expect(normalizeARPhone("9 11 2345 6789")).toBe("+5491123456789");
  });
  it("handles interior area codes", () => {
    expect(normalizeARPhone("351 654 3210")).toBe("+5493516543210");
  });
  it("rejects invalid lengths", () => {
    expect(normalizeARPhone("123")).toBeNull();
    expect(normalizeARPhone("12345678901234")).toBeNull();
  });
});

describe("formatARPhone", () => {
  it("formats e164 for display", () => {
    expect(formatARPhone("+5491123456789")).toBe("+54 9 11 2345 6789");
  });
});
