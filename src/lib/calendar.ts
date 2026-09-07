function toBasicUTC(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function googleCalendarLink(params: {
  title: string;
  startsAt: string;
  endsAt: string;
  details?: string;
  location?: string;
}): string {
  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", params.title);
  url.searchParams.set("dates", `${toBasicUTC(params.startsAt)}/${toBasicUTC(params.endsAt)}`);
  if (params.details) url.searchParams.set("details", params.details);
  if (params.location) url.searchParams.set("location", params.location);
  url.searchParams.set("ctz", "America/Argentina/Buenos_Aires");
  return url.toString();
}
