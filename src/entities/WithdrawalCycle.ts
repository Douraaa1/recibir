import { EntitySchema } from '@mikro-orm/core';
import { CardGroup } from './CardGroup';

export interface IWithdrawalCycle {
	id: number;
	group: any;
	sentGNF: number;
	expectedAED: number;
	date: Date;
	createdAt: Date;
}

/**
 * The "X" — one full recharge of a CardGroup, tracked as a single Envoyé
 * (GNF) / Attendu (AED) pair. Attendu is entered directly by the admin (a
 * round AED number) — not auto-converted from Envoyé via the exchange rate.
 * Creating one auto-creates its two child Shifts (shift 1 and shift 2 — see
 * withdrawalCycleHooks.ts) since fully draining a fully-recharged group
 * always takes exactly two shifts.
 */
export const WithdrawalCycle = new EntitySchema<IWithdrawalCycle>({
	name: 'WithdrawalCycle',
	properties: {
		id: { type: 'number', primary: true, autoincrement: true },
		group: { kind: 'm:1', entity: () => CardGroup },
		sentGNF: { type: 'float' },
		expectedAED: { type: 'float', default: 0 },
		date: { type: 'Date' },
		createdAt: { type: 'Date', onCreate: () => new Date() },
	} as any,
});
