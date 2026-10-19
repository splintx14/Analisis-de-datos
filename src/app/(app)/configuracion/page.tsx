import "./settings.css";
import { pool } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import SettingsForm from "./SettingsForm";

export default async function ConfiguracionPage() {
  const session = await requirePermission("settings.manage");

  const { rows } = await pool.query(
    `SELECT name, currency, default_range_days, auto_refresh_minutes
       FROM workspaces WHERE id = $1`,
    [session.workspaceId],
  );
  const ws = rows[0];

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Administración</p>
          <h1>Configuración del espacio</h1>
          <p className="page-sub">Las preferencias que usan los análisis.</p>
        </div>
      </div>

      <section className="card settings-card">
        <p className="card-kicker">Preferencias</p>
        <h2>Espacio de trabajo</h2>
        <SettingsForm
          name={ws.name}
          currency={ws.currency}
          rangeDays={ws.default_range_days}
          refreshMinutes={ws.auto_refresh_minutes}
        />
      </section>
    </>
  );
}
