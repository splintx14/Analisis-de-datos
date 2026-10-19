"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, hashPassword } from "@/lib/auth";
import { pool } from "@/lib/db";
import { hashToken, TOKEN_RE } from "@/lib/token";

export type AcceptState = { error?: string } | undefined;

const schema = z.object({
  name: z.string().trim().min(2, "Escribe tu nombre.").max(80, "El nombre es demasiado largo."),
  password: z
    .string()
    .min(10, "La contraseña debe tener al menos 10 caracteres.")
    .max(128, "La contraseña es demasiado larga."),
});

export async function acceptInvitation(
  _prev: AcceptState,
  formData: FormData,
): Promise<AcceptState> {
  const token = String(formData.get("token") ?? "");
  if (!TOKEN_RE.test(token)) return { error: "Este enlace no es válido." };

  const parsed = schema.safeParse({
    name: String(formData.get("name") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa el formulario." };
  }
  const { name, password } = parsed.data;
  const passwordHash = await hashPassword(password);

  const client = await pool.connect();
  let userId = "";
  try {
    await client.query("BEGIN");

    const inv = await client.query(
      `SELECT id, workspace_id, email, role FROM invitations
        WHERE token_hash = $1 AND accepted_at IS NULL AND expires_at > now()
          FOR UPDATE`,
      [hashToken(token)],
    );
    const i = inv.rows[0];
    if (!i) {
      await client.query("ROLLBACK");
      return { error: "Esta invitación no es válida o ya venció." };
    }

    const user = await client.query(
      "INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id",
      [i.email, name, passwordHash],
    );
    userId = user.rows[0].id;

    await client.query(
      "INSERT INTO memberships (workspace_id, user_id, role) VALUES ($1, $2, $3)",
      [i.workspace_id, userId, i.role],
    );
    await client.query("UPDATE invitations SET accepted_at = now() WHERE id = $1", [i.id]);
    await client.query(
      `INSERT INTO audit_log (workspace_id, user_id, action, entity, entity_id)
       VALUES ($1, $2, 'invitation.accepted', 'invitation', $3)`,
      [i.workspace_id, userId, i.id],
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    if ((err as { code?: string }).code === "23505") {
      return { error: "Ya existe una cuenta con ese correo." };
    }
    console.error(err);
    return { error: "No se pudo aceptar la invitación. Inténtalo de nuevo." };
  } finally {
    client.release();
  }

  await createSession(userId);
  redirect("/resumen");
}
