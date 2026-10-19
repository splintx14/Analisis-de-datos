-- Mensajes del formulario "Contáctanos".
-- Es seguro ejecutarlo varias veces (usa IF NOT EXISTS).

CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS contact_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  email       citext NOT NULL,
  subject     text NOT NULL,
  message     text NOT NULL,
  ip          text,
  read_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contact_messages_ip_idx ON contact_messages (ip, created_at DESC);
CREATE INDEX IF NOT EXISTS contact_messages_email_idx ON contact_messages (email, created_at DESC);
