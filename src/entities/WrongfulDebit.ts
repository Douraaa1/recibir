import { EntitySchema } from '@mikro-orm/core';
import { Shift } from './Shift';
import { Card } from './Card';
import { User } from './User';

export type WrongfulDebitStatus = 'reported' | 'refund_requested' | 'refunded' | 'refused';

export interface IWrongfulDebit {
	id: number;
	shift: any;
	card: any;
	agent: any;
	amountAED: number;
	note?: string;
	date: Date;
	status: WrongfulDebitStatus;
	refundRequestedAt?: Date | null;
	refundedAt?: Date | null;
	refusedAt?: Date | null;
	createdAt: Date;
}

/**
 * A card debited by the ATM without dispensing the requested cash, logged
 * during a shift, tracked through to bank reimbursement:
 * reported -> refund_requested -> refunded | refused (see wrongfulDebitActions.ts).
 *
 * `agent` is denormalized from `shift.agent` at creation time purely so the
 * ownership-scoping hooks can filter on it directly, matching every other
 * resource's pattern (no nested-relation filtering).
 */
export const WrongfulDebit = new EntitySchema<IWrongfulDebit>({
	name: 'WrongfulDebit',
	properties: {
		id: { type: 'number', primary: true, autoincrement: true },
		shift: { kind: 'm:1', entity: () => Shift },
		card: { kind: 'm:1', entity: () => Card },
		agent: { kind: 'm:1', entity: () => User },
		amountAED: { type: 'float' },
		note: { type: 'text', nullable: true },
		date: { type: 'Date' },
		status: { type: 'string', default: 'reported' },
		refundRequestedAt: { type: 'Date', nullable: true },
		refundedAt: { type: 'Date', nullable: true },
		refusedAt: { type: 'Date', nullable: true },
		createdAt: { type: 'Date', onCreate: () => new Date() },
	} as any,
});
