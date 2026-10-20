import "./perfil.css";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth";
import { pool } from "@/lib/db";
import { requireSession } from "@/lib/guard";
import { PERMISSION_LABELS, permissionsOf } from "@/lib/permissions";
import { ROLE_LABELS } from "@/lib/roles";
import { hashToken } from "@/lib/token";
import { describeDevice } from "@/lib/user-agent";
import { revokeOtherSessions, revokeSession } from "./actions";
import NameForm from "./NameForm";
import PasswordForm from "./PasswordForm";

export default async function PerfilPage() {
  const session = await requireSession();
  const perms = permissionsOf(session.role);

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const currentHash = token ? hashToken(token) : "";

  const { rows: sessions } = await pool.query(
    `SELECT id, token_hash, ip, user_agent, to_char(created_at, 'DD/MM/YYYY') AS created
       FROM sessions
      WHERE user_id = $1 AND expires_at > now()
      ORDER BY created_at DESC`,
    [session.userId],
  );
  const hasOthers = sessions.some((s) => s.token_hash !== currentHash);

  const extraRes = await pool.query(
    "SELECT first_name, last_name, phone, country, job_title FROM users WHERE id = $1",
    [session.userId],
  );
  const extra = extraRes.rows[0] ?? {};
  const [fallbackFirst, ...fallbackRest] = session.name.split(" ");

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Cuenta</p>
          <h1>Mi perfil</h1>
          <p className="page-sub">Tus datos, tu seguridad y lo que puedes hacer en este espacio.</p>
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
            <p className="muted">Como invitado solo accederás a los reportes que compartan contigo.</p>
          ) : (
            <ul className="perm-list">
              {perms.map((p) => (
                <li key={p}>{PERMISSION_LABELS[p]}</li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="dash-two">
        <section className="card">
          <p className="card-kicker">Editar</p>
          <h2>Tus datos personales</h2>
          <NameForm
            firstName={extra.first_name ?? fallbackFirst}
            lastName={extra.last_name ?? fallbackRest.join(" ")}
            phone={extra.phone ?? ""}
            country={(extra.country ?? "").trim()}
            jobTitle={extra.job_title ?? ""}
          />
        </section>

        <section className="card">
          <p className="card-kicker">Seguridad</p>
          <h2>Cambiar contraseña</h2>
          <PasswordForm />
        </section>
      </div>

      <section className="card">
        <div className="session-head">
          <div>
            <p className="card-kicker">Seguridad</p>
            <h2>Sesiones activas</h2>
          </div>
          {hasOthers && (
            <form action={revokeOtherSessions}>
              <button type="submit" className="btn btn-light btn-sm">Cerrar las demás sesiones</button>
            </form>
          )}
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Dispositivo</th>
                <th>Dirección IP</th>
                <th>Iniciada</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => {
                const isCurrent = s.token_hash === currentHash;
                return (
                  <tr key={s.id}>
                    <td>
                      {describeDevice(s.user_agent)}
                      {isCurrent && <span className="this-device" style={{ marginLeft: 8 }}>Este dispositivo</span>}
                    </td>
                    <td>{s.ip ?? "—"}</td>
                    <td>{s.created}</td>
                    <td className="actions-cell">
                      {!isCurrent && (
                        <form action={revokeSession}>
                          <input type="hidden" name="id" value={s.id} />
                          <button type="submit" className="btn btn-light btn-xs">Cerrar</button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="card-foot">
          Si no reconoces alguna sesión, ciérrala y cambia tu contraseña.
        </p>
      </section>
    </>
  );
}
