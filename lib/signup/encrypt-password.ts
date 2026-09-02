import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const PREFIX = "v1";
const SALT = "nutrigestao-signup-intent-v1";

function deriveKey(secret: string): Buffer {
  return scryptSync(secret, SALT, 32);
}

export function encryptSignupPassword(plain: string, secret: string): string {
  if (!secret.trim()) {
    throw new Error("Segredo de cifragem do cadastro ausente.");
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    PREFIX,
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

export function decryptSignupPassword(payload: string, secret: string): string {
  if (!secret.trim()) {
    throw new Error("Segredo de cifragem do cadastro ausente.");
  }
  const parts = payload.split(":");
  if (parts.length !== 4 || parts[0] !== PREFIX) {
    throw new Error("Senha cifrada inválida.");
  }
  const [, ivB64, tagB64, dataB64] = parts;
  const decipher = createDecipheriv(
    "aes-256-gcm",
    deriveKey(secret),
    Buffer.from(ivB64 ?? "", "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagB64 ?? "", "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64 ?? "", "base64url")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
