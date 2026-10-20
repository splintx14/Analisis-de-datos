"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { checkPassword, hashPassword, SESSION_COOKIE } from "@/lib/auth";
import { pool } from "@/lib/db";
import { requireSession } from "@/lib/guard";
import { validateProfileFields } from "@/lib/signup";
import { hashToken } from "@/lib/token";

export type ProfileState = { ok?: boolean; error?: string } | undefined;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

// Hash de la sesión desde la que se hace la petición (para no cerrarla por error).
async function currentTokenHash() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? hashToken(token) : "";
}

export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const session = await requireSession();

  const raw: Record<string, string> = {};
  for (const f of ["first_name", "last_name", "phone", "country", "job_title"]) {
    raw[f] = String(formData.get(f) ?? "");
  }
  const { errors, data } = validateProfileFields(raw);
  if (!data) return { error: errors[0] ?? "Revisa el formulario." };

  await pool.query(
    `UPDATE users
        SET first_name = $2, last_name = $3, name = $4, phone = $5,
            country = $6, job_title = $7, updated_at = now()
      WHERE id = $1`,
    [session.userId, data.firstName, data.lastName, `${data.firstName} ${data.lastName}`, data.phone, data.country, data.jobTitle],
  );
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function changePassword(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const session = await requireSession();

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!current) return { error: "Escribe tu contraseña actual." };
  if (next.length < 10) return { error: "La nueva contraseña debe tener al menos 10 caracteres." };
  if (next.length > 128) return { error: "La nueva contraseña es demasiado larga." };
  if (next !== confirm) return { error: "La confirmación no coincide con la nueva contraseña." };
  if (next === current) return { error: "La nueva contraseña debe ser distinta de la actual." };

  const { rows } = await pool.query(
    "SELECT password_hash, failed_login_attempts, locked_until FROM users WHERE id = $1",
    [session.userId],
  );
  const user = rows[0];
  if (!user) return { error: "No se encontró tu cuenta." };

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    return { error: "Demasiados intentos fallidos. Inténtalo de nuevo en unos minutos." };
  }

  // Se comprueba la contraseña actual con el mismo límite de intentos que el inicio de sesión.
  if (!(await checkPassword(user.password_hash, current))) {
    const attempts = user.failed_login_attempts + 1;
    if (attempts >= MAX_ATTEMPTS) {
      await pool.query(
        `UPDATE users SET failed_login_attempts = 0,
                locked_until = now() + make_interval(mins => $2::int)
          WHERE id = $1`,
        [session.userId, LOCK_MINUTES],
      );
    } else {
      await pool.query("UPDATE users SET failed_login_attempts = $2 WHERE id = $1", [
        session.userId,
        attempts,
      ]);
    }
    return { error: "La contraseña actual no es correcta." };
  }

  const newHash = await hashPassword(next);
  const keep = await currentTokenHash();

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE users SET password_hash = $2, failed_login_attempts = 0,
              locked_until = NULL, updated_at = now()
        WHERE id = $1`,
      [session.userId, newHash],
    );
    // Por seguridad, se cierran las sesiones de los demás dispositivos.
    await client.query("DELETE FROM sessions WHERE user_id = $1 AND token_hash <> $2", [
      session.userId,
      keep,
    ]);
    await client.query(
      "INSERT INTO audit_log (workspace_id, user_id, action) VALUES ($1, $2, 'user.password_changed')",
      [session.workspaceId, session.userId],
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    return { error: "No se pudo cambiar la contraseña. Inténtalo de nuevo." };
  } finally {
    client.release();
  }

  revalidatePath("/perfil");
  return { ok: true };
}

export async function revokeSession(formData: FormData): Promise<void> {
  const session = await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return;

  await pool.query(
    "DELETE FROM sessions WHERE id = $1 AND user_id = $2 AND token_hash <> $3",
    [id, session.userId, await currentTokenHash()],
  );
  revalidatePath("/perfil");
}

export async function revokeOtherSessions(): Promise<void> {
  const session = await requireSession();
  await pool.query("DELETE FROM sessions WHERE user_id = $1 AND token_hash <> $2", [
    session.userId,
    await currentTokenHash(),
  ]);
  revalidatePath("/perfil");
}
