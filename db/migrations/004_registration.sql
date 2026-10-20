-- Datos personales ampliados y validación de empresas repetidas.
-- Es seguro ejecutarlo varias veces.

ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name  text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone      text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS country    char(2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title  text;

ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS name_key   text;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS tax_id     text;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS tax_id_key text;

-- Espacios que ya existían: clave aproximada (sin tildes ni signos).
-- Si dos comparten clave, ninguno la recibe para no bloquear el índice.
UPDATE workspaces w
   SET name_key = k.key
  FROM (
    SELECT id, key, COUNT(*) OVER (PARTITION BY key) AS c
      FROM (
        SELECT id,
               lower(regexp_replace(
                 translate(name, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN'),
                 '[^a-zA-Z0-9]+', '', 'g')) AS key
          FROM workspaces
         WHERE name_key IS NULL
      ) s
  ) k
 WHERE k.id = w.id AND k.c = 1 AND k.key <> '';

CREATE UNIQUE INDEX IF NOT EXISTS workspaces_name_key_idx
  ON workspaces (name_key) WHERE name_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS workspaces_tax_id_key_idx
  ON workspaces (tax_id_key) WHERE tax_id_key IS NOT NULL;
