import 'dotenv/config';
import path from 'path';
import { Panel, LocalMediaAdapter, EmailAuthProvider } from '@maxal_studio/kratosjs';
import { ExpressAdapter } from '@maxal_studio/kratosjs-express';
import { TwoFactorPlugin } from '@maxal_studio/kratosjs-plugin-2fa';
import { SqliteDriver } from '@mikro-orm/sqlite';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { Migrator } from '@mikro-orm/migrations';
import { UserResource } from './resources/UserResource';
import { TransactionResource } from './resources/TransactionResource';
import { SettingResource } from './resources/SettingResource';
import { ExchangeRateResource } from './resources/ExchangeRateResource';
import { DashboardPage } from './pages/DashboardPage';
import { ReportsPage } from './pages/ReportsPage';
import { User } from './entities/User';
import { seedAdminUser } from './seedAdminUser';
import { seedSettings } from './seedSettings';
import { seedExchangeRates } from './seedExchangeRates';
import { sessionTimeoutMiddleware } from './middleware/sessionTimeout';

// Nav items that only make sense for the admin/manager role — hidden from
// agents via the metadata filter hook registered below.
const ADMIN_ONLY_RESOURCE_SLUGS = ['users', 'settings', 'exchange-rates'];
const ADMIN_ONLY_PAGE_SLUGS = ['reports'];
// Actions on the Transactions table that only the admin may run — agents can
// initiate transfers but only the admin validates the payout or cancels it.
const ADMIN_ONLY_ACTIONS = ['validate', 'cancel'];

const PORT = parseInt(process.env.PORT || '3000');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
// UPLOADS_PATH lets production point this at a mounted persistent disk
// (e.g. Render Disks) instead of the app's ephemeral local folder.
const uploadsPath = process.env.UPLOADS_PATH || path.join(process.cwd(), 'uploads');
const assetsPath = path.join(process.cwd(), 'assets');
// Render sets RENDER_EXTERNAL_URL automatically; PUBLIC_URL is the manual
// override (e.g. behind a custom domain). Falls back to localhost in dev.
const publicUrl = process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;

// Postgres in production (Render sets DATABASE_URL on the managed database),
// SQLite locally for zero-setup dev. Entities are driver-agnostic (plain
// MikroORM property types, no raw SQL), so nothing else needs to change.
const ormConfig = process.env.DATABASE_URL
	? { driver: PostgreSqlDriver, clientUrl: process.env.DATABASE_URL, extensions: [Migrator] }
	: {
			driver: SqliteDriver,
			dbName: process.env.DATABASE_NAME || 'kratosjs.sqlite',
			extensions: [Migrator],
		};

const adminPanel = Panel.make('admin')
	.title('RECIBIR')
	.favicon('/assets/icon.png')
	.icon('/assets/icon.png')
	// The HTTP framework is pluggable (Express (default)).
	.httpAdapter(new ExpressAdapter())
	// The admin UI mounts at '/admin', leaving '/' free for your server-rendered
	// front end (see the Views section below). Set it back to '/' for an admin-only app.
	.panelPath('/admin')
	.orm(
		ormConfig as any,
		// migrate:false — the 2fa plugin's bundled migration is hardcoded MySQL DDL
		// (auto_increment/unsigned/tinyint) and breaks on non-MySQL drivers;
		// updateSchema alone still creates its table correctly via the registered
		// entity. This project has no real migrations of its own yet either way.
		{ migrate: false, updateSchema: true },
	)
	.mediaAdapters([
		new LocalMediaAdapter({
			name: 'local-uploads',
			uploadPath: uploadsPath,
			publicUrl: `${publicUrl}/uploads`,
			createDirectories: true,
			isDefault: true,
		}),
	])
	.resources([UserResource, TransactionResource, SettingResource, ExchangeRateResource])
	.pages([DashboardPage, ReportsPage])
	.plugins([new TwoFactorPlugin({ issuer: 'RECIBIR' })]);

// --- Admin vs Agent layout ---------------------------------------------
// RECIBIR has exactly two roles (see the User entity's `role` column).
// Rather than pulling in the full permissions plugin (built for many roles +
// configurable permission sets), the two-role split is wired directly with
// the panel's low-level filter/access hooks.

// Hide admin-only nav entries (e.g. "Collaborateurs") from agents. Still
// enforced server-side by the hooks below — this only controls the sidebar.
adminPanel.registerMetadataFilterHook((metadata, user) => {
	if (user?.role === 'admin') return metadata;
	metadata.resources = metadata.resources.map(r =>
		ADMIN_ONLY_RESOURCE_SLUGS.includes(r.slug) ? { ...r, hidden: true } : r,
	);
	metadata.pages = metadata.pages.map(p =>
		ADMIN_ONLY_PAGE_SLUGS.includes(p.slug) ? { ...p, hidden: true } : p,
	);
	return metadata;
});

