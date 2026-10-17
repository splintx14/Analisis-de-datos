import Link from "next/link";
import { redirect } from "next/navigation";
import Brand from "@/components/Brand";
import Network from "@/components/Network";
import PreviewDashboard from "@/components/PreviewDashboard";
import { getSession } from "@/lib/auth";

const POINTS = [
  {
    title: "Importa tu Excel",
    text: "Sube archivos .xlsx o .csv, revisa cómo se asignan las columnas y confirma antes de guardar.",
  },
  {
    title: "Cada quien ve lo suyo",
    text: "Los datos pertenecen a tu espacio de trabajo y cada rol accede solo a lo que necesita.",
  },
  {
    title: "Decide con claridad",
    text: "Ingresos, órdenes y categorías en un solo resumen, con filtros por fecha, categoría y región.",
  },
];

export default async function Home() {
  const session = await getSession();
  if (session) redirect("/resumen");

  return (
    <>
      <header className="topbar">
        <Brand />
        <nav className="topbar-actions">
          <Link href="/login" className="link-quiet">Iniciar sesión</Link>
          <Link href="/registro" className="btn btn-outline btn-sm">Crear cuenta</Link>
        </nav>
      </header>

      <main>
        <div className="hero">
          <div className="hero-copy">
            <Network />
            <div className="hero-text">
              <p className="eyebrow">Espacio de análisis</p>
              <h1>Convierte tus datos en decisiones claras.</h1>
              <p className="lead">
                Carga tus archivos, normaliza los registros y consulta el
                rendimiento de tu negocio en un espacio seguro y compartido.
              </p>
              <div className="hero-actions">
                <Link href="/registro" className="btn btn-dark">Comenzar ahora</Link>
                <Link href="/login" className="btn btn-light">Ya tengo una cuenta</Link>
              </div>
            </div>
          </div>

          <PreviewDashboard />
        </div>

        <ul className="points">
          {POINTS.map((p) => (
            <li key={p.title}>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
