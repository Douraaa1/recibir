import { EntitySchema } from '@mikro-orm/core';

export interface ISetting {
	id: number;
	feeRate: number;
	minFee: number;
	maxFee: number;
	sessionTimeoutMinutes: number;
	updatedAt: Date;
}

/**
 * Single-row configuration table (id 1, seeded by seedSettings.ts). Read by
 * transactionHooks (fee calc) and the session-timeout middleware — both fork
 * their own EntityManager and look up id 1 directly rather than going
 * through the resource layer.
 */
export const Setting = new EntitySchema<ISetting>({
	name: 'Setting',
	properties: {
		id: { type: 'number', primary: true, autoincrement: true },
		feeRate: { type: 'float', default: 0.01 },
		minFee: { type: 'float', default: 1000 },
		maxFee: { type: 'float', default: 50000 },
		sessionTimeoutMinutes: { type: 'number', default: 30 },
		updatedAt: { type: 'Date', onCreate: () => new Date(), onUpdate: () => new Date() },
	} as any,
});
