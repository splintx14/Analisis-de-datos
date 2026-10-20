"use server";

import { redirect } from "next/navigation";
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
