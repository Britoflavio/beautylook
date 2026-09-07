import { describe, expect, it } from "vitest";
import { googleCalendarLink } from "./calendar";

describe("googleCalendarLink", () => {
  it("builds a valid template link with UTC basic dates", () => {
    const link = googleCalendarLink({
      title: "Turno: Corte + barba con Ana",
      startsAt: "2026-09-08T13:00:00.000Z",
      endsAt: "2026-09-08T13:45:00.000Z",
      details: "Reserva confirmada en BeautyBook",
      location: "Gorriti 1234, Palermo",
    });
    const url = new URL(link);
    expect(url.origin + url.pathname).toBe(
      "https://calendar.google.com/calendar/render",
    );
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("dates")).toBe(
      "20260908T130000Z/20260908T134500Z",
    );
    expect(url.searchParams.get("ctz")).toBe("America/Argentina/Buenos_Aires");
  });
});
