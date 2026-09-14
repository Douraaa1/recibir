import 'dotenv/config';
import path from 'path';
import { Panel, LocalMediaAdapter, EmailAuthProvider } from '@maxal_studio/kratosjs';
import { ExpressAdapter } from '@maxal_studio/kratosjs-express';
import { TwoFactorPlugin } from '@maxal_studio/kratosjs-plugin-2fa';
import { CsvExportPlugin } from '@maxal_studio/kratosjs-plugin-csv-export';
import { SqliteDriver } from '@mikro-orm/sqlite';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { Migrator } from '@mikro-orm/migrations';
import { UserResource } from './resources/UserResource';
import { CardGroupResource } from './resources/CardGroupResource';
import { CardResource } from './resources/CardResource';
import { WithdrawalCycleResource } from './resources/WithdrawalCycleResource';
import { ShiftResource } from './resources/ShiftResource';
import { WrongfulDebitResource } from './resources/WrongfulDebitResource';
import { ClientPaymentResource } from './resources/ClientPaymentResource';
import { TreasuryDepositResource } from './resources/TreasuryDepositResource';
import { SettingResource } from './resources/SettingResource';
import { ExchangeRateResource } from './resources/ExchangeRateResource';
import { DashboardPage } from './pages/DashboardPage';
import { ParametresPage } from './pages/ParametresPage';
import { User } from './entities/User';
import { seedAdminUser } from './seedAdminUser';
import { seedSettings } from './seedSettings';
import { seedExchangeRates } from './seedExchangeRates';
import { sessionTimeoutMiddleware } from './middleware/sessionTimeout';
import { frenchCsvExporter } from './utils/frenchCsvExporter';
import { isAdminLike, isTeamLead, isSuperAdmin } from './utils/roles';
import { getPublicUrl } from './utils/publicUrl';
import { registerPasswordSetupRoutes } from './routes/passwordSetup';
import { registerClientPaymentReceiptRoute } from './routes/clientPaymentReceipt';
import { coreFr } from './i18n/coreFr';
import { csvExportFr } from './i18n/csvExportFr';
import { appFr } from './i18n/appFr';
import { appEn } from './i18n/appEn';

// Nav items scoped narrower than "everyone" — hidden via the metadata filter
// hook registered below. "shifts" and "wrongful-debits" are deliberately NOT
// here: agents need those, just scoped to their own records (see the
// matching hooks) — chef_equipe/superviseur/admin see the whole Dubai
// team's. "client-payments" IS here for a plain agent though — they can't
// create or ever see anyone's payments (only admin/superviseur initiate one,
// chef_equipe validates/refuses it — see clientPaymentHooks), so the nav
// entry would just be a dead end for them. "withdrawal-cycles" isn't hidden
// for anyone — everyone needs to browse cycles (read-only at minimum) to
// find the one their shift belongs to; creation is blocked below via the
// capabilities filter hook, not by hiding it. "settings" is `hidden` on the
// resource itself (embedded in ParametresPage instead of its own nav
// entry) — plain single-record config, no row actions involved, so the
// TableBlock gap below doesn't apply to it. "users" ("Collaborateurs") and
// "exchange-rates" ("Taux de Change") both learned that gap the hard way and
// aren't embedded — a table embedded via TableBlock in a Page never gets
// KratosJS's row-action `hasHandler` enrichment (only a resource's own
// schema route does), which silently broke Users' password-setup-link
// action and Exchange Rates' "Modifier" (navigated to a bogus
// /admin/list/:id/edit URL, a no-op). Both are real nav entries instead,
// grouped next to Paramètres — Users admin-exclusive (stricter than
// ADMIN_LIKE_ONLY below — see assertAdmin in userHooks.ts) via
// ADMIN_ONLY_RESOURCE_SLUGS, Exchange Rates admin-like via
// ADMIN_LIKE_ONLY_RESOURCE_SLUGS below. "parametres" isn't admin-only
// either — every role needs it for self-service 2FA (see ParametresPage,
// which gates its Settings block internally instead of hiding the whole page).
const ADMIN_LIKE_ONLY_RESOURCE_SLUGS = ['card-groups', 'cards', 'exchange-rates'];
const ADMIN_ONLY_RESOURCE_SLUGS = ['users'];
// "treasury-deposits" is hidden from a plain agent (a manual treasury
// top-up is a back-office concern, not something a field agent touches),
// but still visible read-only to superviseur/chef_equipe alongside the rest
// of the team-wide treasury data — only *creating*/editing one is
// SuperAdmin-only (see the capabilities filter hook below).
const AGENT_HIDDEN_RESOURCE_SLUGS = ['client-payments', 'treasury-deposits'];
const ADMIN_ONLY_PAGE_SLUGS: string[] = [];
// Dealing with the bank (requesting/confirming a refund) is an admin/
// superviseur task — chef_equipe and agents can report a wrongful debit,
// but not resolve it.
const ADMIN_LIKE_ONLY_ACTIONS = ['requestRefund', 'markRefunded', 'markRefused'];
// Validating/refusing a client payment (and downloading its receipt) is
// AdminEAU's (chef_equipe) job, same tier as admin-like — creating one is
// admin-like only (see the capabilities filter hook below). Cancelling is
// narrower still: any admin-like role while a payment is still pending, but
// only SuperAdmin exactly once it's validated — that finer per-record
// distinction can't be expressed by this coarse action-name gate (there's
// no per-row action visibility in this framework), so it's enforced inside
// clientPaymentActions.ts's cancelPayment handler instead; this gate just
// covers "could this role ever be allowed to cancel something."
const CLIENT_PAYMENT_TEAM_ACTIONS = ['validatePayment', 'refusePayment', 'downloadReceipt'];
const CLIENT_PAYMENT_ADMIN_LIKE_ACTIONS = ['cancelPayment'];

