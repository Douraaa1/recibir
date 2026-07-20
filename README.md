# enviar-board

A [KratosJs](https://github.com/maxal-studio/kratosjs) admin panel using **SQLite**.

## Getting started

1. Copy the environment file and adjust the database settings:

```bash
cp .env.example .env
```

2. Install dependencies (if you skipped `--install`):

```bash
npm install
```

3. Start the dev server (API + admin client with HMR):

```bash
npm run dev
```

The admin panel will be available at `http://localhost:3000`.

Default login (seeded automatically on first boot):

- **Email:** `admin@example.com`
- **Password:** `password`

## Project structure

```
src/
  index.ts              # Panel definition, ORM config, auth, server bootstrap
  entities/User.ts       # MikroORM entity (driver-agnostic schema)
  resources/UserResource.ts  # Admin resource (form + table) for users
  seedAdminUser.ts       # Seeds the demo admin user on first boot
  admin/main.tsx         # Admin client entry — register plugin client manifests here
  migrations/            # Generated migrations (mikro-orm migration:create)
index.html              # Admin client HTML shell
vite.config.mts         # Admin client Vite config (kratosAdminVite)
```

The database schema is created automatically on first boot via `updateSchema: true`.
When you are ready for versioned migrations, generate them with
`npx mikro-orm migration:create` and register them on the panel.

## Building for production

```bash
npm run build   # compiles the server (tsc) and the admin client (vite build)
npm start       # runs the compiled server with NODE_ENV=production
```

## Deploying to Render

The app runs as a persistent Node process (not serverless), so a "Web Service"
on Render is the right fit — no architecture changes needed. In production it
switches from SQLite to Postgres automatically based on `DATABASE_URL` (see
`src/index.ts`); local dev keeps using SQLite untouched.

### Option A — Blueprint (`render.yaml`)

The repo includes a `render.yaml`. In the Render dashboard: **New → Blueprint**,
point it at this repo. It provisions the web service, a Postgres database, a
1GB disk for uploaded files, and generates `JWT_SECRET` for you. Double-check
the file's field names against Render's current Blueprint docs before relying
on it — their schema evolves and this hasn't been run against a live account.

### Option B — Manual setup

1. **New → Web Service**, connect the repo.
   - Build command: `npm ci && npm run build`
   - Start command: `npm start`
2. **New → PostgreSQL**, create a database. Copy its "Internal Connection
   String" into the web service's `DATABASE_URL` env var.
3. Add a **Disk** to the web service (e.g. 1GB, mount path `/var/data`) —
   this is for uploaded files (profile pictures), not the database. Set env
   var `UPLOADS_PATH=/var/data/uploads`.
4. Env vars to set on the web service:
   - `NODE_ENV=production`
   - `DATABASE_URL` — from step 2
   - `JWT_SECRET` — a real random value (`openssl rand -base64 32`), **not**
     the dev fallback in `.env.example`
   - `UPLOADS_PATH=/var/data/uploads` — from step 3
   - `PORT` is set automatically by Render; don't override it.
5. Deploy. On first boot the schema is created automatically
   (`updateSchema: true`) and the demo admin/agent accounts are seeded — log
   in once and either change that password or delete the account.

### Known gaps to close before handling real money

- No automated backup strategy for the uploads disk (Render backs up the
  Postgres database, not attached disks) — low-stakes today since it only
  holds profile pictures, but worth knowing.
- `JWT_SECRET` and the seeded demo accounts must be rotated/removed for a
  real deployment — nothing enforces this automatically.

## Adding a plugin

Install a KratosJs plugin package, register its server class in `src/index.ts`
via `.plugins([...])`, and (if it ships UI) import its client manifest in
`src/admin/main.tsx`. See the docs for details.
