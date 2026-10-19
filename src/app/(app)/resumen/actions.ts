"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { pool } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import { SAMPLE_IMPORT_NAME } from "@/lib/sample";

const SAMPLE_ROWS = 320;

// Llena el espacio con 320 órdenes de ejemplo repartidas en los últimos 12 meses.
export async function loadSampleData(): Promise<void> {
  const session = await requirePermission("imports.create");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const imp = await client.query(
      `INSERT INTO imports (workspace_id, uploaded_by, filename, status, total_rows, valid_rows, completed_at)
       VALUES ($1, $2, $3, 'completed', ${SAMPLE_ROWS}, ${SAMPLE_ROWS}, now())
       RETURNING id`,
      [session.workspaceId, session.userId, SAMPLE_IMPORT_NAME],
    );

    await client.query(
      `INSERT INTO records (workspace_id, import_id, occurred_on, amount, category, region, order_ref)
       SELECT $1::uuid, $2::uuid,
              current_date - s.back,
              round(((60 + s.a * 900) * CASE
                       WHEN s.c < 0.38 THEN 1.6
                       WHEN s.c < 0.67 THEN 1.2
                       WHEN s.c < 0.86 THEN 0.8
                       ELSE 0.5 END)::numeric, 2),
              CASE
                WHEN s.c < 0.38 THEN 'Servicios'
                WHEN s.c < 0.67 THEN 'Hardware'
                WHEN s.c < 0.86 THEN 'Software'
                ELSE 'Suscripciones' END,
              (ARRAY['Norte', 'Sur', 'Este', 'Oeste'])[1 + floor(s.g * 4)::int],
              'DEMO-' || s.n
         FROM (
           SELECT n, random() AS c, random() AS g, random() AS a,
                  floor(random() * 365)::int AS back
             FROM generate_series(1, ${SAMPLE_ROWS}) AS n
         ) s`,
      [session.workspaceId, imp.rows[0].id],
    );

    await client.query(
      "INSERT INTO audit_log (workspace_id, user_id, action) VALUES ($1, $2, 'sample.loaded')",
      [session.workspaceId, session.userId],
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  revalidatePath("/resumen");
  redirect("/resumen");
}

// Borra solo los datos de ejemplo (los registros se eliminan en cascada).
export async function removeSampleData(): Promise<void> {
  const session = await requirePermission("imports.create");

  await pool.query(
    "DELETE FROM imports WHERE workspace_id = $1 AND filename = $2",
    [session.workspaceId, SAMPLE_IMPORT_NAME],
  );
  await pool.query(
    "INSERT INTO audit_log (workspace_id, user_id, action) VALUES ($1, $2, 'sample.removed')",
    [session.workspaceId, session.userId],
  );

  revalidatePath("/resumen");
  redirect("/resumen");
}
