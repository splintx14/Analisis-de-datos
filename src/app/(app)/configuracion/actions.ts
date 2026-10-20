"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CURRENCY_CODES } from "@/lib/currencies";
import { pool } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import { companyKey } from "@/lib/signup";

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

  const key = companyKey(name);
  if (key.length < 2) return { error: "Escribe un nombre de empresa válido." };

  const clash = await pool.query(
    "SELECT 1 FROM workspaces WHERE name_key = $1 AND id <> $2",
    [key, session.workspaceId],
  );
  if (clash.rowCount && clash.rowCount > 0) {
    return { error: "Ya existe un espacio con el nombre de esa empresa." };
  }

  try {
    await pool.query(
      `UPDATE workspaces
          SET name = $2, name_key = $3, currency = $4, default_range_days = $5, auto_refresh_minutes = $6
        WHERE id = $1`,
      [session.workspaceId, name, key, currency, rangeDays, refreshMinutes],
    );
  } catch (err) {
    if ((err as { code?: string }).code === "23505") {
      return { error: "Ya existe un espacio con el nombre de esa empresa." };
    }
    throw err;
  }
  await pool.query(
    "INSERT INTO audit_log (workspace_id, user_id, action) VALUES ($1, $2, 'settings.updated')",
    [session.workspaceId, session.userId],
  );

  revalidatePath("/", "layout");
  return { ok: true };
}
