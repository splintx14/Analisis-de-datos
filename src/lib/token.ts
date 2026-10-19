import { createHash, randomBytes } from "node:crypto";

// Token de 32 bytes en base64url (43 caracteres). En la base solo se guarda su hash.
export const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
export const newToken = () => randomBytes(32).toString("base64url");
export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");
