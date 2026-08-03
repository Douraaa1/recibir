import { EntitySchema } from '@mikro-orm/core';
import { WithdrawalCycle } from './WithdrawalCycle';
import { User } from './User';

export type ShiftNumber = 1 | 2;

export interface IShift {
	id: number;
	cycle: any;
	agent: any;
	shiftNumber: ShiftNumber;
	date: Date;
	withdrawnAED: number;
	createdAt: Date;
}

/**
 * One work day (shift 1 or 2) an agent executes against a WithdrawalCycle.
 * Auto-created in pairs by withdrawalCycleHooks.ts when the admin creates
 * the cycle — never created standalone (see ShiftResource.canCreate).
 *
 * `withdrawnAED` is what the agent actually got out of the ATM (entered by
 * them); wrongful debits are tracked separately per card on WrongfulDebit
 * and subtracted from this to get the shift's treasury contribution.
 */
export const Shift = new EntitySchema<IShift>({
	name: 'Shift',
	properties: {
		id: { type: 'number', primary: true, autoincrement: true },
		cycle: { kind: 'm:1', entity: () => WithdrawalCycle },
		agent: { kind: 'm:1', entity: () => User },
		shiftNumber: { type: 'number' },
		date: { type: 'Date' },
		withdrawnAED: { type: 'float', default: 0 },
		createdAt: { type: 'Date', onCreate: () => new Date() },
	} as any,
});
