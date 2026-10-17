import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { hash, verify } from "@node-rs/argon2";
import { pool } from "./db";
import type { Role } from "./roles";

export const SESSION_COOKIE = "di_session";
const SESSION_DAYS = 7;

// argon2id con parámetros recomendados por OWASP (19 MiB, 2 iteraciones)
const ARGON_OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

export function hashPassword(password: string) {
  return hash(password, ARGON_OPTS);
}

export async function checkPassword(hashed: string, password: string) {
  try {
    return await verify(hashed, password);
  } catch {
    return false;
  }
}

// En la base solo se guarda el hash del token; el token real vive en la cookie.
const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = h.get("user-agent")?.slice(0, 255) ?? null;

  await pool.query(
    `INSERT INTO sessions (user_id, token_hash, ip, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, sha256(token), ip, userAgent, expires],
  );

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export interface Session {
  userId: string;
  name: string;
  email: string;
  workspaceId: string;
  workspaceName: string;
  role: Role;
}

// Devuelve la sesión actual o null. Se calcula una sola vez por petición.
export const getSession = cache(async (): Promise<Session | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const { rows } = await pool.query(
    `SELECT u.id AS user_id, u.name, u.email,
            w.id AS workspace_id, w.name AS workspace_name, m.role
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       JOIN memberships m ON m.user_id = u.id
       JOIN workspaces w ON w.id = m.workspace_id
      WHERE s.token_hash = $1 AND s.expires_at > now()
      ORDER BY m.created_at ASC
      LIMIT 1`,
    [sha256(token)],
  );

  const row = rows[0];
  if (!row) return null;

  return {
    userId: row.user_id,
    name: row.name,
    email: row.email,
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role: row.role,
  };
});

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await pool.query("DELETE FROM sessions WHERE token_hash = $1", [
      sha256(token),
    ]);
  }
  jar.delete(SESSION_COOKIE);
}