const PORT = parseInt(process.env.PORT || '3000');
// Fail fast rather than silently signing every session with a secret that's
// public in this repo's own .env.example — that's a full admin-auth bypass,
// not just a weak-crypto footgun. Dev/test keep the convenience fallback
// (no setup required to `npm run dev`); only a real deploy is refused.
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
	throw new Error(
		'JWT_SECRET is not set. Refusing to start in production with the ' +
			"insecure default from .env.example — anyone who's read this repo " +
			'could forge a valid admin session. Generate one with ' +
			'`openssl rand -base64 32` and set it on Render (Environment tab), ' +
			'then redeploy.',
	);
}
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
// UPLOADS_PATH lets production point this at a mounted persistent disk
// (e.g. Render Disks) instead of the app's ephemeral local folder.
const uploadsPath = process.env.UPLOADS_PATH || path.join(process.cwd(), 'uploads');
const assetsPath = path.join(process.cwd(), 'assets');
const publicUrl = getPublicUrl();

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
	.resources([
		UserResource,
		CardGroupResource,
		CardResource,
		WithdrawalCycleResource,
		ShiftResource,
		WrongfulDebitResource,
		ClientPaymentResource,
		TreasuryDepositResource,
		SettingResource,
		ExchangeRateResource,
	])
	.pages([DashboardPage, ParametresPage])
	.plugins([new TwoFactorPlugin({ issuer: 'RECIBIR' }), new CsvExportPlugin()]);

// --- Role-based layout ---------------------------------------------------
// RECIBIR has four roles (see the User entity's `role` column): admin,
// superviseur (Conakry, admin-equivalent except user management),
// chef_equipe (Dubaï team lead, team-wide visibility + client payments),
// and agent (Dubaï, scoped to their own records). Rather than pulling in
// the full permissions plugin (built for many roles + configurable
// permission sets), the split is wired directly with the panel's low-level
// filter/access hooks, using the isAdminLike/isTeamLead helpers so the same
// role logic doesn't drift between here and the resource hooks.

