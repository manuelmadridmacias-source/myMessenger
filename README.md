# Mensajero — Demo de Netlify DB

Demo mínima de un mensajero web: cada usuario elige un nombre libremente, envía
mensajes a cualquier otro nombre, y solo ve los mensajes dirigidos a él (con el
nombre de quien los envió). Todo se guarda en **Netlify DB** (Postgres, con
Neon por debajo), y el frontend consulta los mensajes recibidos **cada 5
segundos** (polling) en lugar de hacerlo en tiempo real, para no saturar la
base de datos.

## Estructura

```
mensajero-netlify/
├── netlify.toml                          # config de Netlify + rutas /api/*
├── package.json                          # dependencia @netlify/neon
├── public/
│   └── index.html                        # frontend (vanilla JS)
└── netlify/functions/
    ├── enviar-mensaje.mjs                # POST /api/enviar
    └── obtener-mensajes.mjs              # GET  /api/mensajes?usuario=...
```

La tabla `mensajes` se crea automáticamente (`CREATE TABLE IF NOT EXISTS`) la
primera vez que se llama a cualquiera de las dos funciones, así que no hace
falta ejecutar SQL a mano.

## Desplegar sin usar la terminal (solo con la web)

Este método usa únicamente el navegador: subes el código a GitHub desde su
web, y conectas ese repositorio a Netlify desde su web. Al conectar un
repositorio, Netlify **construye** el sitio en sus servidores, y ese paso de
construcción es el que detecta `@netlify/neon` en `package.json` y
autoprovisiona la base de datos — igual que haría `netlify dev` en local.

> ⚠️ El "arrastrar y soltar" (Netlify Drop) **no sirve** para este proyecto:
> ese método solo sube archivos estáticos sin ejecutar `npm install`, así que
> nunca detectaría la dependencia ni crearía la base de datos.

1. **Sube el proyecto a GitHub sin usar git en local**:
   - Entra en [github.com](https://github.com) y crea un repositorio nuevo
     (botón **New repository**), vacío, sin README.
   - Dentro del repo recién creado, usa **Add file → Upload files**.
   - Arrastra ahí *todo el contenido* de esta carpeta (`netlify.toml`,
     `package.json`, `README.md`, la carpeta `public/` y la carpeta
     `netlify/`) y confirma el commit. GitHub permite subir carpetas
     completas desde el navegador.

2. **Conecta el repositorio a Netlify**:
   - Entra en [app.netlify.com](https://app.netlify.com) → **Add new project**
     → **Import an existing project**.
   - Elige **GitHub**, autoriza el acceso y selecciona el repositorio que
     acabas de crear.

3. **Configuración de build** (Netlify ya lee `netlify.toml`, pero por si te
   pregunta):
   - Build command: déjalo **vacío**.
   - Publish directory: `public`.
   - (Las funciones se detectan solas gracias a `functions = "netlify/functions"`
     en `netlify.toml`.)

4. **Deploy site**. Netlify instalará las dependencias (`@netlify/neon`
   incluida) y, durante ese primer build, provisionará automáticamente la
   base de datos y la variable `NETLIFY_DATABASE_URL`.

5. **Comprobación opcional**: en el panel del sitio ve a
   *Site configuration → Environment variables* y confirma que aparece
   `NETLIFY_DATABASE_URL`. Si está ahí, la base de datos ya existe y el
   mensajero funcionará en la URL que Netlify te asigne.

A partir de aquí, cualquier cambio que subas a ese repositorio de GitHub
(también desde la web, con "Edit" o "Upload files") volverá a desplegar el
sitio automáticamente.

## Desplegar con la CLI (alternativa local)

1. **Instalar dependencias** dentro de la carpeta del proyecto:
   ```bash
   npm install
   ```

2. **Instalar la CLI de Netlify** si no la tienes:
   ```bash
   npm install -g netlify-cli
   netlify login
   ```

3. **Vincular o crear el sitio**:
   ```bash
   netlify init
   ```

4. **Probar en local**:
   ```bash
   netlify dev
   ```
   Como `@netlify/neon` ya está en `package.json`, la CLI detecta la
   dependencia y **provisiona la base de datos automáticamente** (crea la
   Neon DB y la variable `NETLIFY_DATABASE_URL`) en este mismo paso — no hace
   falta ejecutar `netlify db init` a mano.

   Abre la URL local que indique la CLI. Abre dos pestañas o dos navegadores,
   entra con dos nombres distintos y envía mensajes entre ellos.

5. **Desplegar a producción**:
   ```bash
   netlify deploy --prod
   ```
   Si en vez de `netlify deploy` conectas el repositorio por Git, el primer
   `push` que dispare un build en Netlify también provisionará la base de
   datos solo, por la misma detección automática.

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
