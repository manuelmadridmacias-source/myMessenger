import { getConnectionString } from '@netlify/database';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: getConnectionString() });

// Mismo self-healing que en enviar-mensaje.mjs: recrea la tabla si hace
// falta, cacheado en memoria del proceso para no repetir la comprobación.
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
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(req.url);
  const usuario = (url.searchParams.get('usuario') || '').trim().slice(0, 40);

  if (!usuario) {
    return new Response(JSON.stringify({ error: 'Falta el parámetro "usuario"' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await asegurarTabla();
    // Se devuelven los mensajes en los que el usuario participa, como
    // remitente o como destinatario (para poder reconstruir la conversación
    // completa con cada contacto, como en WhatsApp/Telegram). Nunca se
    // devuelven mensajes entre otros dos usuarios distintos.
    const { rows } = await pool.query(
      `SELECT id, remitente, destinatario, cuerpo, creado_en
       FROM mensajes
       WHERE remitente = $1 OR destinatario = $1
       ORDER BY creado_en ASC`,
      [usuario]
    );

    return new Response(JSON.stringify(rows), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error al consultar mensajes:', err);
    return new Response(
      JSON.stringify({ error: 'Error interno al consultar mensajes', detalle: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
