// Lectura, interpretación y validación de los datos de un archivo.
// Son funciones puras (sin base de datos), fáciles de probar.

export type Cell = string | number | null;

export interface ParsedFile {
  headers: string[];
  rows: Cell[][];
}

export interface Mapping {
  fecha: number | null;
  monto: number | null;
  categoria: number | null;
  region: number | null;
  referencia: number | null;
}

export type MappingKey = keyof Mapping;

export const MAPPING_FIELDS: { key: MappingKey; label: string; required: boolean }[] = [
  { key: "fecha", label: "Fecha", required: true },
  { key: "monto", label: "Monto", required: true },
  { key: "categoria", label: "Categoría", required: false },
  { key: "region", label: "Región", required: false },
  { key: "referencia", label: "Referencia u orden", required: false },
];

export const MAX_BYTES = 4 * 1024 * 1024;
export const MAX_ROWS = 20000;
export const MAX_COLS = 50;

// ---------- Estructura de la tabla ----------
export function buildParsed(grid: Cell[][]): ParsedFile {
  const isEmpty = (r: Cell[]) => r.every((c) => c === null);
  const start = grid.findIndex((r) => !isEmpty(r));
  if (start === -1) return { headers: [], rows: [] };
  const data = grid.slice(start);

  let lastCol = -1;
  for (const r of data) {
    for (let c = r.length - 1; c > lastCol; c--) {
      if (r[c] !== null && r[c] !== undefined) {
        lastCol = c;
        break;
      }
    }
  }
  const width = lastCol + 1;

  const seen = new Map<string, number>();
  const headers = Array.from({ length: width }, (_, i) => {
    const base = String(data[0][i] ?? `Columna ${i + 1}`).trim().slice(0, 60) || `Columna ${i + 1}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base} (${n})`;
  });

  const rows = data
    .slice(1)
    .map((r) => Array.from({ length: width }, (_, i) => r[i] ?? null))
    .filter((r) => !isEmpty(r));

  return { headers, rows };
}

// ---------- Columnas ----------
const plain = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const PATTERNS: Record<MappingKey, RegExp> = {
  fecha: /(fecha|date|dia|periodo)/,
  monto: /(monto|importe|total|ingreso|venta|amount|revenue|valor|precio)/,
  categoria: /(categoria|category|rubro|producto|linea|tipo)/,
  region: /(region|zona|sucursal|ciudad|pais|territorio)/,
  referencia: /(referencia|orden|pedido|factura|folio|order|\bref\b|\bid\b|numero)/,
};

// Propone qué columna del archivo corresponde a cada campo.
export function guessMapping(headers: string[]): Mapping {
  const used = new Set<number>();
  const result: Mapping = { fecha: null, monto: null, categoria: null, region: null, referencia: null };
  for (const f of MAPPING_FIELDS) {
    const idx = headers.findIndex((h, i) => !used.has(i) && PATTERNS[f.key].test(plain(h)));
    if (idx !== -1) {
      result[f.key] = idx;
      used.add(idx);
    }
  }
  return result;
}

// Convierte un valor de formulario en un índice de columna válido (o null).
export function toIndex(v: unknown, len: number): number | null {
  if (typeof v !== "string" || v.trim() === "") return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 && n < len ? n : null;
}

// ---------- Valores ----------
const toIso = (y: number, m: number, d: number) => {
  if (y < 2000 || y > 2100) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt.toISOString().slice(0, 10);
};

// Acepta 2026-03-15, 15/03/2026, 15-03-26 (día primero) y números de serie de Excel.
export function parseDate(v: Cell): string | null {
  if (v === null) return null;
  if (typeof v === "number") {
    if (v < 20000 || v > 80000) return null;
    const dt = new Date(Date.UTC(1899, 11, 30) + Math.floor(v) * 86400000);
    return toIso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  }
  const s = v.trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/.exec(s);
  if (m) return toIso(Number(m[1]), Number(m[2]), Number(m[3]));
  m = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2}|\d{4})$/.exec(s);
  if (m) {
    const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    return toIso(y, Number(m[2]), Number(m[1]));
  }
  return null;
}

