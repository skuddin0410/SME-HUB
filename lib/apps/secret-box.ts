import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Update 36: Zoom and Google refresh tokens are encrypted before they reach the database (AES-256-GCM).
 * The key is a server setting, TOKEN_ENC_KEY: 32 random bytes in base64 (`openssl rand -base64 32`).
 * It lives only in AWS Amplify, never in the code or the database.
 */
function key(): Buffer | null {
  const k = process.env.TOKEN_ENC_KEY;
  if (!k) return null;
  const b = Buffer.from(k, "base64");
  return b.length === 32 ? b : null;
}

export const secretBoxReady = () => key() !== null;

export function seal(plain: string): string {
  const k = key();
  if (!k) throw new Error("TOKEN_ENC_KEY is not set");
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", k, iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), ct.toString("base64url")].join(".");
}

export function open(sealed: string): string {
  const k = key();
  if (!k) throw new Error("TOKEN_ENC_KEY is not set");
  const [v, iv, tag, ct] = sealed.split(".");
  if (v !== "v1" || !iv || !tag || !ct) throw new Error("Unknown sealed value");
  const d = createDecipheriv("aes-256-gcm", k, Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(ct, "base64url")), d.final()]).toString("utf8");
}
