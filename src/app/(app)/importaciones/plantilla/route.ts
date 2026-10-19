import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return new Response("No autorizado", { status: 401 });

  const csv =
    "\uFEFFfecha,monto,categoria,region,referencia\n" +
    "2026-01-15,1250.50,Servicios,Norte,PED-0001\n" +
    "2026-01-22,430.00,Software,Sur,PED-0002\n" +
    "2026-02-03,2100.75,Hardware,Este,PED-0003\n" +
    "2026-02-11,89.90,Suscripciones,Oeste,PED-0004\n";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="plantilla-importacion.csv"',
    },
  });
}
