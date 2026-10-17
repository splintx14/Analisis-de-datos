import { redirect } from "next/navigation";
import Brand from "@/components/Brand";
import { getSession } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/roles";
import { logout } from "../actions/auth";

export default async function ResumenPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <>
      <header className="topbar">
        <Brand />
        <form action={logout}>
          <button type="submit" className="btn btn-light btn-sm">Cerrar sesión</button>
        </form>
      </header>

      <main className="page">
        <p className="eyebrow">Espacio de análisis</p>
        <h1>Hola, {session.name}.</h1>

        <dl className="facts">
          <div>
            <dt>Espacio de trabajo</dt>
            <dd>{session.workspaceName}</dd>
          </div>
          <div>
            <dt>Tu rol</dt>
            <dd>{ROLE_LABELS[session.role]}</dd>
          </div>
          <div>
            <dt>Correo</dt>
            <dd>{session.email}</dd>
          </div>
        </dl>

        <p className="muted">
          Tu cuenta funciona. Aquí irá el dashboard con tus datos cuando
          completemos la importación de Excel.
        </p>
      </main>
    </>
  );
}
