-- data.insights · esquema inicial de PostgreSQL
-- Multi-espacio: cada dato pertenece a un espacio (workspace) y cada usuario
-- accede a uno o más espacios mediante una membresía con un rol.

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;    -- emails sin distinguir mayúsculas

-- ---------- Tipos ----------
CREATE TYPE workspace_role AS ENUM (
  'owner',        -- Propietario: todo, incluida facturación y eliminar el espacio
  'admin',        -- Administrador: usuarios, roles, configuración, importaciones
  'analyst',      -- Analista: importar, crear/guardar reportes, exportar
  'data_editor',  -- Editor de datos: subir y corregir registros
  'viewer',       -- Lector: solo ver dashboards y reportes
  'guest'         -- Invitado: solo reportes compartidos con él
);

CREATE TYPE import_status AS ENUM (
  'pending', 'processing', 'completed', 'failed', 'reverted'
);

-- ---------- Usuarios y sesiones ----------
CREATE TABLE users (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email                 citext NOT NULL UNIQUE,
  name                  text NOT NULL,
  password_hash         text NOT NULL,              -- argon2, nunca la clave en texto
  email_verified_at     timestamptz,
  failed_login_attempts integer NOT NULL DEFAULT 0,
  locked_until          timestamptz,                -- bloqueo temporal por intentos fallidos
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  text NOT NULL UNIQUE,                 -- se guarda el hash, no el token
  ip          text,
  user_agent  text,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_idx ON sessions (user_id);

-- ---------- Espacios, membresías e invitaciones ----------
CREATE TABLE workspaces (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  text NOT NULL,
  currency              char(3) NOT NULL DEFAULT 'USD',
  default_range_days    integer NOT NULL DEFAULT 90 CHECK (default_range_days > 0),
  auto_refresh_minutes  integer NOT NULL DEFAULT 5 CHECK (auto_refresh_minutes >= 0),
  created_by            uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE memberships (
  workspace_id  uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role          workspace_role NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);
CREATE INDEX memberships_user_idx ON memberships (user_id);

CREATE TABLE invitations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email         citext NOT NULL,
  role          workspace_role NOT NULL,
  token_hash    text NOT NULL UNIQUE,
  invited_by    uuid REFERENCES users(id) ON DELETE SET NULL,
  expires_at    timestamptz NOT NULL,
  accepted_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX invitations_workspace_idx ON invitations (workspace_id);

-- ---------- Importaciones y registros ----------
CREATE TABLE imports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  uploaded_by     uuid REFERENCES users(id) ON DELETE SET NULL,
  filename        text NOT NULL,
  status          import_status NOT NULL DEFAULT 'pending',
  total_rows      integer NOT NULL DEFAULT 0,
  valid_rows      integer NOT NULL DEFAULT 0,
  error_rows      integer NOT NULL DEFAULT 0,
  column_mapping  jsonb NOT NULL DEFAULT '{}',      -- columna del Excel -> campo
  error_report    jsonb NOT NULL DEFAULT '[]',      -- filas inválidas y motivo
  created_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz,
  reverted_at     timestamptz
);
CREATE INDEX imports_workspace_idx ON imports (workspace_id, created_at DESC);

CREATE TABLE records (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  workspace_id  uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  import_id     uuid REFERENCES imports(id) ON DELETE CASCADE,  -- revertir = borrar la importación
  occurred_on   date NOT NULL,
  amount        numeric(14,2) NOT NULL,
  category      text,
  region        text,
  order_ref     text,
  extra         jsonb NOT NULL DEFAULT '{}',        -- columnas adicionales del Excel
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX records_workspace_date_idx ON records (workspace_id, occurred_on);
CREATE INDEX records_workspace_category_idx ON records (workspace_id, category);
CREATE INDEX records_workspace_region_idx ON records (workspace_id, region);
CREATE INDEX records_import_idx ON records (import_id);

-- ---------- Reportes y auditoría ----------
CREATE TABLE saved_reports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by    uuid REFERENCES users(id) ON DELETE SET NULL,
  name          text NOT NULL,
  filters       jsonb NOT NULL DEFAULT '{}',
  is_shared     boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX saved_reports_workspace_idx ON saved_reports (workspace_id);

CREATE TABLE audit_log (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  workspace_id  uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES users(id) ON DELETE SET NULL,
  action        text NOT NULL,                      -- ej. 'import.created', 'member.role_changed'
  entity        text,
  entity_id     text,
  metadata      jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_workspace_idx ON audit_log (workspace_id, created_at DESC);
