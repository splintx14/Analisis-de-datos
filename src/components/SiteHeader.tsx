import "./site.css";
import Link from "next/link";
import Brand from "./Brand";
import SiteNav from "./SiteNav";
import { getSession } from "@/lib/auth";

export default async function SiteHeader() {
  const session = await getSession();

  const actions = session ? (
    <Link href="/resumen" className="btn btn-dark btn-sm">Ir a mi espacio</Link>
  ) : (
    <>
      <Link href="/login" className="link-quiet">Iniciar sesión</Link>
      <Link href="/registro" className="btn btn-outline btn-sm">Crear cuenta</Link>
    </>
  );

  return (
    <header className="site-header">
      <Brand />
      <SiteNav variant="desktop" />
      <div className="site-actions">{actions}</div>

      <details className="mnav">
        <summary aria-label="Abrir menú">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </summary>
        <div className="mnav-panel">
          <SiteNav variant="mobile" />
          <div className="mnav-actions">{actions}</div>
        </div>
      </details>
    </header>
  );
}
