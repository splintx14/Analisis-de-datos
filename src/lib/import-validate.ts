import { pool } from "./db";
import {
  validateRows,
  type Mapping,
  type ParsedFile,
  type ValidationResult,
} from "./import-parse";

// Valida las filas y además marca como error las referencias repetidas,
// tanto dentro del archivo como las que ya existen en el espacio.
export async function validateWithDb(
  workspaceId: string,
  parsed: ParsedFile,
  mapping: Mapping,
): Promise<ValidationResult> {
  const base = validateRows(parsed, mapping);
  const refs = [...new Set(base.valid.map((r) => r.ref).filter((r): r is string => r !== null))];

  const existing = new Set<string>();
  if (refs.length > 0) {
    const { rows } = await pool.query(
      "SELECT order_ref FROM records WHERE workspace_id = $1 AND order_ref = ANY($2::text[])",
      [workspaceId, refs],
    );
    for (const r of rows) existing.add(r.order_ref);
  }

  const seen = new Set<string>();
  const valid: typeof base.valid = [];
  const errors = [...base.errors];

  for (const row of base.valid) {
    if (row.ref !== null) {
      if (existing.has(row.ref)) {
        errors.push({ sheetRow: row.sheetRow, reason: `Referencia ya importada (${row.ref})` });
        continue;
      }
      if (seen.has(row.ref)) {
        errors.push({ sheetRow: row.sheetRow, reason: `Referencia repetida en el archivo (${row.ref})` });
        continue;
      }
      seen.add(row.ref);
    }
    valid.push(row);
  }

  errors.sort((a, b) => a.sheetRow - b.sheetRow);
  return { total: base.total, valid, errors };
}
