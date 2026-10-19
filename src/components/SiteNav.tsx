"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/#funciones", label: "Funciones" },
  { href: "/nosotros", label: "Quiénes somos" },
  { href: "/preguntas", label: "Preguntas" },
  { href: "/contacto", label: "Contáctanos" },
];

export default function SiteNav({ variant }: { variant: "desktop" | "mobile" }) {
  const pathname = usePathname();

  return (
    <nav className={`site-nav site-nav-${variant}`} aria-label="Navegación del sitio">
      {LINKS.map((l) => {
        const active = l.href === "/" ? pathname === "/" : !l.href.includes("#") && pathname.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
