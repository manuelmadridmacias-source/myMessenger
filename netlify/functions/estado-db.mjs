import { neon } from '@netlify/neon';

export default async (req) => {
  const cabeceras = { 'Content-Type': 'application/json' };

  if (!process.env.NETLIFY_DATABASE_URL) {
    return new Response(
      JSON.stringify({
        ok: false,
        error:
          'No existe la variable de entorno NETLIFY_DATABASE_URL. La base de datos de Netlify no está provisionada en este sitio.',
      }),
      { status: 200, headers: cabeceras }
    );
  }

  try {
    const sql = neon();
    await sql`SELECT 1`;
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: cabeceras });
  } catch (err) {
    console.error('Error de conexión a la base de datos:', err);
    return new Response(
      JSON.stringify({ ok: false, error: err.message || 'Error desconocido al conectar' }),
      { status: 200, headers: cabeceras }
    );
  }
};
