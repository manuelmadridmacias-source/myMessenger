import { getConnectionString } from '@netlify/database';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: getConnectionString() });

// "Self-healing": si la base de datos se recreó vacía (por ejemplo, borrada
// y vuelta a crear desde el panel sin pasar por un deploy que aplique las
// migraciones), esto crea la tabla al vuelo la primera vez que haga falta.
// Se cachea en memoria del propio proceso para no repetir la comprobación
// en cada petición mientras la función siga "caliente".
let tablaAsegurada = false;
async function asegurarTabla() {
  if (tablaAsegurada) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS mensajes (
      id SERIAL PRIMARY KEY,
      remitente TEXT NOT NULL,
      destinatario TEXT NOT NULL,
      cuerpo TEXT NOT NULL,
      creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  tablaAsegurada = true;
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
    const { rows } = await pool.query(
      'INSERT INTO mensajes (remitente, destinatario, cuerpo) VALUES ($1, $2, $3) RETURNING id, creado_en',
      [remitente, destinatario, cuerpo]
    );

    return new Response(JSON.stringify({ ok: true, id: rows[0].id, creado_en: rows[0].creado_en }), {
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
