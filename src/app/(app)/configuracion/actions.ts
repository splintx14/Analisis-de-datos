"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CURRENCY_CODES } from "@/lib/currencies";
import { pool } from "@/lib/db";
import { requirePermission } from "@/lib/guard";

export type SettingsState = { ok?: boolean; error?: string } | undefined;

const schema = z.object({
  name: z.string().trim().min(2, "El nombre del espacio es muy corto.").max(80, "El nombre del espacio es demasiado largo."),
  currency: z.string().refine((v) => CURRENCY_CODES.includes(v), "Elige una moneda de la lista."),
  rangeDays: z.coerce.number({ invalid_type_error: "El rango debe ser un número." }).int("El rango debe ser un número entero.").min(1, "El rango mínimo es 1 día.").max(3650, "El rango máximo es 3650 días."),
  refreshMinutes: z.coerce.number({ invalid_type_error: "La actualización debe ser un número." }).int("La actualización debe ser un número entero.").min(0, "Usa 0 para desactivarla.").max(1440, "El máximo es 1440 minutos (24 horas)."),
});

export async function updateSettings(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const session = await requirePermission("settings.manage");

  const parsed = schema.safeParse({
    name: String(formData.get("name") ?? ""),
    currency: String(formData.get("currency") ?? ""),
    rangeDays: String(formData.get("rangeDays") ?? ""),
    refreshMinutes: String(formData.get("refreshMinutes") ?? ""),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa el formulario." };
  }
  const { name, currency, rangeDays, refreshMinutes } = parsed.data;

  await pool.query(
    `UPDATE workspaces
        SET name = $2, currency = $3, default_range_days = $4, auto_refresh_minutes = $5
      WHERE id = $1`,
    [session.workspaceId, name, currency, rangeDays, refreshMinutes],
  );
  await pool.query(
    "INSERT INTO audit_log (workspace_id, user_id, action) VALUES ($1, $2, 'settings.updated')",
    [session.workspaceId, session.userId],
  );

  revalidatePath("/", "layout");
  return { ok: true };
}
