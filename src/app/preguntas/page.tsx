import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Preguntas frecuentes · data.insights",
  description: "Respuestas a las dudas más comunes sobre data.insights.",
};

export default function PreguntasPage() {
  return (
    <>
      <SiteHeader />

      <main className="site-main">
        <section className="page-hero">
          <p className="eyebrow">Preguntas frecuentes</p>
          <h1 className="grad-text">Lo que suelen preguntarnos.</h1>
          <p className="lead">
            Respuestas rápidas sobre cómo funciona data.insights. Si no encuentras
            la tuya, escríbenos.
          </p>
        </section>

        <div className="faq">
          <details open>
            <summary>¿Qué es data.insights?</summary>
            <div className="answer">
              <p>
                Es un espacio donde cargas los datos de tu negocio y consultas
                ingresos, órdenes y categorías en un resumen con filtros y gráficas.
              </p>
            </div>
          </details>

          <details>
            <summary>¿Qué archivos puedo cargar?</summary>
            <div className="answer">
              <p>
                Archivos de Excel (.xlsx) y CSV. Antes de guardar, revisas cómo se
                asignan las columnas (fecha, monto, categoría, región…).
              </p>
              <p>
                La importación de archivos está en desarrollo. Mientras tanto,
                puedes explorar el panel con datos de ejemplo.
              </p>
            </div>
          </details>

          <details>
            <summary>¿Mis datos son privados?</summary>
            <div className="answer">
              <p>
                Cada espacio de trabajo es independiente: solo las personas con
                acceso ven sus datos. Las contraseñas se guardan cifradas y los
                permisos se comprueban siempre en el servidor.
              </p>
            </div>
          </details>

          <details>
            <summary>¿Puedo dar acceso a mi equipo?</summary>
            <div className="answer">
              <p>Sí. Cada persona tiene un rol que define lo que puede hacer:</p>
              <ul>
                <li><strong>Propietario y Administrador:</strong> gestionan usuarios, configuración e importaciones.</li>
                <li><strong>Analista:</strong> importa datos y consulta los análisis.</li>
                <li><strong>Editor de datos:</strong> sube y corrige registros.</li>
                <li><strong>Lector:</strong> solo consulta el resumen y los registros.</li>
                <li><strong>Invitado:</strong> accede únicamente a lo que se comparta con él.</li>
              </ul>
              <p>Las invitaciones por correo están en desarrollo.</p>
            </div>
          </details>

          <details>
            <summary>¿Cómo me pongo en contacto?</summary>
            <div className="answer">
              <p>
                Usa el <Link href="/contacto"><strong>formulario de contacto</strong></Link> y
                te responderemos por correo.
              </p>
            </div>
          </details>
        </div>

        <section className="cta-card">
          <div>
            <h2>¿Aún tienes dudas?</h2>
            <p>Escríbenos y las resolvemos.</p>
          </div>
          <Link href="/contacto" className="btn btn-dark">Contáctanos</Link>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
