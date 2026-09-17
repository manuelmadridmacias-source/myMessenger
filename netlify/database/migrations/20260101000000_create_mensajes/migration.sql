CREATE TABLE IF NOT EXISTS mensajes (
  id SERIAL PRIMARY KEY,
  remitente TEXT NOT NULL,
  destinatario TEXT NOT NULL,
  cuerpo TEXT NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
