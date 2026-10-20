import { fmtDate } from "./format";

// Filtros de un reporte. Si trae `dias`, el rango es móvil ("últimos N días").
export interface ReportFilters {
  dias?: number;
  desde?: string;
  hasta?: string;
  categoria?: string;
  region?: string;
}

export interface ResolvedFilters {
  desde: string | null;
  hasta: string | null;
  categoria: string | null;
  region: string | null;
}

export const iso = (d: Date) => d.toISOString().slice(0, 10);
export const daysAgo = (n: number, from: Date = new Date()) =>
  iso(new Date(from.getTime() - n * 86400000));

export function cleanDate(v: string | null | undefined): string | null {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v ? v : null;
}

export function cleanText(v: string | null | undefined): string | null {
  const t = v?.trim().slice(0, 80);
  return t ? t : null;
}

export function cleanDays(v: unknown): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 3650 ? n : null;
}

// Convierte los filtros guardados (posiblemente con rango móvil) en fechas concretas.
export function resolveFilters(f: ReportFilters, now: Date = new Date()): ResolvedFilters {
  const dias = cleanDays(f.dias);
  return {
    desde: dias ? daysAgo(dias, now) : cleanDate(f.desde),
    hasta: dias ? null : cleanDate(f.hasta),
    categoria: cleanText(f.categoria),
    region: cleanText(f.region),
  };
}

export function describeRange(f: ReportFilters): string {
  const dias = cleanDays(f.dias);
  if (dias) return `Últimos ${dias} días`;
  const desde = cleanDate(f.desde);
  const hasta = cleanDate(f.hasta);
  if (desde && hasta) return `Del ${fmtDate(desde)} al ${fmtDate(hasta)}`;
  if (desde) return `Desde el ${fmtDate(desde)}`;
  if (hasta) return `Hasta el ${fmtDate(hasta)}`;
  return "Todo el historial";
}

// Condición SQL común. Parámetros: $1 espacio, $2 desde, $3 hasta, $4 categoría, $5 región.
export const RECORDS_WHERE = `workspace_id = $1
  AND ($2::date IS NULL OR occurred_on >= $2::date)
  AND ($3::date IS NULL OR occurred_on <= $3::date)
  AND ($4::text IS NULL OR category = $4::text)
  AND ($5::text IS NULL OR region = $5::text)`;

export const filterParams = (workspaceId: string, f: ResolvedFilters) => [
  workspaceId,
  f.desde,
  f.hasta,
  f.categoria,
  f.region,
];

// Dirección de exportación con los filtros ya resueltos.
export function exportQuery(f: ResolvedFilters): string {
  const q = new URLSearchParams();
  if (f.desde) q.set("desde", f.desde);
  if (f.hasta) q.set("hasta", f.hasta);
  if (f.categoria) q.set("categoria", f.categoria);
  if (f.region) q.set("region", f.region);
  return q.toString();
}
