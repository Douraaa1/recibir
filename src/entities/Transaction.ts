import { EntitySchema } from '@mikro-orm/core';
import { User } from './User';

export type WithdrawalMethod = 'orange_money' | 'wave' | 'cash';
export type TransactionStatus = 'pending' | 'completed' | 'blocked' | 'cancelled';

export interface ITransaction {
	id: number;
	reference: string;
	senderName: string;
	senderPhone: string;
	beneficiaryName: string;
	beneficiaryPhone: string;
	amount: number;
	feeRate: number;
	fee: number;
	withdrawalMethod: WithdrawalMethod;
	status: TransactionStatus;
	internalNote?: string;
	cancelReason?: string;
	agent: any;
	validatedBy?: any;
	createdAt: Date;
	validatedAt?: Date | null;
}

/**
 * A money transfer initiated by an agent (or the admin) and later validated
 * (or cancelled) by the admin. `fee`/`reference` are computed in
 * beforeCreate — see src/hooks/transactionHooks.ts.
 */
export const Transaction = new EntitySchema<ITransaction>({
	name: 'Transaction',
	properties: {
		id: { type: 'number', primary: true, autoincrement: true },
		reference: { type: 'string', unique: true },
		senderName: { type: 'string' },
		senderPhone: { type: 'string' },
		beneficiaryName: { type: 'string' },
		beneficiaryPhone: { type: 'string' },
		amount: { type: 'float' },
		feeRate: { type: 'float', default: 0.01 },
		fee: { type: 'float', default: 0 },
		withdrawalMethod: { type: 'string' },
		status: { type: 'string', default: 'pending' },
		internalNote: { type: 'text', nullable: true },
		cancelReason: { type: 'text', nullable: true },
		agent: { kind: 'm:1', entity: () => User },
		validatedBy: { kind: 'm:1', entity: () => User, nullable: true },
		createdAt: { type: 'Date', onCreate: () => new Date() },
		validatedAt: { type: 'Date', nullable: true },
	} as any,
});