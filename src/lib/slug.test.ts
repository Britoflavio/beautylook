import { describe, expect, it } from "vitest";
import { slugify, isValidSlug, suggestSlugs } from "./slug";

describe("slugify", () => {
  it("lowercases and strips accents", () => {
    expect(slugify("María Fernández")).toBe("maria-fernandez");
  });
  it("replaces spaces and removes symbols", () => {
    expect(slugify("Nail's Studio & Spa!")).toBe("nails-studio-spa");
  });
  it("collapses repeated separators", () => {
    expect(slugify("  mi   --  pagina  ")).toBe("mi-pagina");
  });
  it("never leaves leading/trailing hyphens", () => {
    expect(slugify("-hola-")).toBe("hola");
  });
});

describe("isValidSlug", () => {
  it("accepts valid slugs", () => {
    expect(isValidSlug("ana-estetica")).toBe(true);
    expect(isValidSlug("ana")).toBe(true);
  });
  it("rejects invalid slugs", () => {
    expect(isValidSlug("-hola")).toBe(false);
    expect(isValidSlug("hola-")).toBe(false);
    expect(isValidSlug("Ho")).toBe(false);
    expect(isValidSlug("x")).toBe(false);
    expect(isValidSlug("a".repeat(31))).toBe(false);
  });
});

describe("suggestSlugs", () => {
  it("returns only valid suggestions", () => {
    const s = suggestSlugs("ana");
    expect(s.length).toBeGreaterThan(0);
    s.forEach((c) => expect(isValidSlug(c)).toBe(true));
  });
});
