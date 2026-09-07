import { describe, it, expect, beforeEach, vi } from "vitest";
import { encrypt, decrypt } from "./crypto";
import { randomBytes } from "crypto";

describe("crypto AES-256-GCM", () => {
  const key = randomBytes(32).toString("base64");

  beforeEach(() => {
    vi.stubEnv("MP_ENCRYPTION_KEY", key);
  });

  it("round-trips encrypt/decrypt", () => {
    const token = "APP_USR-1234567890abcdef";
    const enc = encrypt(token);
    expect(enc.split(":")).toHaveLength(3);
    expect(decrypt(enc)).toBe(token);
  });

  it("different IVs produce different ciphertexts", () => {
    const enc1 = encrypt("hello");
    const enc2 = encrypt("hello");
    expect(enc1).not.toBe(enc2);
    expect(decrypt(enc1)).toBe("hello");
    expect(decrypt(enc2)).toBe("hello");
  });

  it("returns null on tampered payload", () => {
    const enc = encrypt("secret");
    const tampered = enc.slice(0, -2) + "xx";
    expect(decrypt(tampered)).toBeNull();
  });

  it("returns null on malformed payload", () => {
    expect(decrypt("not-a-valid-payload")).toBeNull();
    expect(decrypt("a:b:c:d")).toBeNull();
  });
});
