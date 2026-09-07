export const AR_TZ = "America/Argentina/Buenos_Aires";
const AR_OFFSET = "-03:00";

export const WEEKDAYS: { dbWeekday: number; label: string }[] = [
  { dbWeekday: 1, label: "Lunes" },
  { dbWeekday: 2, label: "Martes" },
  { dbWeekday: 3, label: "Miércoles" },
  { dbWeekday: 4, label: "Jueves" },
  { dbWeekday: 5, label: "Viernes" },
  { dbWeekday: 6, label: "Sábado" },
  { dbWeekday: 0, label: "Domingo" },
];

export function arSlotToISO(date: string, time: string): string {
  return new Date(`${date}T${time}:00${AR_OFFSET}`).toISOString();
}

export function toARDate(iso: string): string {
  const d = new Date(iso);
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: AR_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(d);
}

export function toARTime(iso: string): string {
  const d = new Date(iso);
  const fmt = new Intl.DateTimeFormat("es-AR", {
    timeZone: AR_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return fmt.format(d);
}

export function formatARDayTime(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: AR_TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

export function formatARDateShort(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: AR_TZ,
    day: "2-digit",
    month: "short",
  }).format(d);
}

export function todayARDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: AR_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
