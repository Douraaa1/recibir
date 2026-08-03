import { EntitySchema } from '@mikro-orm/core';

export type CurrencyCode = 'GNF' | 'USD' | 'EUR' | 'XOF' | 'CAD' | 'AED';

export interface IExchangeRate {
	id: number;
	code: CurrencyCode;
	label: string;
	rateToGNF: number;
	active: boolean;
	updatedAt: Date;
}

/**
 * One row per supported currency. `rateToGNF` is "how many GNF for 1 unit of
 * this currency" (GNF itself is the pivot, always 1 — see the `code === 'GNF'`
 * guard in ExchangeRateResource, which locks that row's rate).
 */
export const ExchangeRate = new EntitySchema<IExchangeRate>({
	name: 'ExchangeRate',
	properties: {
		id: { type: 'number', primary: true, autoincrement: true },
		code: { type: 'string', unique: true },
		label: { type: 'string' },
		rateToGNF: { type: 'float', default: 1 },
		active: { type: 'boolean', default: true },
		updatedAt: { type: 'Date', onCreate: () => new Date(), onUpdate: () => new Date() },
	} as any,
});
