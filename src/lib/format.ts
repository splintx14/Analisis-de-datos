export const nf = new Intl.NumberFormat("es-ES");
export const nf1 = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 });

export const money = (currency: string, n: number) =>
  `${currency} ${nf.format(Math.round(n))}`;

// "2026-03-15" -> "15/03/2026"
export const fmtDate = (iso: string) => iso.split("-").reverse().join("/");
