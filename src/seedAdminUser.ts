import { hashPassword, type Panel } from '@maxal_studio/kratosjs';
import { User } from './entities/User';

const DEFAULT_ADMIN_EMAIL = 'admin@example.com';
const DEFAULT_ADMIN_PASSWORD = 'password';
const DEFAULT_AGENT_EMAIL = 'agent@example.com';
const DEFAULT_AGENT_PASSWORD = 'password';

/**
 * Bootstrap the very first login on a brand-new database (local dev, or a
 * fresh production deploy with no way to create a user yet otherwise).
 *
 * Gated on the table being completely empty — not on these specific emails —
 * so that once any real account exists, deleting/renaming the demo admin
 * never causes it to silently reappear on the next boot. If every user is
 * ever deleted, reseeding is the correct recovery path (there'd be no other
 * way back in), not a vulnerability.
 */
export async function seedAdminUser(panel: Panel): Promise<void> {
	const em = panel.getOrm().em.fork();

	if ((await em.count(User, {})) > 0) return;

	const admin = em.create(User, {
		firstname: 'Admin',
		email: DEFAULT_ADMIN_EMAIL,
		password: await hashPassword(DEFAULT_ADMIN_PASSWORD),
		role: 'admin',
		active: true,
		createdAt: new Date(),
	});
	em.persist(admin);

	const agent = em.create(User, {
		firstname: 'Agent',
		lastname: 'Terrain',
		email: DEFAULT_AGENT_EMAIL,
		password: await hashPassword(DEFAULT_AGENT_PASSWORD),
		role: 'agent',
		active: true,
		createdAt: new Date(),
	});
	em.persist(agent);

	await em.flush();

	const warn = process.env.NODE_ENV === 'production' ? '⚠️  CHANGE THIS PASSWORD NOW — ' : '';
	console.log(`👤 Seeded admin user (${warn}${DEFAULT_ADMIN_EMAIL} / ${DEFAULT_ADMIN_PASSWORD})`);
	console.log(`👤 Seeded agent user (${warn}${DEFAULT_AGENT_EMAIL} / ${DEFAULT_AGENT_PASSWORD})`);
}
