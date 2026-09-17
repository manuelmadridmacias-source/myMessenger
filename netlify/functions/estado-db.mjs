import { getConnectionString } from '@netlify/database';
import pg from 'pg';

export default async (req) => {
  const cabeceras = { 'Content-Type': 'application/json' };

  let connectionString;
  try {
    connectionString = getConnectionString();
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        error:
          'No hay ninguna base de datos provisionada para este sitio (getConnectionString falló): ' +
          err.message,
      }),
      { status: 200, headers: cabeceras }
    );
  }

  if (!connectionString) {
    return new Response(
      JSON.stringify({
        ok: false,
        error:
          'No existe una base de datos provisionada. Ve a Data & Storage → Database en el panel de Netlify y crea una ("Create a database manually"), o vuelve a desplegar el sitio para que se autoprovisione.',
      }),
      { status: 200, headers: cabeceras }
    );
  }

  const pool = new pg.Pool({ connectionString });
  try {
    await pool.query('SELECT 1');
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: cabeceras });
  } catch (err) {
    console.error('Error de conexión a la base de datos:', err);
    return new Response(
      JSON.stringify({ ok: false, error: err.message || 'Error desconocido al conectar' }),
      { status: 200, headers: cabeceras }
    );
  } finally {
    await pool.end();
  }
};
