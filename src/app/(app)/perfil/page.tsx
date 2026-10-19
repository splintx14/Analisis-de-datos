import { requireSession } from "@/lib/guard";
import { PERMISSION_LABELS, permissionsOf } from "@/lib/permissions";
import { ROLE_LABELS } from "@/lib/roles";

export default async function PerfilPage() {
  const session = await requireSession();
  const perms = permissionsOf(session.role);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Cuenta</p>
          <h1>Mi perfil</h1>
          <p className="page-sub">Tus datos y lo que puedes hacer en este espacio.</p>
        </div>
      </div>

      <div className="dash-two">
        <section className="card">
          <p className="card-kicker">Datos</p>
          <h2>{session.name}</h2>
          <dl className="facts-list">
            <div><dt>Correo</dt><dd>{session.email}</dd></div>
            <div><dt>Espacio de trabajo</dt><dd>{session.workspaceName}</dd></div>
            <div><dt>Rol</dt><dd>{ROLE_LABELS[session.role]}</dd></div>
          </dl>
        </section>

        <section className="card">
          <p className="card-kicker">Permisos</p>
          <h2>Lo que puede hacer tu rol</h2>
          {perms.length === 0 ? (
            <p className="muted">
              Como invitado solo accederás a los reportes que compartan contigo.
            </p>
          ) : (
            <ul className="perm-list">
              {perms.map((p) => (
                <li key={p}>{PERMISSION_LABELS[p]}</li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
