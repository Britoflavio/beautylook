export function normalizeARPhone(local: string): string | null {
  let n = local.replace(/\D/g, "");
  if (n.startsWith("549")) n = n.slice(3);
  else if (n.startsWith("54")) n = n.slice(2);
  else if (n.length === 11 && n.startsWith("9")) n = n.slice(1);
  if (n.length < 8 || n.length > 10) return null;
  return `+549${n}`;
}

export function formatARPhone(e164: string): string {
  const n = e164.replace(/^\+549/, "");
  if (n.length !== 10) return e164;
  return `+54 9 ${n.slice(0, n.length - 8)} ${n.slice(-8, -4)} ${n.slice(-4)}`;
}
