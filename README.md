# Mensajero — Demo de Netlify Database

Demo mínima de un mensajero web: cada usuario elige un nombre libremente, envía
mensajes a cualquier otro nombre, y solo ve los mensajes dirigidos a él (con el
nombre de quien los envió). Todo se guarda en **Netlify Database** (Postgres),
y el frontend consulta los mensajes recibidos **cada 5 segundos** (polling) en
lugar de hacerlo en tiempo real, para no saturar la base de datos.

## Estructura

```
mensajero-netlify/
├── netlify.toml                            # config de Netlify + rutas /api/*
├── package.json                            # dependencias @netlify/database y pg
├── public/
│   └── index.html                          # frontend (vanilla JS)
├── netlify/functions/
│   ├── enviar-mensaje.mjs                  # POST /api/enviar
│   ├── obtener-mensajes.mjs                # GET  /api/mensajes?usuario=...
│   └── estado-db.mjs                       # GET  /api/estado (comprobación de conexión)
└── netlify/database/migrations/
    └── 20260101000000_create_mensajes/
        └── migration.sql                   # crea la tabla "mensajes"
```

## Cómo provisionar la base de datos en el sitio

Tienes dos formas, ambas 100% desde el navegador (nada de terminal):

### Opción A — Manualmente desde el panel (recomendada si ya tienes el sitio creado)

1. Entra en tu proyecto en [app.netlify.com](https://app.netlify.com).
2. Ve a **Data & Storage → Database**.
3. Pulsa **Create a database manually**.

Con esto Netlify provisiona la base de datos y las variables de conexión al
instante, sin esperar a un deploy. En el siguiente deploy (o si ya tienes uno
hecho, en el próximo que lances), Netlify detecta la carpeta
`netlify/database/migrations/` de este proyecto y aplica la migración que crea
la tabla `mensajes` automáticamente.

### Opción B — Automática, al desplegar

Como `@netlify/database` ya está en `package.json`, si en vez de la opción A
conectas el repositorio a Netlify y lanzas un deploy (ver más abajo), Netlify
detecta esa dependencia, **provisiona la base de datos por su cuenta durante
el build**, y aplica la migración inicial antes de publicar el sitio. No hace
falta el paso manual de la opción A en ese caso.

> ⚠️ Importante: este proyecto usaba antes `@netlify/neon`, que en la
> documentación actual de Netlify aparece como **extensión "legacy"** (usa una
> variable de entorno distinta, `NETLIFY_DATABASE_URL`, y no se autoprovisiona
> igual que antes). Ya se ha migrado a `@netlify/database` (el paquete
> soportado actualmente, con la variable `NETLIFY_DB_URL`), que es lo que hace
> que la provisión — manual o automática — funcione de verdad.

## Desplegar sin usar la terminal (solo con la web)

1. **Sube el proyecto a GitHub sin usar git en local**:
   - Entra en [github.com](https://github.com) y crea un repositorio nuevo
     (botón **New repository**), vacío, sin README.
   - Dentro del repo recién creado, usa **Add file → Upload files**.
   - Arrastra ahí *todo el contenido* de esta carpeta (`netlify.toml`,
     `package.json`, `README.md`, la carpeta `public/` y la carpeta
     `netlify/` completa, incluyendo `netlify/database/`) y confirma el
     commit.

   > ⚠️ El "arrastrar y soltar" de Netlify Drop **no sirve** para este
   > proyecto: no ejecuta `npm install` ni aplica migraciones, así que nunca
   > se provisionaría la base de datos ni se instalarían las dependencias.

2. **Conecta el repositorio a Netlify**:
   - Entra en [app.netlify.com](https://app.netlify.com) → **Add new project**
     → **Import an existing project**.
   - Elige **GitHub**, autoriza el acceso y selecciona el repositorio.

3. **Configuración de build** (Netlify ya lee `netlify.toml`, pero por si te
   pregunta): Build command **vacío**, Publish directory `public`.

4. **Deploy site**. Netlify instala las dependencias, provisiona la base de
   datos (si no la creaste ya a mano con la Opción A) y aplica la migración
   antes de publicar.

5. **Comprobación**: abre la URL de tu sitio. Nada más cargar, la página
   comprueba la conexión contra `/api/estado` y muestra un aviso verde
   ("Conexión correcta") o uno rojo con el motivo exacto si algo falla. También
   puedes revisar *Data & Storage → Database* para confirmar que la base de
   datos existe y ver sus tablas.

## Diagnóstico: "me da fallo en la consulta y el envío de mensajes"

La página comprueba la conexión a la base de datos **nada más cargar** (llamada
a `/api/estado`) y muestra un aviso arriba de todo con el motivo exacto si algo
falla; ese mismo aviso se reactiva si falla un envío o una consulta mientras
usas la app. Los motivos más comunes:

- **La base de datos no está provisionada todavía.** Usa la Opción A de arriba
  (*Data & Storage → Database → Create a database manually*) o vuelve a
  desplegar el sitio.
- **Se desplegó por "drag & drop"** en vez de conectando un repositorio: ese
  método no instala dependencias ni aplica migraciones.
- **La migración no llegó a aplicarse** (por ejemplo, si subiste el proyecto
  sin la carpeta `netlify/database/migrations/`). Revisa el log del deploy en
  Netlify: ahí se ve si la migración se aplicó o falló.

## Notas de diseño

- No hay autenticación: cualquiera puede ponerse el nombre que quiera (es una
  demo). Para producción real habría que añadir login y no permitir suplantar
  nombres.
- El polling de 5 segundos está en el frontend (`INTERVALO_MS` en
  `public/index.html`); puedes ajustarlo ahí.
- El historial completo de mensajes queda en la tabla `mensajes`, aunque cada
  usuario solo ve los que le fueron dirigidos a él.
- Los campos se limitan en longitud (40 caracteres para nombres, 1000 para el
  mensaje) como protección básica.