// registerMetadataFilterHook is a single slot (last call wins, they don't
// stack) — every metadata tweak has to live in this one hook.
adminPanel.registerMetadataFilterHook((metadata, user) => {
	// Hide nav entries narrower than "everyone" (e.g. "Groupes de Cartes"/
	// "Cartes" are admin+superviseur; "Paiements Clients" is hidden from a
	// plain agent, who can't create or see any). Still enforced server-side
	// by each resource's own hooks — this only controls the sidebar.
	if (!isAdminLike(user?.role)) {
		metadata.resources = metadata.resources.map(r =>
			ADMIN_LIKE_ONLY_RESOURCE_SLUGS.includes(r.slug) ? { ...r, hidden: true } : r,
		);
		metadata.pages = metadata.pages.map(p =>
			ADMIN_ONLY_PAGE_SLUGS.includes(p.slug) ? { ...p, hidden: true } : p,
		);
	}
	if (user?.role === 'agent') {
		metadata.resources = metadata.resources.map(r =>
			AGENT_HIDDEN_RESOURCE_SLUGS.includes(r.slug) ? { ...r, hidden: true } : r,
		);
	}
	if (user?.role !== 'admin') {
		metadata.resources = metadata.resources.map(r =>
			ADMIN_ONLY_RESOURCE_SLUGS.includes(r.slug) ? { ...r, hidden: true } : r,
		);
	}
	// The 2FA plugin registers its own standalone nav page ("Security" group)
	// by default — its TwoFactorSetupBlock is embedded directly in
	// ParametresPage instead (available to every role there), so hide the
	// plugin's page from the sidebar entirely. `hidden`, not `excluded`: the
	// route stays registered, it's just unreachable via nav.
	metadata.pages = metadata.pages.map(p => (p.slug === '2fa' ? { ...p, hidden: true } : p));
	return metadata;
});

// Server-side guard matching the sidebar restriction above — blocks a
// non-admin-like user from loading an admin-only page directly by URL, not
// just hiding the nav entry.
adminPanel.registerPageAccessCheckHook((pageSlug, user) => {
	if (ADMIN_ONLY_PAGE_SLUGS.includes(pageSlug)) {
		return isAdminLike(user?.role);
	}
	return true;
});

// Cycle creation/editing is admin+superviseur only — everyone else still
// needs to browse Cycles de Retrait (read-only) to find their shift's
// context. Client-payment creation (initiating a payment) is admin+
// superviseur only now — chef_equipe's role moved to validating/refusing
// what AdminGN initiates, not creating payments themselves. Hides the
// relevant buttons; withdrawalCycleHooks/clientPaymentHooks reject the
// request server-side either way.
adminPanel.registerCapabilitiesFilterHook((capabilities, resourceSlug, user) => {
	if (resourceSlug === 'withdrawal-cycles' && !isAdminLike(user?.role)) {
		return { ...capabilities, canCreate: false, canEdit: false };
	}
	if (resourceSlug === 'client-payments' && !isAdminLike(user?.role)) {
		return { ...capabilities, canCreate: false };
	}
	// Recording a manual treasury deposit (e.g. a bank transfer) is kept to
	// the single literal SuperAdmin — narrower than every other admin-like
	// gate in this file, which also allows superviseur (AdminGN).
	if (resourceSlug === 'treasury-deposits' && !isSuperAdmin(user?.role)) {
		return { ...capabilities, canCreate: false, canEdit: false };
	}
	return capabilities;
});

// Strip the refund-lifecycle actions from the Débits à Tort table for
// chef_equipe/agents — they can report a wrongful debit, but resolving it
// with the bank is an admin/superviseur job. Same idea for client payments:
// validate/refuse/download-receipt need admin-like-or-team-lead, cancel
// needs admin-like (cancelPayment's finer validated-only-SuperAdmin rule is
// enforced inside the handler — see the constant's own comment above).
adminPanel.registerTableSchemaFilterHook((schema, resourceSlug, user) => {
	if (resourceSlug === 'wrongful-debits' && !isAdminLike(user?.role) && schema.actions) {
		schema.actions = schema.actions.filter((a: { name: string }) => !ADMIN_LIKE_ONLY_ACTIONS.includes(a.name));
	}
	if (resourceSlug === 'client-payments' && schema.actions) {
		schema.actions = schema.actions.filter((a: { name: string }) => {
			if (CLIENT_PAYMENT_TEAM_ACTIONS.includes(a.name)) return isAdminLike(user?.role) || isTeamLead(user?.role);
			if (CLIENT_PAYMENT_ADMIN_LIKE_ACTIONS.includes(a.name)) return isAdminLike(user?.role);
			return true;
		});
	}
	return schema;
});

// Server-side guard matching the UI restriction above (never trust the client).
adminPanel.registerActionAccessCheckHook((actionName, resourceSlug, user) => {
	if (resourceSlug === 'wrongful-debits' && ADMIN_LIKE_ONLY_ACTIONS.includes(actionName)) {
		return isAdminLike(user?.role);
	}
	if (resourceSlug === 'client-payments') {
		if (CLIENT_PAYMENT_TEAM_ACTIONS.includes(actionName)) return isAdminLike(user?.role) || isTeamLead(user?.role);
		if (CLIENT_PAYMENT_ADMIN_LIKE_ACTIONS.includes(actionName)) return isAdminLike(user?.role);
	}
	return true;
});

