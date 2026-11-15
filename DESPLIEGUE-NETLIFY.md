# Desplegar Mova en Netlify

Mova usa Next.js con SSR, APIs y PostgreSQL, así que no se puede subir "arrastrando una carpeta" (eso solo funciona para sitios estáticos). Necesitas **2 cosas**: una base de datos PostgreSQL en la nube y el código en GitHub conectado a Netlify.

---

## Paso 1 — Base de datos PostgreSQL gratis (Neon)

1. Entra a **https://neon.tech** → crea cuenta gratis → **New project** (nombre: `mova`).
2. Copia la **connection string** que te da Neon. Se ve así:
   ```
   postgresql://usuario:password@ep-xxxx.us-east-1.aws.neon.tech/mova?sslmode=require
   ```
3. En tu computadora (con Node instalado), dentro de la carpeta del proyecto, crea las tablas ejecutando:
   ```bash
   npm install
   DATABASE_URL="tu-connection-string-de-neon" npx drizzle-kit push
   ```
   (En Windows PowerShell: `$env:DATABASE_URL="tu-url"; npx drizzle-kit push`)

> La cuenta demo (`demo@mova.app` / `movademo`) y sus datos de ejemplo se crean **automáticamente** la primera vez que alguien abre la página o inicia sesión.

## Paso 2 — Subir el código a GitHub

1. Crea un repositorio nuevo en **https://github.com/new** (privado si quieres).
2. Desde la carpeta del proyecto:
   ```bash
   git init
   git add .
   git commit -m "Mova app"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/mova.git
   git push -u origin main
   ```
   > El archivo `.gitignore` ya evita subir tu `.env` y `node_modules`.

## Paso 3 — Conectar con Netlify

1. En **https://app.netlify.com** → **Add new site** → **Import an existing project** → elige **GitHub** y tu repo `mova`.
2. Netlify detecta Next.js automáticamente gracias a `netlify.toml` (ya incluido):
   - Build command: `npm run build`
   - Publish: `.next`
   - Plugin: `@netlify/plugin-nextjs`
3. Antes de dar **Deploy**, abre **Site configuration → Environment variables** y agrega:
   - Clave: `DATABASE_URL`
   - Valor: tu connection string de Neon (del paso 1)
4. Dale **Deploy**. En 2–3 minutos tendrás una URL tipo `https://mova-xyz.netlify.app`.

## Paso 4 — Probar

- Abre la URL desde tu celular o computadora.
- Toca **"Probar demo en vivo"** o entra con `demo@mova.app` / `movademo`.
- En el teléfono: menú del navegador → **"Agregar a pantalla de inicio"** para usarla como app.

---

### Notas rápidas

- Cada `git push` a `main` redespliega sola la app en Netlify.
- Cambios futuros de tablas: repite el comando de `drizzle-kit push` apuntando a Neon.
- Dominio propio: **Domain management** en Netlify (gratis con HTTPS).
- Si el login falla tras desplegar, revisa que `DATABASE_URL` esté bien guardada en Netlify y que hayas corrido el `push` del paso 1.

## Panel de administración

- La app incluye `/admin`: lista de usuarios registrados, su nivel, racha, pasos, minutos, IMC más reciente e historial completo (gráfica de 14 días, movimientos, mediciones, avatares) con opción de eliminar cuentas.
- La cuenta demo (`demo@mova.app`) ya es administradora.
- Para hacerte admin con TU cuenta: regístrate en la app y luego ejecuta en la consola SQL de Neon:
  ```sql
  UPDATE users SET is_admin = true WHERE email = 'tu@correo.com';
  ```
- Vuelve a entrar y verás **Admin** en el menú lateral y **Panel de administración** en tu Perfil.
