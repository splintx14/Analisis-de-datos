// Celda de texto para CSV. Además de escapar comas y comillas, neutraliza las
// celdas que empiezan con = + - @ para que Excel no las ejecute como fórmula.
export function csvText(v: string | null | undefined): string {
  let s = v ?? "";
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
