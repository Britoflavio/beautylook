import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

function getKey(): Buffer {
  const b64 = process.env.MP_ENCRYPTION_KEY;
  if (!b64) throw new Error("MP_ENCRYPTION_KEY not set");
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) throw new Error("MP_ENCRYPTION_KEY must be 32 bytes base64");
  return key;
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function decrypt(payload: string): string | null {
  try {
    const key = getKey();
    const [ivB64, tagB64, encB64] = payload.split(":");
    if (!ivB64 || !tagB64 || !encB64) return null;
    const iv = Buffer.from(ivB64, "base64");
    const tag = Buffer.from(tagB64, "base64");
    const enc = Buffer.from(encB64, "base64");
    if (iv.length !== IV_LEN || tag.length !== TAG_LEN) return null;
    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
    return dec.toString("utf8");
  } catch {
    return null;
  }
}
