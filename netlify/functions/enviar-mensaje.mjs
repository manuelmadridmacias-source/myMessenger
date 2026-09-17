import { neon } from '@netlify/neon';

// sql() usa automáticamente la variable de entorno NETLIFY_DATABASE_URL
// que Netlify inyecta cuando el sitio tiene una Netlify DB conectada.
const sql = neon();

async function asegurarTabla() {
  await sql`
    CREATE TABLE IF NOT EXISTS mensajes (
      id SERIAL PRIMARY KEY,
      remitente TEXT NOT NULL,
      destinatario TEXT NOT NULL,
      cuerpo TEXT NOT NULL,
      creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
}

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const remitente = (body.de || '').toString().trim().slice(0, 40);
  const destinatario = (body.para || '').toString().trim().slice(0, 40);
  const cuerpo = (body.mensaje || '').toString().trim().slice(0, 1000);

  if (!remitente || !destinatario || !cuerpo) {
    return new Response(
      JSON.stringify({ error: 'Faltan campos: de, para y mensaje son obligatorios' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    await asegurarTabla();
    const [fila] = await sql`
      INSERT INTO mensajes (remitente, destinatario, cuerpo)
      VALUES (${remitente}, ${destinatario}, ${cuerpo})
      RETURNING id, creado_en
    `;

    return new Response(JSON.stringify({ ok: true, id: fila.id, creado_en: fila.creado_en }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error al guardar mensaje:', err);
    return new Response(
      JSON.stringify({ error: 'Error interno al guardar el mensaje', detalle: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