// Server-side guard matching the sidebar restriction above — blocks an agent
// from loading Rapports directly by URL, not just hiding the nav entry.
adminPanel.registerPageAccessCheckHook((pageSlug, user) => {
	if (ADMIN_ONLY_PAGE_SLUGS.includes(pageSlug)) {
		return user?.role === 'admin';
	}
	return true;
});

// Strip the "Valider" / "Annuler" row actions from the Transactions table for
// agents — they can create and view transfers, but only the admin decides
// whether a transfer completes or gets cancelled.
adminPanel.registerTableSchemaFilterHook((schema, resourceSlug, user) => {
	if (resourceSlug === 'transactions' && user?.role !== 'admin' && schema.actions) {
		schema.actions = schema.actions.filter((a: { name: string }) => !ADMIN_ONLY_ACTIONS.includes(a.name));
	}
	return schema;
});

// Server-side guard matching the UI restriction above (never trust the client).
adminPanel.registerActionAccessCheckHook((actionName, resourceSlug, user) => {
	if (resourceSlug === 'transactions' && ADMIN_ONLY_ACTIONS.includes(actionName)) {
		return user?.role === 'admin';
	}
	return true;
});

// The Dashboard page embeds the Transactions table directly (TableBlock.make),
// which bypasses the table-schema endpoint the hook above filters — strip the
// same actions here so agents don't see "Valider"/"Annuler" on the dashboard either.
adminPanel.registerPageBlocksFilterHook((blocks, _pageSlug, user) => {
	if (user?.role === 'admin') return blocks;
	for (const block of blocks) {
		if (block.type === 'table' && block.table?.actions) {
			block.table.actions = block.table.actions.filter(
				(a: { name: string }) => !ADMIN_ONLY_ACTIONS.includes(a.name),
			);
		}
	}
	return blocks;
});

// Multilingual support (optional). This is the single source of truth for
// languages — the admin client auto-configures itself from what you register here.
//
// adminPanel
// 	.i18n({ locales: ['en', 'sq'], defaultLocale: 'en', fallbackLocale: 'en' })
// 	.registerTranslations('app', {
// 		en: { 'users.label': 'Users' },
// 		sq: { 'users.label': 'Përdoruesit' },
// 	});

// Email/password login. With `userEntity` set, `validateCredentials` and `getUserById`
// are provided by default (look up the user, verify the password). Providers return the
// raw user entity; a single `serializeUser` shapes it for the client across every provider
// and endpoint — set it to expose extra columns. Map non-standard field names with `userFields`.
adminPanel.auth({
	jwt: {
		secret: JWT_SECRET,
		accessTokenExpiry: '15m',
		refreshTokenExpiry: '7d',
	},
	userEntity: User,
	providers: [new EmailAuthProvider()],
	// `role` drives the Admin/Agent split (sidebar visibility, validation
	// actions, caisse scoping) — see the filter hooks registered below.
	extendUser: user => ({ role: user.role }),
});

// Idle-session timeout, configurable by the admin (Paramètres → Sécurité)
// without a restart — see src/middleware/sessionTimeout.ts for why this
// can't just be `accessTokenExpiry`.
adminPanel.middleware([sessionTimeoutMiddleware(adminPanel, JWT_SECRET)]);

// Serve static assets (including panel icon)
adminPanel.useStatic('/assets', assetsPath);
// Serve uploaded media (profile pictures, etc.) at the path LocalMediaAdapter's
// publicUrl points to — the adapter stores/deletes files but doesn't serve them.
adminPanel.useStatic('/uploads', uploadsPath);

// Server-rendered front page at '/'. The handler returns `reply.view(component, props)`;
// the React component lives in src/views/pages/Home.tsx. Add more public pages with
// `adminPanel.route('get', '/path', (req, reply) => reply.view('Name', props))`.
adminPanel.route('get', '/', (_req, reply) =>
	reply.view('Home', {
		title: 'RECIBIR',
		adminUrl: adminPanel.getPanelPath(),
		renderedAt: new Date().toISOString(),
	}),
);

adminPanel
	.start(PORT, async () => {
		await seedAdminUser(adminPanel);
		await seedSettings(adminPanel);
		await seedExchangeRates(adminPanel);
		console.log(`🚀 RECIBIR running on http://localhost:${PORT}`);
		console.log(`🏠 Landing page: http://localhost:${PORT}/`);
		console.log(`📊 Admin Panel: http://localhost:${PORT}${adminPanel.getPanelPath()}`);
		console.log('🔐 Login: admin@example.com / password');
	})
	.catch((error: unknown) => {
		console.error('Failed to start panel:', error);
		process.exit(1);
	});