// Acepta 1234.56, "1.234,56", "1,234.56", "$ 1.200", "(300)" y similares.
export function parseAmount(v: Cell): number | null {
  if (v === null) return null;
  let n: number;
  if (typeof v === "number") {
    n = v;
  } else {
    let s = v.trim();
    let negative = false;
    if (/^\(.*\)$/.test(s)) {
      negative = true;
      s = s.slice(1, -1);
    }
    s = s.replace(/[^\d.,-]/g, "");
    if (!/\d/.test(s)) return null;
    if (s.startsWith("-")) {
      negative = true;
      s = s.slice(1);
    }
    if (s.includes("-")) return null;

    const hasDot = s.includes(".");
    const hasComma = s.includes(",");
    if (hasDot && hasComma) {
      const decimal = s.lastIndexOf(".") > s.lastIndexOf(",") ? "." : ",";
      const thousands = decimal === "." ? "," : ".";
      s = s.split(thousands).join("").replace(decimal, ".");
    } else if (hasComma) {
      s = /^\d+,\d{1,2}$/.test(s) ? s.replace(",", ".") : s.split(",").join("");
    } else if (hasDot) {
      const parts = s.split(".");
      const isThousands = parts.length > 2 || (parts.length === 2 && parts[1].length === 3 && parts[0].length <= 3);
      if (isThousands) s = parts.join("");
    }
    n = Number(s);
    if (negative) n = -n;
  }
  if (!Number.isFinite(n) || Math.abs(n) >= 1e12) return null;
  return Math.round(n * 100) / 100;
}

const cellText = (c: Cell | undefined) => {
  if (c === null || c === undefined) return null;
  const t = String(c).trim().slice(0, 80);
  return t === "" ? null : t;
};

const shorten = (c: Cell) => String(c).slice(0, 24);
const blankToNull = (c: Cell | undefined): Cell =>
  c === undefined || (typeof c === "string" && c.trim() === "") ? null : c;

// ---------- Validación ----------
export interface ValidRow {
  sheetRow: number;
  date: string;
  amount: number;
  category: string | null;
  region: string | null;
  ref: string | null;
}
export interface RowError {
  sheetRow: number;
  reason: string;
}
export interface ValidationResult {
  total: number;
  valid: ValidRow[];
  errors: RowError[];
}

export function validateRows(parsed: ParsedFile, m: Mapping): ValidationResult {
  const valid: ValidRow[] = [];
  const errors: RowError[] = [];
  let total = 0;

  if (m.fecha === null || m.monto === null) {
    return {
      total: parsed.rows.length,
      valid,
      errors: [{ sheetRow: 0, reason: "Asigna las columnas de fecha y monto." }],
    };
  }

  parsed.rows.forEach((row, i) => {
    total++;
    const sheetRow = i + 2; // contando el encabezado como fila 1
    const rawDate = blankToNull(row[m.fecha!]);
    const rawAmount = blankToNull(row[m.monto!]);

    if (rawDate === null) return void errors.push({ sheetRow, reason: "Fecha vacía" });
    const date = parseDate(rawDate);
    if (!date) return void errors.push({ sheetRow, reason: `Fecha no válida (${shorten(rawDate)})` });

    if (rawAmount === null) return void errors.push({ sheetRow, reason: "Monto vacío" });
    const amount = parseAmount(rawAmount);
    if (amount === null) return void errors.push({ sheetRow, reason: `Monto no válido (${shorten(rawAmount)})` });

    valid.push({
      sheetRow,
      date,
      amount,
      category: m.categoria !== null ? cellText(row[m.categoria]) : null,
      region: m.region !== null ? cellText(row[m.region]) : null,
      ref: m.referencia !== null ? cellText(row[m.referencia]) : null,
    });
  });

  return { total, valid, errors };
}
