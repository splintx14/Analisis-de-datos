"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { pool } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import type { Role } from "@/lib/roles";
import { assignableRoles, canManage, isRole } from "@/lib/team";
import { hashToken, newToken } from "@/lib/token";

export type InviteState = { error?: string; link?: string; email?: string } | undefined;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INVITE_DAYS = 7;

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Escribe un correo válido.")
  .max(254, "El correo es demasiado largo.");

// Crea una invitación y devuelve el enlace. El enlace solo se muestra esta vez:
// en la base únicamente se guarda su hash.
export async function createInvitation(
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const session = await requirePermission("users.manage");

  const parsedEmail = emailSchema.safeParse(String(formData.get("email") ?? ""));
  if (!parsedEmail.success) {
    return { error: parsedEmail.error.issues[0]?.message ?? "Revisa el correo." };
  }
  const email = parsedEmail.data;

  const role = String(formData.get("role") ?? "");
  if (!isRole(role) || !assignableRoles(session.role).includes(role)) {
    return { error: "Elige un rol válido." };
  }

  const existing = await pool.query("SELECT 1 FROM users WHERE email = $1", [email]);
  if (existing.rowCount && existing.rowCount > 0) {
    return {
      error:
        "Ese correo ya tiene una cuenta. Por ahora solo se puede invitar a personas que aún no tienen cuenta.",
    };
  }

  const token = newToken();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Una sola invitación pendiente por correo: la nueva reemplaza a la anterior.
    await client.query(
      "DELETE FROM invitations WHERE workspace_id = $1 AND email = $2 AND accepted_at IS NULL",
      [session.workspaceId, email],
    );
    await client.query(
      `INSERT INTO invitations (workspace_id, email, role, token_hash, invited_by, expires_at)
       VALUES ($1, $2, $3, $4, $5, now() + make_interval(days => $6::int))`,
      [session.workspaceId, email, role, hashToken(token), session.userId, INVITE_DAYS],
    );
    await client.query(
      `INSERT INTO audit_log (workspace_id, user_id, action, entity, metadata)
       VALUES ($1, $2, 'invitation.created', 'invitation', $3::jsonb)`,
      [session.workspaceId, session.userId, JSON.stringify({ email, role })],
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    return { error: "No se pudo crear la invitación. Inténtalo de nuevo." };
  } finally {
    client.release();
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  revalidatePath("/usuarios");
  return { link: `${proto}://${host}/invitacion/${token}`, email };
}

export async function revokeInvitation(formData: FormData): Promise<void> {
  const session = await requirePermission("users.manage");
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return;

  await pool.query(
    "DELETE FROM invitations WHERE id = $1 AND workspace_id = $2 AND accepted_at IS NULL",
    [id, session.workspaceId],
  );
  revalidatePath("/usuarios");
}

export async function changeRole(formData: FormData): Promise<void> {
  const session = await requirePermission("users.manage");
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "");

  if (
    !UUID.test(userId) ||
    userId === session.userId ||
    !isRole(role) ||
    !assignableRoles(session.role).includes(role)
  ) {
    return;
  }

  const cur = await pool.query(
    "SELECT role FROM memberships WHERE workspace_id = $1 AND user_id = $2",
    [session.workspaceId, userId],
  );
  const target = cur.rows[0]?.role as Role | undefined;
  if (!target || !canManage(session.role, target) || target === role) return;

  await pool.query(
    "UPDATE memberships SET role = $3 WHERE workspace_id = $1 AND user_id = $2",
    [session.workspaceId, userId, role],
  );
  await pool.query(
    `INSERT INTO audit_log (workspace_id, user_id, action, entity, entity_id, metadata)
     VALUES ($1, $2, 'member.role_changed', 'user', $3, $4::jsonb)`,
    [session.workspaceId, session.userId, userId, JSON.stringify({ from: target, to: role })],
  );
  revalidatePath("/usuarios");
}

// Quita a una persona del espacio. Si no pertenece a ningún otro espacio,
// su cuenta también se elimina (y con ella sus sesiones).
export async function removeMember(formData: FormData): Promise<void> {
  const session = await requirePermission("users.manage");
  const userId = String(formData.get("userId") ?? "");
  if (!UUID.test(userId) || userId === session.userId) return;

  const cur = await pool.query(
    "SELECT role FROM memberships WHERE workspace_id = $1 AND user_id = $2",
    [session.workspaceId, userId],
  );
  const target = cur.rows[0]?.role as Role | undefined;
  if (!target || !canManage(session.role, target)) return;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM memberships WHERE workspace_id = $1 AND user_id = $2", [
      session.workspaceId,
      userId,
    ]);
    const others = await client.query("SELECT 1 FROM memberships WHERE user_id = $1 LIMIT 1", [userId]);
    if (others.rowCount === 0) {
      await client.query("DELETE FROM users WHERE id = $1", [userId]);
    }
    await client.query(
      `INSERT INTO audit_log (workspace_id, user_id, action, entity, entity_id, metadata)
       VALUES ($1, $2, 'member.removed', 'user', $3, $4::jsonb)`,
      [session.workspaceId, session.userId, userId, JSON.stringify({ role: target })],
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  revalidatePath("/usuarios");
}
