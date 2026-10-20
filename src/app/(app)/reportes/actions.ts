"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { pool } from "@/lib/db";
import { cleanDate, cleanDays, cleanText, type ReportFilters } from "@/lib/filters";
import { requirePermission } from "@/lib/guard";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_REPORTS = 200;
const nameSchema = z.string().trim().min(2).max(80);

// Guarda los filtros que se están viendo en el Resumen como un reporte con nombre.
export async function saveReport(formData: FormData): Promise<void> {
  const session = await requirePermission("reports.manage");

  const name = nameSchema.safeParse(String(formData.get("name") ?? ""));
  if (!name.success) return;

  const filters: ReportFilters = {};
  const dias = cleanDays(formData.get("dias"));
  if (dias) {
    filters.dias = dias; // rango móvil: siempre los últimos N días
  } else {
    const desde = cleanDate(String(formData.get("desde") ?? ""));
    const hasta = cleanDate(String(formData.get("hasta") ?? ""));
    if (desde) filters.desde = desde;
    if (hasta) filters.hasta = hasta;
  }
  const categoria = cleanText(String(formData.get("categoria") ?? ""));
  const region = cleanText(String(formData.get("region") ?? ""));
  if (categoria) filters.categoria = categoria;
  if (region) filters.region = region;

  const count = await pool.query(
    "SELECT COUNT(*)::int AS n FROM saved_reports WHERE workspace_id = $1",
    [session.workspaceId],
  );
  if (count.rows[0].n >= MAX_REPORTS) return;

  const { rows } = await pool.query(
    `INSERT INTO saved_reports (workspace_id, created_by, name, filters, is_shared)
     VALUES ($1, $2, $3, $4::jsonb, $5) RETURNING id`,
    [
      session.workspaceId,
      session.userId,
      name.data,
      JSON.stringify(filters),
      formData.get("share") === "on",
    ],
  );
  await pool.query(
    "INSERT INTO audit_log (workspace_id, user_id, action, entity, entity_id) VALUES ($1, $2, 'report.created', 'report', $3)",
    [session.workspaceId, session.userId, rows[0].id],
  );

  revalidatePath("/reportes");
  redirect(`/reportes/${rows[0].id}`);
}

// Solo puede cambiar o borrar un reporte quien lo creó, o un propietario/administrador.
async function ownReport(id: string) {
  const session = await requirePermission("reports.manage");
  if (!UUID.test(id)) return null;
  const { rows } = await pool.query(
    "SELECT created_by FROM saved_reports WHERE id = $1 AND workspace_id = $2",
    [id, session.workspaceId],
  );
  const r = rows[0];
  if (!r) return null;
  const isAdmin = session.role === "owner" || session.role === "admin";
  return isAdmin || r.created_by === session.userId ? session : null;
}

export async function toggleShare(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const session = await ownReport(id);
  if (!session) return;

  await pool.query(
    "UPDATE saved_reports SET is_shared = NOT is_shared WHERE id = $1 AND workspace_id = $2",
    [id, session.workspaceId],
  );
  revalidatePath("/reportes");
  revalidatePath(`/reportes/${id}`);
}

export async function deleteReport(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const session = await ownReport(id);
  if (!session) return;

  await pool.query("DELETE FROM saved_reports WHERE id = $1 AND workspace_id = $2", [
    id,
    session.workspaceId,
  ]);
  await pool.query(
    "INSERT INTO audit_log (workspace_id, user_id, action, entity, entity_id) VALUES ($1, $2, 'report.deleted', 'report', $3)",
    [session.workspaceId, session.userId, id],
  );
  revalidatePath("/reportes");
  redirect("/reportes");
}
