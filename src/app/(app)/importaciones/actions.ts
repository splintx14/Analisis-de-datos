"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { pool } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import { parseCsv, parseXlsx } from "@/lib/import-files";
import {
  guessMapping,
  MAX_BYTES,
  MAX_COLS,
  MAX_ROWS,
  toIndex,
  type Mapping,
  type ParsedFile,
} from "@/lib/import-parse";
import { validateWithDb } from "@/lib/import-validate";

export type UploadState = { error?: string } | undefined;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CHUNK = 2000;

function refresh() {
  revalidatePath("/importaciones");
  revalidatePath("/resumen");
  revalidatePath("/registros");
}

// Paso 1: subir el archivo. Se lee, se propone la asignación de columnas
// y se guarda como importación "pendiente" hasta que se confirme.
export async function uploadImport(_prev: UploadState, formData: FormData): Promise<UploadState> {
  const session = await requirePermission("imports.create");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Elige un archivo para subir." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "El archivo supera los 5 MB." };
  }

  const filename = file.name.slice(0, 200);
  const ext = filename.toLowerCase().split(".").pop();

  let parsed: ParsedFile;
  try {
    if (ext === "xlsx") parsed = await parseXlsx(Buffer.from(await file.arrayBuffer()));
    else if (ext === "csv") parsed = parseCsv(await file.text());
    else return { error: "Formato no compatible. Sube un archivo .xlsx o .csv." };
  } catch (err) {
    console.error(err);
    return {
      error: "No se pudo leer el archivo. Comprueba que no esté dañado ni protegido con contraseña.",
    };
  }

  if (parsed.headers.length === 0 || parsed.rows.length === 0) {
    return { error: "El archivo no tiene datos. La primera fila debe ser el encabezado." };
  }
  if (parsed.rows.length > MAX_ROWS) {
    return { error: `El archivo tiene demasiadas filas (máximo ${MAX_ROWS.toLocaleString("es-ES")}).` };
  }
  if (parsed.headers.length > MAX_COLS) {
    return { error: `El archivo tiene demasiadas columnas (máximo ${MAX_COLS}).` };
  }

  const mapping = guessMapping(parsed.headers);
  const { rows } = await pool.query(
    `INSERT INTO imports (workspace_id, uploaded_by, filename, status, total_rows, column_mapping, raw)
     VALUES ($1, $2, $3, 'pending', $4, $5::jsonb, $6::jsonb)
     RETURNING id`,
    [
      session.workspaceId,
      session.userId,
      filename,
      parsed.rows.length,
      JSON.stringify(mapping),
      JSON.stringify(parsed),
    ],
  );

  refresh();
  redirect(`/importaciones/${rows[0].id}`);
}

// Paso 2: confirmar. Se vuelve a validar todo en el servidor y se guardan las filas válidas.
export async function confirmImport(formData: FormData): Promise<void> {
  const session = await requirePermission("imports.create");

  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) redirect("/importaciones");

  const found = await pool.query(
    "SELECT status, raw FROM imports WHERE id = $1 AND workspace_id = $2",
    [id, session.workspaceId],
  );
  const imp = found.rows[0];
  if (!imp || imp.status !== "pending" || !imp.raw) redirect("/importaciones");

  const raw = imp.raw as ParsedFile;
  const len = raw.headers.length;
  const mapping: Mapping = {
    fecha: toIndex(formData.get("fecha"), len),
    monto: toIndex(formData.get("monto"), len),
    categoria: toIndex(formData.get("categoria"), len),
    region: toIndex(formData.get("region"), len),
    referencia: toIndex(formData.get("referencia"), len),
  };

  const result = await validateWithDb(session.workspaceId, raw, mapping);
  if (mapping.fecha === null || mapping.monto === null || result.valid.length === 0) {
    redirect(`/importaciones/${id}`);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (let i = 0; i < result.valid.length; i += CHUNK) {
      const part = result.valid.slice(i, i + CHUNK);
      await client.query(
        `INSERT INTO records (workspace_id, import_id, occurred_on, amount, category, region, order_ref)
         SELECT $1::uuid, $2::uuid, t.d, t.a, t.c, t.r, t.f
           FROM unnest($3::date[], $4::numeric[], $5::text[], $6::text[], $7::text[]) AS t(d, a, c, r, f)`,
        [
          session.workspaceId,
          id,
          part.map((r) => r.date),
          part.map((r) => r.amount),
          part.map((r) => r.category),
          part.map((r) => r.region),
          part.map((r) => r.ref),
        ],
      );
    }

    await client.query(
      `UPDATE imports
          SET status = 'completed', total_rows = $2, valid_rows = $3, error_rows = $4,
              column_mapping = $5::jsonb, error_report = $6::jsonb,
              completed_at = now(), raw = NULL
        WHERE id = $1`,
      [
        id,
        result.total,
        result.valid.length,
        result.errors.length,
        JSON.stringify(mapping),
        JSON.stringify(result.errors.slice(0, 100)),
      ],
    );
    await client.query(
      "INSERT INTO audit_log (workspace_id, user_id, action, entity, entity_id) VALUES ($1, $2, 'import.completed', 'import', $3)",
      [session.workspaceId, session.userId, id],
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  refresh();
  redirect(`/importaciones/${id}`);
}

// Descartar una importación pendiente.
export async function cancelImport(formData: FormData): Promise<void> {
  const session = await requirePermission("imports.create");
  const id = String(formData.get("id") ?? "");
  if (UUID.test(id)) {
    await pool.query(
      "DELETE FROM imports WHERE id = $1 AND workspace_id = $2 AND status = 'pending'",
      [id, session.workspaceId],
    );
  }
  refresh();
  redirect("/importaciones");
}

// Deshacer una importación completada: borra sus registros.
export async function revertImport(formData: FormData): Promise<void> {
  const session = await requirePermission("imports.create");
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) redirect("/importaciones");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const upd = await client.query(
      `UPDATE imports SET status = 'reverted', reverted_at = now()
        WHERE id = $1 AND workspace_id = $2 AND status = 'completed'`,
      [id, session.workspaceId],
    );
    if (upd.rowCount === 1) {
      await client.query("DELETE FROM records WHERE import_id = $1 AND workspace_id = $2", [
        id,
        session.workspaceId,
      ]);
      await client.query(
        "INSERT INTO audit_log (workspace_id, user_id, action, entity, entity_id) VALUES ($1, $2, 'import.reverted', 'import', $3)",
        [session.workspaceId, session.userId, id],
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  refresh();
  redirect(`/importaciones/${id}`);
}
