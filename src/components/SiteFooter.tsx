import Link from "next/link";
import Brand from "./Brand";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div className="footer-about">
          <Brand />
          <p>Convierte tus datos en decisiones claras, en un espacio seguro y compartido.</p>
        </div>

        <div>
          <h3>Explorar</h3>
          <ul>
            <li><Link href="/">Inicio</Link></li>
            <li><Link href="/#funciones">Funciones</Link></li>
            <li><Link href="/nosotros">Quiénes somos</Link></li>
            <li><Link href="/preguntas">Preguntas frecuentes</Link></li>
          </ul>
        </div>

        <div>
          <h3>Tu cuenta</h3>
          <ul>
            <li><Link href="/login">Iniciar sesión</Link></li>
            <li><Link href="/registro">Crear cuenta</Link></li>
            <li><Link href="/contacto">Contáctanos</Link></li>
          </ul>
        </div>
      </div>

      <p className="footer-legal">© {new Date().getFullYear()} data.insights. Todos los derechos reservados.</p>
    </footer>
  );
}
