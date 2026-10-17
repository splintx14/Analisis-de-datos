"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { pool } from "@/lib/db";
import {
  checkPassword,
  createSession,
  destroySession,
  hashPassword,
} from "@/lib/auth";

export type FormState = { error?: string } | undefined;

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Escribe tu nombre.")
    .max(80, "El nombre es demasiado largo."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Escribe un correo válido.")
    .max(254, "El correo es demasiado largo."),
  password: z
    .string()
    .min(10, "La contraseña debe tener al menos 10 caracteres.")
    .max(128, "La contraseña es demasiado larga."),
  workspace: z
    .string()
    .trim()
    .min(2, "Ponle un nombre a tu espacio de trabajo.")
    .max(80, "El nombre del espacio es demasiado largo."),
});

export async function register(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    workspace: String(formData.get("workspace") ?? ""),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa el formulario." };
  }

  const { name, email, password, workspace } = parsed.data;
  const passwordHash = await hashPassword(password);

  // Usuario + espacio + membresía de propietario: todo o nada.
  const client = await pool.connect();
  let userId = "";
  try {
    await client.query("BEGIN");
    const user = await client.query(
      "INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id",
      [email, name, passwordHash],
    );
    userId = user.rows[0].id;

    const ws = await client.query(
      "INSERT INTO workspaces (name, created_by) VALUES ($1, $2) RETURNING id",
      [workspace, userId],
    );
    await client.query(
      "INSERT INTO memberships (workspace_id, user_id, role) VALUES ($1, $2, 'owner')",
      [ws.rows[0].id, userId],
    );
    await client.query(
      "INSERT INTO audit_log (workspace_id, user_id, action) VALUES ($1, $2, 'user.registered')",
      [ws.rows[0].id, userId],
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    if ((err as { code?: string }).code === "23505") {
      return { error: "Ya existe una cuenta con ese correo." };
    }
    console.error(err);
    return { error: "No se pudo crear la cuenta. Inténtalo de nuevo." };
  } finally {
    client.release();
  }

  await createSession(userId);
  redirect("/resumen");
}

// Hash falso para gastar el mismo tiempo cuando el correo no existe
// (evita adivinar qué correos están registrados midiendo la respuesta).
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= hashPassword("contraseña-falsa"));

export async function login(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { error: "Escribe tu correo y tu contraseña." };
  }

  const generic = "Correo o contraseña incorrectos.";

  const { rows } = await pool.query(
    `SELECT id, password_hash, failed_login_attempts, locked_until
       FROM users WHERE email = $1`,
    [email],
  );
  const user = rows[0];

  if (!user) {
    await checkPassword(await getDummyHash(), password);
    return { error: generic };
  }

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    return {
      error: "Demasiados intentos fallidos. Inténtalo de nuevo en unos minutos.",
    };
  }

  const ok = await checkPassword(user.password_hash, password);
  if (!ok) {
    const attempts = user.failed_login_attempts + 1;
    if (attempts >= MAX_ATTEMPTS) {
      await pool.query(
        `UPDATE users
            SET failed_login_attempts = 0,
                locked_until = now() + make_interval(mins => $2::int)
          WHERE id = $1`,
        [user.id, LOCK_MINUTES],
      );
    } else {
      await pool.query(
        "UPDATE users SET failed_login_attempts = $2 WHERE id = $1",
        [user.id, attempts],
      );
    }
    return { error: generic };
  }

  await pool.query(
    "UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1",
    [user.id],
  );
  await pool.query(
    "INSERT INTO audit_log (user_id, action) VALUES ($1, 'user.login')",
    [user.id],
  );
  await createSession(user.id);
  redirect("/resumen");
}

export async function logout() {
  await destroySession();
  redirect("/");
}
