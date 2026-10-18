# Entorno de desarrollo

Objetivo: probar cambios (incluidas migraciones de BBDD) sin tocar producción.

| | Producción | Desarrollo |
|---|---|---|
| Backend | Render (`.env` / variables de Render) | `npm run start:dev` (lee `.env.development`) |
| BBDD | Neon/Postgres de producción | Postgres local en Docker (`localhost:5433`) |
| App | `flutter run` (por defecto) | `flutter run --dart-define=API_BASE_URL=...` |

## Primera vez

```bash
cp .env.development.example .env.development   # y rellena claves (Discogs, Firebase...)
npm run db:up        # Postgres local
npm run db:migrate   # aplica todas las migraciones a la BBDD local
npm run start:dev    # API en http://localhost:3000 (Swagger en /api)
```

Requiere Node >= 20.6 (usa `node --env-file`) y Docker.

## Día a día

- `npm run db:migrate -- --name mi_cambio` → crea/aplica una migración **en local**.
- `npm run db:reset` → vacía y recrea la BBDD local.
- `npm run db:studio` → explorar la BBDD local.
- Las migraciones se llevan a producción con `prisma migrate deploy` (ya está en `npm run build`
  de Render) al hacer merge a `main`. Nunca ejecutes `migrate dev`/`reset` con el `.env` de producción.

## Alternativa sin Docker

Crea una rama (branch) en Neon y pon su cadena en `DATABASE_URL` de `.env.development`.

## Conectar la app

- Emulador Android: `--dart-define=API_BASE_URL=http://10.0.2.2:3000`
- iOS simulator / escritorio / web: `http://localhost:3000`
- Móvil físico: `http://<IP-de-tu-PC>:3000` (misma Wi-Fi)

En VS Code hay configuraciones listas en `.vscode/launch.json` de la app. Android en debug
permite `http://` (cleartext) solo en el manifest de debug.

## Discogs

Token personal en https://www.discogs.com/settings/developers → `DISCOGS_TOKEN`
(también hay que añadirlo en las variables de entorno de Render para producción).
