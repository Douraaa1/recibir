import type { Panel } from '@maxal_studio/kratosjs';
import { Setting } from './entities/Setting';

/**
 * Ensure the single settings row (id 1) exists so the session-timeout
 * middleware always finds a row to read.
 */
export async function seedSettings(panel: Panel): Promise<void> {
	const em = panel.getOrm().em.fork();
	const existing = await em.findOne(Setting, { id: 1 });
	if (existing) return;

	const setting = em.create(Setting, {
		sessionTimeoutMinutes: 30,
		updatedAt: new Date(),
	});
	em.persist(setting);
	await em.flush();
	console.log('⚙️  Seeded default settings (session timeout 30min)');
}
