import type { Panel } from '@maxal_studio/kratosjs';
import { ExchangeRate, type CurrencyCode } from './entities/ExchangeRate';

// Illustrative starting points only — the admin is expected to correct these
// to the real market rate from the Taux de Change screen before going live.
const DEFAULTS: { code: CurrencyCode; label: string; rateToGNF: number }[] = [
	{ code: 'GNF', label: 'Franc Guinéen', rateToGNF: 1 },
	{ code: 'USD', label: 'Dollar Américain', rateToGNF: 8600 },
	{ code: 'EUR', label: 'Euro', rateToGNF: 9300 },
	{ code: 'XOF', label: 'Franc CFA (BCEAO)', rateToGNF: 14.2 },
	{ code: 'CAD', label: 'Dollar Canadien', rateToGNF: 6300 },
];

/** Ensure the 5 starting currencies exist so the Taux de Change table isn't empty on first boot. */
export async function seedExchangeRates(panel: Panel): Promise<void> {
	const em = panel.getOrm().em.fork();

	for (const currency of DEFAULTS) {
		const existing = await em.findOne(ExchangeRate, { code: currency.code });
		if (existing) continue;
		const rate = em.create(ExchangeRate, { ...currency, active: true, updatedAt: new Date() });
		em.persist(rate);
	}
	await em.flush();
}
