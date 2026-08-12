import type { Panel } from '@maxal_studio/kratosjs';
import { ExchangeRate, type CurrencyCode } from './entities/ExchangeRate';

// Illustrative starting point for USD/GNF only — the admin is expected to
// correct it to the real market rate from the Taux de Change screen (GNF/USD
// moves often). AED's default is derived from it (AED/USD is pegged at
// 3.67, essentially fixed — see exchangeRateHooks.ts), matching what
// editing USD later will keep re-deriving, so the very first boot is
// already internally consistent.
const USD_DEFAULT_RATE_TO_GNF = 8600;
const AED_PER_USD = 3.67;

const DEFAULTS: { code: CurrencyCode; label: string; rateToGNF: number }[] = [
	{ code: 'GNF', label: 'Franc Guinéen', rateToGNF: 1 },
	{ code: 'USD', label: 'Dollar Américain', rateToGNF: USD_DEFAULT_RATE_TO_GNF },
	{ code: 'AED', label: 'Dirham des Émirats Arabes Unis', rateToGNF: USD_DEFAULT_RATE_TO_GNF / AED_PER_USD },
];

/** Ensure the 3 starting currencies exist so the Taux de Change table isn't empty on first boot. */
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
