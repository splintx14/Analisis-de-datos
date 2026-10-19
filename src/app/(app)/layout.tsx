import "./app.css";
import Sidebar from "@/components/Sidebar";
import { requireSession } from "@/lib/guard";
import { navFor } from "@/lib/permissions";
import { ROLE_LABELS } from "@/lib/roles";
import { logout } from "@/app/actions/auth";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await requireSession();
  const initials = session.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="shell">
      <Sidebar
        groups={navFor(session.role)}
        workspaceName={session.workspaceName}
        userName={session.name}
        roleLabel={ROLE_LABELS[session.role]}
      />

      <div className="shell-main">
        <header className="shell-top">
          <p className="crumbs">
            Espacio de análisis <span>/</span> {session.workspaceName}
          </p>
          <div className="shell-user">
            <span className="avatar" aria-hidden="true">{initials}</span>
            <form action={logout}>
              <button type="submit" className="btn btn-light btn-sm">Cerrar sesión</button>
            </form>
          </div>
        </header>

        <main className="shell-content">{children}</main>
      </div>
    </div>
  );
}
