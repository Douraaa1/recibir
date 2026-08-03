import { EntitySchema } from '@mikro-orm/core';
import { User } from './User';

export interface IClientPayment {
	id: number;
	agent: any;
	clientName: string;
	clientPhone: string;
	amountAED: number;
	note?: string;
	createdAt: Date;
}

/**
 * A payout to a client in Dubai, funded from the shared AED treasury (the
 * pool built up from Shift.expectedAED - Shift.wrongfulDebitAED across all
 * shifts). Recorded by the agent who paid the client; deducted live from the
 * treasury total via a widget query — not a stored running balance.
 */
export const ClientPayment = new EntitySchema<IClientPayment>({
	name: 'ClientPayment',
	properties: {
		id: { type: 'number', primary: true, autoincrement: true },
		agent: { kind: 'm:1', entity: () => User },
		clientName: { type: 'string' },
		clientPhone: { type: 'string' },
		amountAED: { type: 'float' },
		note: { type: 'text', nullable: true },
		createdAt: { type: 'Date', onCreate: () => new Date() },
	} as any,
});
