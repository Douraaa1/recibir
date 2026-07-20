# Getting started

## Scaffold a new app

```bash
npx @maxal_studio/kratosjs-cli new my-app --driver mysql --http express   # --driver: postgresql|mariadb|sqlite|mongo · --http: express(default)|fastify|hapi|koa
cd my-app && npm run dev
```

`@maxal_studio/kratosjs-cli` (bin `kratosjs`) is the scaffolder; `@maxal_studio/kratosjs` is the runtime framework. Other CLI commands: `kratosjs plugin <name>` (scaffold a plugin — server + React client by default, `--no-client` for server-only), `kratosjs init` (add the admin client to an existing app). Default login after scaffolding: `admin@example.com` / `password`.

## Project structure

```
src/
├── index.ts              # Panel bootstrap: .orm().resources().pages().plugins().auth().start()
├── admin/main.tsx        # React client entry: mountAdminPanel({ plugins, slots })
├── entities/             # MikroORM EntitySchema definitions
├── resources/            # BaseResource subclasses (one per entity)
├── pages/                # Page subclasses (dashboards, custom pages)
├── hooks/                # ResourceHooks objects
├── actions/             # Action/BulkAction builders + ActionHandler maps
├── cells/                # HTML cell formatters (image + name identity columns)
├── seedAdminUser.ts
└── migrations/
```

This layout (separate `hooks/`, `actions/`, `cells/` directories) is the convention — keep hooks, action handlers, and cell formatters out of the resource file and import them in.

## Panel bootstrap

```ts
import 'dotenv/config';
import path from 'path';
import { Panel, LocalMediaAdapter, EmailAuthProvider } from '@maxal_studio/kratosjs';
import { ExpressAdapter } from '@maxal_studio/kratosjs-express';
import { MySqlDriver } from '@mikro-orm/mysql';
import { Migrator } from '@mikro-orm/migrations';
import { UserResource } from './resources/UserResource';
import { DashboardPage } from './pages/DashboardPage';
import { User } from './entities/User';

const PORT = parseInt(process.env.PORT || '3000');

const adminPanel = Panel.make('admin')
	.title('My App')
	.favicon('/assets/icon.png')
	.icon('/assets/icon.png')
	.httpAdapter(new ExpressAdapter()) // required — the HTTP framework is pluggable
	.orm(
		{
			driver: MySqlDriver,
			host: process.env.DATABASE_HOST,
			port: parseInt(process.env.DATABASE_PORT || '3306'),
			user: process.env.DATABASE_USER,
			password: process.env.DATABASE_PASSWORD,
			dbName: process.env.DATABASE_NAME,
			extensions: [Migrator],
		},
		{ migrate: true, updateSchema: true }, // updateSchema auto-syncs the schema on boot (dev)
	)
	.mediaAdapters([
		new LocalMediaAdapter({
			name: 'local-uploads',
			uploadPath: path.join(process.cwd(), 'uploads'),
			publicUrl: `http://localhost:${PORT}/uploads`,
			createDirectories: true,
			isDefault: true,
		}),
	])
	.resources([UserResource])
	.pages([DashboardPage])
	.plugins([]);

adminPanel.auth({
	jwt: {
		secret: process.env.JWT_SECRET || 'change-me',
		accessTokenExpiry: '15m',
		refreshTokenExpiry: '7d',
	},
	userEntity: User,
	providers: [new EmailAuthProvider()],
});

adminPanel.useStatic('/assets', path.join(process.cwd(), 'assets'));

adminPanel.start(PORT, async () => {
	console.log(`🚀 running on http://localhost:${PORT}`);
});
```

Key `Panel` builder methods: `.title()`, `.favicon()`, `.icon()`, `.httpAdapter(adapter)` (required; `new ExpressAdapter()` from `@maxal_studio/kratosjs-express`), `.orm(config, options)`, `.mediaAdapters([...])`, `.resources([...])`, `.pages([...])`, `.plugins([...])`, `.auth({...})`, `.i18n({...})`, `.useStatic(route, dir)`, `.route(method, path, ...handlers)` (bare public route; handler gets framework-neutral `(req: KratosRequest, reply: KratosReply)` — `reply.json(...)`/`reply.view(...)`, not `res.json(...)`; add `adminRoute(panel)` middleware for a base-path-prefixed + auth-required API route; `.registerRoute(...)` is the deprecated alias for `route(m, p, adminRoute(panel), ...h)`), `.views(config)` (enable SSR public pages), `.http({ bodyLimit, cors })`, `.adminClient(false)` (headless), `.panelPath('/admin')` (serve the admin UI under a sub-path; default `/`; backend-only — no vite.config change needed), `.start(port, onReady)`, `.stop()`. Escape hatch to raw Express: `getExpressApp(panel)` / `panel.getServer<Express>()` (register raw routes before `start()`). Access the ORM/EM at runtime with `panel.getOrm().em.fork()` or `panel.getEm().fork()`.

## Where to go next

Define an entity (`references/entities.md`), then a resource (`references/resources.md`).
