import "./usuarios.css";
import { pool } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { assignableRoles, canManage } from "@/lib/team";
import { changeRole, removeMember, revokeInvitation } from "./actions";
import InviteForm from "./InviteForm";

export default async function UsuariosPage() {
  const session = await requirePermission("users.manage");

  const [members, invites] = await Promise.all([
    pool.query(
      `SELECT u.id, u.name, u.email, m.role, to_char(m.created_at, 'DD/MM/YYYY') AS since
         FROM memberships m JOIN users u ON u.id = m.user_id
        WHERE m.workspace_id = $1
        ORDER BY m.created_at`,
      [session.workspaceId],
    ),
    pool.query(
      `SELECT id, email, role, to_char(expires_at, 'DD/MM/YYYY') AS expires
         FROM invitations
        WHERE workspace_id = $1 AND accepted_at IS NULL AND expires_at > now()
        ORDER BY created_at DESC`,
      [session.workspaceId],
    ),
  ]);

  const roles = assignableRoles(session.role);
  const roleOptions = roles.map((r) => ({ value: r, label: ROLE_LABELS[r] }));

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Equipo</p>
          <h1>Usuarios y roles</h1>
          <p className="page-sub">Quién tiene acceso a este espacio y con qué permisos.</p>
        </div>
      </div>

      <section className="card">
        <p className="card-kicker">Invitar</p>
        <h2>Añade a alguien a tu equipo</h2>
        <InviteForm roles={roleOptions} />
      </section>

      <section className="card">
        <p className="card-kicker">Equipo</p>
        <h2>Personas con acceso</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Desde</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {members.rows.map((r) => {
                const role = r.role as Role;
                const isMe = r.id === session.userId;
                const manageable = !isMe && canManage(session.role, role);
                return (
                  <tr key={r.id}>
                    <td>
                      {r.name}
                      {isMe && <span className="you">Tú</span>}
                    </td>
                    <td>{r.email}</td>
                    <td>
                      {manageable ? (
                        <form action={changeRole} className="role-form">
                          <input type="hidden" name="userId" value={r.id} />
                          <select name="role" defaultValue={role} aria-label={`Rol de ${r.name}`}>
                            {roles.map((x) => (
                              <option key={x} value={x}>{ROLE_LABELS[x]}</option>
                            ))}
                          </select>
                          <button type="submit" className="btn btn-light btn-xs">Guardar</button>
                        </form>
                      ) : (
                        <span className="chip chip-ok">{ROLE_LABELS[role]}</span>
                      )}
                    </td>
                    <td>{r.since}</td>
                    <td className="actions-cell">
                      {manageable && (
                        <details className="confirm">
                          <summary>Quitar</summary>
                          <div className="confirm-panel">
                            <p>
                              Se eliminará el acceso de <strong>{r.name}</strong> y su cuenta.
                              Esto no se puede deshacer.
                            </p>
                            <form action={removeMember}>
                              <input type="hidden" name="userId" value={r.id} />
                              <button type="submit" className="btn btn-danger btn-xs">Sí, quitar</button>
                            </form>
                          </div>
                        </details>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {invites.rows.length > 0 && (
        <section className="card">
          <p className="card-kicker">Pendientes</p>
          <h2>Invitaciones sin aceptar</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Vence</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {invites.rows.map((i) => (
                  <tr key={i.id}>
                    <td>{i.email}</td>
                    <td><span className="chip chip-warn">{ROLE_LABELS[i.role as Role]}</span></td>
                    <td>{i.expires}</td>
                    <td className="actions-cell">
                      <form action={revokeInvitation}>
                        <input type="hidden" name="id" value={i.id} />
                        <button type="submit" className="btn btn-light btn-xs">Revocar</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="card-foot">
            Por seguridad, el enlace de una invitación solo se muestra al crearla. Si se perdió,
            revócala y crea otra.
          </p>
        </section>
      )}
    </>
  );
}
