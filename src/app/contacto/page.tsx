import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "Contáctanos · data.insights",
  description: "Escríbenos y te respondemos por correo.",
};

export default function ContactoPage() {
  return (
    <>
      <SiteHeader />

      <main className="site-main">
        <section className="page-hero">
          <p className="eyebrow">Contáctanos</p>
          <h1 className="grad-text">Hablemos de tus datos.</h1>
          <p className="lead">
            Cuéntanos qué necesitas: una duda, un problema o una idea. Te
            responderemos por correo.
          </p>
        </section>

        <div className="contact-layout">
          <section className="contact-card">
            <h2>Envíanos un mensaje</h2>
            <ContactForm />
          </section>

          <aside className="contact-card">
            <h2>Antes de escribir</h2>
            <p className="muted">
              Es posible que tu duda ya esté resuelta en las preguntas frecuentes.
            </p>
            <p className="muted">
              Para que podamos ayudarte mejor, incluye en el mensaje qué estabas
              intentando hacer y qué viste en pantalla.
            </p>
          </aside>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
