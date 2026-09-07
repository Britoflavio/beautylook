export function formatARS(amount: string | number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: Number(amount) % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

export function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function parseARPrice(input: string): string | null {
  const cleaned = input.replace(/[^0-9.,]/g, "");
  if (!cleaned) return null;
  const normalized = cleaned.replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  if (Number.isNaN(n) || n < 0) return null;
  return normalized;
}

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  held: "Reservando",
  pending_payment: "Pago pendiente",
  confirmed: "Confirmado",
  cancelled: "Cancelado",
};
