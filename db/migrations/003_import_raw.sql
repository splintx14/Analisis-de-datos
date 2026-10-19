-- Guarda temporalmente el contenido del archivo mientras la importación
-- está pendiente de confirmar. Es seguro ejecutarlo varias veces.
ALTER TABLE imports ADD COLUMN IF NOT EXISTS raw jsonb;
