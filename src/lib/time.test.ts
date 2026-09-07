import { describe, expect, it } from "vitest";
import { arSlotToISO, toARDate, toARTime } from "./time";
import { formatARS, formatDuration } from "./format";

describe("arSlotToISO", () => {
  it("converts AR wall-clock to UTC ISO", () => {
    expect(arSlotToISO("2026-09-08", "10:00")).toBe("2026-09-08T13:00:00.000Z");
  });
  it("handles midnight", () => {
    expect(arSlotToISO("2026-09-08", "00:00")).toBe("2026-09-08T03:00:00.000Z");
  });
});

describe("toARDate/toARTime", () => {
  it("round-trips a slot", () => {
    const iso = arSlotToISO("2026-09-08", "14:30");
    expect(toARDate(iso)).toBe("2026-09-08");
    expect(toARTime(iso)).toBe("14:30");
  });
  it("maps late-night UTC to the same AR date", () => {
    const iso = arSlotToISO("2026-09-08", "23:45");
    expect(toARDate(iso)).toBe("2026-09-08");
    expect(toARTime(iso)).toBe("23:45");
  });
});

describe("formatARS", () => {
  it("formats whole amounts without decimals", () => {
    expect(nbsp(formatARS(8000))).toBe("$ 8.000");
  });
  it("formats string amounts", () => {
    expect(nbsp(formatARS("15000"))).toBe("$ 15.000");
  });
});

function nbsp(s: string): string {
  return s.replace(/\u00A0/g, " ");
}

describe("formatDuration", () => {
  it("formats minutes under an hour", () => {
    expect(formatDuration(45)).toBe("45 min");
  });
  it("formats whole hours", () => {
    expect(formatDuration(60)).toBe("1 h");
  });
  it("formats mixed durations", () => {
    expect(formatDuration(90)).toBe("1 h 30 min");
  });
});
