export const SLUG_RE = /^[a-z0-9]([a-z0-9-]{1,28}[a-z0-9])$/;

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}

export function suggestSlugs(base: string): string[] {
  const b = base || "mi-negocio";
  const candidates = [
    `${b}-2`,
    `${b}-est`,
    `${b}belleza`,
    `${b}-${new Date().getFullYear()}`,
  ];
  return candidates.filter((c) => isValidSlug(c)).slice(0, 3);
}
