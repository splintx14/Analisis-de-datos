import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Quiénes somos · data.insights",
  description: "Qué es data.insights y cómo pensamos el análisis de datos.",
};

const PRINCIPLES = [
  {
    title: "Claridad primero",
    text: "Un buen análisis se entiende de un vistazo. Priorizamos pocas cifras bien explicadas sobre paneles llenos de ruido.",
  },
  {
    title: "Tus datos son tuyos",
    text: "Cada espacio de trabajo es independiente. Solo las personas con acceso ven la información, y cada una ve lo que su rol permite.",
  },
  {
    title: "Pensado para equipos",
    text: "Quien carga los datos, quien los analiza y quien solo necesita consultarlos trabajan sobre la misma fuente, con permisos distintos.",
  },
];

export default function NosotrosPage() {
  return (
    <>
      <SiteHeader />

      <main className="site-main">
        <section className="page-hero">
          <p className="eyebrow">Quiénes somos</p>
          <h1 className="grad-text">Hacemos que los datos se entiendan.</h1>
          <p className="lead">
            data.insights es un espacio para cargar los datos de tu negocio,
            ordenarlos y convertirlos en una lectura clara de lo que está pasando.
          </p>
        </section>

        <section className="info-card story">
          <h2>Nuestra misión</h2>
          <p>
            Muchos equipos guardan sus ventas y registros en hojas de cálculo
            dispersas. Sacar conclusiones de ahí toma tiempo y depende de quién
            tenga la versión correcta del archivo.
          </p>
          <p>
            Queremos que cualquier persona pueda subir su Excel, ver sus ingresos
            y órdenes en gráficas claras y compartirlas con su equipo, sin montar
            infraestructura ni aprender una herramienta compleja.
          </p>
        </section>

        <div className="info-grid">
          {PRINCIPLES.map((p) => (
            <article key={p.title} className="info-card">
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </article>
          ))}
        </div>

        <section className="cta-card">
          <div>
            <h2>¿Quieres saber más?</h2>
            <p>Cuéntanos qué necesitas y te respondemos por correo.</p>
          </div>
          <Link href="/contacto" className="btn btn-dark">Contáctanos</Link>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