// French-only, no language switcher. `.i18n({ locales: ['en'] })` pins the
// app to a single locale explicitly — without it, locale discovery kicks in
// (see Panel.buildServerI18n) and picks up every locale any *plugin*
// happens to ship a catalog for (e.g. csv-export ships an 'sq' one), which
// silently made the LocaleSwitcher appear once more than one locale was
// discovered. Both 'fr' and 'en' declared (not 'fr' alone) is what makes
// fallback work correctly: i18next's `supportedLngs` must include the
// fallback locale or it gets filtered out of the resolution chain, which
// is exactly the bug the single-locale setup above worked around by
// translating everything under the 'en' key instead. Now that 'en' is a
// real second locale, the framework's own built-in English catalogs for
// 'core'/'csv-export' (and kratosjs-plugin-2fa's own 'en' catalog) serve
// English users automatically — only our own 'app' namespace needs both
// languages hand-authored (see src/i18n/appFr.ts / appEn.ts).
adminPanel.i18n({ locales: ['fr', 'en'], defaultLocale: 'fr', fallbackLocale: 'en' });
adminPanel.registerTranslations('core', { fr: coreFr });
adminPanel.registerTranslations('csv-export', { fr: csvExportFr });
adminPanel.registerTranslations('2fa', {
	fr: {
		'error.auth_required': 'Authentification requise',
		'error.code_required': 'Un code de vérification est requis',
		'error.run_setup': "Lancez la configuration avant d'activer la 2FA",
		'error.invalid_code': 'Code de vérification invalide',
		'challenge.code_label': "Code d'authentification",
		'challenge.hint': 'Entrez le code à 6 chiffres de votre application d’authentification.',
		'challenge.verify': 'Vérifier',
		'challenge.back': 'Retour à la connexion',
		'setup.request_failed': 'Échec de la requête',
		'setup.status_failed': "Échec du chargement du statut de l'authentification à deux facteurs",
		'setup.enabled_toast': 'Authentification à deux facteurs activée',
		'setup.disabled_toast': 'Authentification à deux facteurs désactivée',
		'setup.heading': 'Authentification à deux facteurs',
		'setup.subtitle': 'Ajoute un code à usage unique généré par une application d’authentification à ta connexion.',
		'setup.active': 'L’authentification à deux facteurs est active sur ton compte.',
		'setup.disable_label': 'Entre un code actuel pour désactiver',
		'setup.disable_button': 'Désactiver la 2FA',
		'setup.step_scan': 'Scanne le QR code avec Google Authenticator (ou une autre application TOTP).',
		'setup.step_enter': 'Entre le code à 6 chiffres affiché pour confirmer.',
		'setup.qr_alt': 'QR code 2FA',
		'setup.manual_key': 'Ou entre cette clé manuellement :',
		'setup.verify_label': 'Code de vérification',
		'setup.enable_button': 'Activer la 2FA',
		'setup.cancel': 'Annuler',
		'setup.not_set_up':
			"L'authentification à deux facteurs n'est pas configurée. Une fois activée, un code de ton application d'authentification te sera demandé à chaque connexion.",
		'setup.start_button': "Configurer l'authentification à deux facteurs",
	},
	// kratosjs-plugin-2fa ships its own complete English catalog for this
	// namespace — no need to hand-author one.
});
adminPanel.registerTranslations('app', { fr: appFr, en: appEn });

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
	// `role` drives the Admin/Agent split (sidebar visibility, shift
	// assignment, treasury scoping) — see the filter hooks registered below.
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

// First-login / SuperAdmin-forced password reset — see src/routes/passwordSetup.ts.
registerPasswordSetupRoutes(adminPanel);
// PDF receipt download — see src/routes/clientPaymentReceipt.ts.
registerClientPaymentReceiptRoute(adminPanel);

adminPanel
	.start(PORT, async () => {
		// Overrides the csv-export plugin's default comma-delimited exporter
		// (same 'csv' key, last registerExporter() call wins). Must run here,
		// after plugin registration (which happens inside .start(), before
		// this callback fires) — registering it earlier would just get
		// clobbered by the plugin's own registerExporter('csv', ...) call.
		adminPanel.registerExporter('csv', frenchCsvExporter);
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
