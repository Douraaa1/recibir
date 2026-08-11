import { EntitySchema } from '@mikro-orm/core';
import { User } from './User';

export type TreasuryDepositChannel = 'bank_transfer' | 'other';

export interface ITreasuryDeposit {
	id: number;
	amountAED: number;
	channel: TreasuryDepositChannel;
	reference?: string | null;
	note?: string | null;
	date: Date;
	createdBy: any;
	createdAt: Date;
}

/**
 * A manual injection into the shared AED treasury from outside the normal
 * shift-withdrawal flow — e.g. a direct bank transfer when very large sums
 * are involved. Adds straight onto ShiftResource's treasury totals (see
 * shifts.treasuryTotal / shifts.treasuryByAgent) alongside withdrawn amounts
 * and refunded wrongful debits — not tied to any agent or shift.
 * SuperAdmin-only, enforced in treasuryDepositHooks.
 */
export const TreasuryDeposit = new EntitySchema<ITreasuryDeposit>({
	name: 'TreasuryDeposit',
	properties: {
		id: { type: 'number', primary: true, autoincrement: true },
		amountAED: { type: 'float' },
		channel: { type: 'string', default: 'bank_transfer' },
		reference: { type: 'string', nullable: true },
		note: { type: 'text', nullable: true },
		date: { type: 'Date' },
		createdBy: { kind: 'm:1', entity: () => User },
		createdAt: { type: 'Date', onCreate: () => new Date() },
	} as any,
});
