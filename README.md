# WebForge

Stack actual:

- Frontend: React + Vite
- Backend: Node.js + Express
- Base de datos: PostgreSQL + Prisma
- Auth: JWT + verificacion de email obligatoria para login con password
- Deploy: una sola app Node que sirve `dist/` y `/api/*`

## 1) Instalacion

```bash
npm install
```

## 2) Archivos de entorno

Archivos incluidos:

- `.env.example`: desarrollo local
- `.env.production`: bloque listo para `https://getwebforge.com`
- `.env.production.example`: base de produccion
- `.env.production.gmail.example`: produccion con Gmail SMTP
- `.env.production.zoho.example`: produccion con Zoho SMTP
- `.env.production.resend.example`: produccion con Resend SMTP relay

Para desarrollo:

```bash
cp .env.example .env
```

Para produccion puedes partir de `.env.production` o de la variante SMTP que vayas a usar.

`NODE_ENV=production` no se deja dentro de `.env.production` porque Vite muestra warning en el build. Ese valor debe configurarse en el proveedor de hosting.

## 3) Variables realmente usadas por el runtime

Obligatorias al arrancar:

- `DATABASE_URL`
- `JWT_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `MAIL_FROM`
- `CONTACT_TO_EMAIL`

Obligatorias solo si `RECAPTCHA_ENABLED=true`:

- `RECAPTCHA_SECRET_KEY`
- `VITE_RECAPTCHA_SITE_KEY`

Con valor por defecto en codigo:

- `NODE_ENV=development`
- `PORT=8080`
- `APP_ORIGIN=http://localhost:5173`
- `APP_BASE_URL=APP_ORIGIN`
- `JWT_EXPIRES_IN=7d`
- `GOOGLE_CLIENT_ID=`
- `GOOGLE_ANALYTICS_ID=G-0106CF2ZET`
- `AUTH_MAX_FAILED_ATTEMPTS=5`
- `AUTH_LOCKOUT_MINUTES=15`
- `SMTP_SECURE=false`
- `BLOCKED_IPS=`
- `RECAPTCHA_MIN_SCORE=0.5`
- `JOBS_ENABLED=true`
- `JOBS_TIMEZONE=America/Argentina/Buenos_Aires`
- `JOB_PLAN_LIFECYCLE=0 9 * * *`

Nota importante: `PUBLIC_SERVER_URL`, `MOBBEX_*`, `BILLING_*`, jobs legacy y cuentas `SUPER_ADMIN` / `DEV` / `SETTER` / `CLIENT` ya no forman parte del runtime actual.

## 4) Desarrollo

```bash
npm run setup:fresh:dev
npm run dev:full
```

Esto levanta:

- frontend en `http://localhost:5173`
- backend en `http://localhost:8080`

## 5) Base de datos y seed

Instalacion limpia:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

Produccion:

```bash
npm run db:migrate:deploy
npm run db:seed
```

El seed actual solo mantiene una cuenta core real:

- `CEO`

Si no defines `CORE_ACCOUNT_CEO_*`, el codigo cae a estos defaults:

- nombre: `CEOWebForge`
- email: `agustinezequielmoreno@gmail.com`
- password: `gerrero.webforge`

Para produccion conviene definir `CORE_ACCOUNT_CEO_PASSWORD` o `CORE_ACCOUNT_CEO_PASSWORD_HASH` de forma explicita.

## 6) Auth y flujos activos

- El registro publico crea cuentas `LEAD`.
- El login con password exige email verificado.
- Existe `POST /api/auth/resend-verification` para reenviar el correo.
- Las cuentas seed internas quedan verificadas automaticamente.

## 7) Contacto y servicios validos

Endpoint:

- `POST /api/contact`

Servicios validos hoy:

- `design`
- `development`
- `automation-ai`

Payload de ejemplo:

```json
{
  "nombre": "Juan Perez",
  "email": "juan@empresa.com",
  "servicio": "automation-ai",
  "mensaje": "Necesito automatizar procesos y sumar IA.",
  "website": "",
  "recaptchaToken": ""
}
```

## 8) Build y deploy

Build del frontend:

```bash
npm run build
```

Arranque de produccion:

```bash
npm start
```

Express sirve el frontend compilado desde `dist/` cuando `NODE_ENV=production`.

## 9) Providers

### Render

- Archivo: `render.yaml`
- Build: `npm ci && npm run db:generate && npm run build`
- Start: `npm start`
- Dominio configurado: `https://getwebforge.com`
- Despues del primer deploy, correr una sola vez `npm run setup:fresh` desde Shell

### Railway

- Archivo: `Procfile`
- Build: `npm run build`
- Start: `npm start`
- Cargar las mismas variables de `.env.production`
- Antes del primer arranque estable, ejecutar una vez `npm run setup:fresh`

### Fly.io

- Archivos: `fly.toml` y `Dockerfile`
- Cargar las variables equivalentes a `.env.production` con `fly secrets set`
- Despues del primer deploy, ejecutar una vez `npm run setup:fresh`

## 10) Checklist final de 5 minutos para publicar getwebforge.com

1. Confirmar `APP_ORIGIN=https://getwebforge.com` y `APP_BASE_URL=https://getwebforge.com`.
2. Confirmar `TRUST_PROXY=true` en el proveedor final.
3. Verificar que `DATABASE_URL`, `JWT_SECRET`, `SMTP_PASS`, `RECAPTCHA_SECRET_KEY` y `VITE_RECAPTCHA_SITE_KEY` no sigan con placeholders.
4. Verificar que `GOOGLE_ANALYTICS_ID` tenga el ID real de GA4.
5. Confirmar que `GOOGLE_CLIENT_ID` tenga autorizado `https://getwebforge.com` como origen en Google Cloud.
6. Confirmar que reCAPTCHA v3 tenga `getwebforge.com` dado de alta en la consola de Google.
7. Ejecutar `npm run db:migrate:deploy` y `npm run db:seed` contra la base productiva.
8. Ejecutar `npm test` y `npm run build` sin errores.
9. Probar manualmente: registro, email de verificacion, login, solicitud de plan, activacion, portal cliente, creacion y cierre de ticket, formulario de contacto.
10. Revisar que los correos salgan con el remitente esperado y que lleguen a `agustinezequielmoreno@gmail.com`.
